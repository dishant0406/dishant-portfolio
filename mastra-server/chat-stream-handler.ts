import type { Request, Response } from 'express';
import { createPortfolioAgent } from '../src/mastra/agents/portfolio-agent';
import {
  getLastUserMessage,
  getMemoryOptions,
  getModelContext,
  validateMessages,
} from './chat-request';
import { streamModelOutput } from './model-stream';
import {
  getStreamErrorMessage,
  shouldRetryWithFallbackModel,
} from './opencode-model-fallback';
import {
  getOpencodeProviderOptions,
  shouldForwardThinkingEvents,
} from './opencode-thinking';
import { collectPortfolioContext } from './portfolio-context';
import {
  evaluatePortfolioGuardrail,
  guardrailUnavailableMessage,
  isThreadMessageLimitExceeded,
  portfolioGuardrailBlockMessage,
  threadLimitBlockMessage,
} from './portfolio-guardrail';
import { getRuntimeModelConfig } from './runtime-model-config';
import { createSseWriter } from './sse';

type AgentStreamOptions = {
  memory: ReturnType<typeof getMemoryOptions>;
  context: ReturnType<typeof getModelContext>;
  maxSteps: number;
  providerOptions: ReturnType<typeof getOpencodeProviderOptions>;
  toolChoice: 'none';
};

type StreamAgent = {
  stream: (message: string, options: AgentStreamOptions) => Promise<{
    fullStream: AsyncIterable<unknown>;
  }>;
};

const completeComposeOnFirstOutput = (
  eventType: string,
  completeCompose: () => void,
) => {
  if (eventType !== 'text' && eventType !== 'thinking-start' && eventType !== 'thinking-delta') {
    return false;
  }

  completeCompose();
  return true;
};

export const streamAgentResponse = async (req: Request, res: Response) => {
  const messages = validateMessages(req, res);
  if (!messages) return;

  const lastUserMessage = getLastUserMessage(messages);
  if (!lastUserMessage) {
    res.status(400).json({ error: 'At least one user message is required' });
    return;
  }

  const writer = createSseWriter(res);
  const guardrailsMode = String(process.env.GUARDRAILS_MODE || 'fast').toLowerCase();

  try {
    const modelConfig = await getRuntimeModelConfig();
    const thinkingMode = modelConfig.thinkingMode;

    if (guardrailsMode !== 'off') {
      if (isThreadMessageLimitExceeded(messages)) {
        writer.write({ type: 'text', text: threadLimitBlockMessage() });
        writer.done();
        return;
      }

      let decision;
      try {
        decision = await evaluatePortfolioGuardrail(
          messages,
          modelConfig.guardrailModel,
          modelConfig.guardrailBaseURL,
          req.body.threadId,
        );
      } catch (error) {
        console.error('Portfolio guardrail unavailable:', error);
        writer.write({ type: 'text', text: guardrailUnavailableMessage() });
        writer.done();
        return;
      }

      if (!decision.allowed) {
        writer.write({ type: 'text', text: portfolioGuardrailBlockMessage(decision.reason) });
        writer.done();
        return;
      }
    }

    const agent = createPortfolioAgent(modelConfig.model, req.body.threadId);

    writer.write({
      type: 'status',
      id: 'portfolio-context',
      label: 'Preparing portfolio context',
      state: 'running',
    });
    const portfolioContext = await collectPortfolioContext(lastUserMessage.content, writer.write);
    writer.write({
      type: 'status',
      id: 'portfolio-context',
      label: 'Preparing portfolio context',
      state: 'completed',
    });
    writer.write({
      type: 'status',
      id: 'compose-response',
      label: 'Composing response',
      state: 'running',
    });

    let startedModelOutput = false;
    const completeCompose = () => {
      if (startedModelOutput) return;
      startedModelOutput = true;
      writer.write({
        type: 'status',
        id: 'compose-response',
        label: 'Composing response',
        state: 'completed',
      });
    };

    const streamFromAgent = async (streamAgent: StreamAgent) => {
      const streamOptions: AgentStreamOptions = {
        memory: getMemoryOptions(req.body.threadId, req.body.resourceId),
        context: getModelContext(messages, portfolioContext),
        maxSteps: 1,
        providerOptions: getOpencodeProviderOptions(thinkingMode),
        toolChoice: 'none',
      };

      await streamModelOutput({
        agent: streamAgent,
        prompt: lastUserMessage.content,
        includeThinking: shouldForwardThinkingEvents(thinkingMode),
        hasStartedOutput: () => startedModelOutput,
        onFirstOutput: (eventType) => completeComposeOnFirstOutput(eventType, completeCompose),
        write: writer.write,
        streamOptions,
      });
    };

    try {
      await streamFromAgent(agent);
    } catch (error) {
      const shouldRetry = shouldRetryWithFallbackModel({
        primaryModel: modelConfig.model,
        fallbackModel: modelConfig.fallbackModel,
        startedModelOutput,
      });

      if (!shouldRetry) throw error;

      console.warn('Primary model stream failed, retrying fallback model', {
        primaryModel: modelConfig.model,
        fallbackModel: modelConfig.fallbackModel,
        error: getStreamErrorMessage(error),
      });
      await streamFromAgent(createPortfolioAgent(modelConfig.fallbackModel, req.body.threadId));
    }

    completeCompose();
    writer.done();
  } catch (error) {
    console.error('Stream error:', error);
    writer.write({ type: 'error', error: 'Internal server error' });
    writer.done();
  } finally {
    writer.close();
  }
};
