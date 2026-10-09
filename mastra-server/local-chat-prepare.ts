import type { Request, Response } from 'express';
import {
  getLastUserMessage,
  validateMessages,
} from './chat-request';
import { collectPortfolioContext } from './portfolio-context';
import { toLocalPortfolioContext } from './local-context-summary';
import {
  evaluatePortfolioGuardrail,
  guardrailUnavailableMessage,
  isThreadMessageLimitExceeded,
  portfolioGuardrailBlockMessage,
  threadLimitBlockMessage,
} from './portfolio-guardrail';
import { getRuntimeModelConfig } from './runtime-model-config';
import type { ChatSseEvent } from './sse';

export type LocalChatPrepareResponse =
  | { allowed: false; message: string; events: ChatSseEvent[] }
  | { allowed: true; portfolioContext: string; events: ChatSseEvent[] };

export const prepareLocalChatResponse = async (req: Request, res: Response) => {
  const messages = validateMessages(req, res);
  if (!messages) return;

  const lastUserMessage = getLastUserMessage(messages);
  if (!lastUserMessage) {
    res.status(400).json({ error: 'At least one user message is required' });
    return;
  }

  const events: ChatSseEvent[] = [];
  const emit = (event: ChatSseEvent) => {
    events.push(event);
  };

  try {
    const modelConfig = await getRuntimeModelConfig();
    const guardrailsMode = String(process.env.GUARDRAILS_MODE || 'fast').toLowerCase();

    if (guardrailsMode !== 'off') {
      if (isThreadMessageLimitExceeded(messages)) {
        res.json({
          allowed: false,
          message: threadLimitBlockMessage(),
          events,
        } satisfies LocalChatPrepareResponse);
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
        res.json({
          allowed: false,
          message: guardrailUnavailableMessage(),
          events,
        } satisfies LocalChatPrepareResponse);
        return;
      }

      if (!decision.allowed) {
        res.json({
          allowed: false,
          message: portfolioGuardrailBlockMessage(decision.reason),
          events,
        } satisfies LocalChatPrepareResponse);
        return;
      }
    }

    emit({
      type: 'status',
      id: 'portfolio-context',
      label: 'Preparing portfolio context',
      state: 'running',
    });
    const portfolioContext = toLocalPortfolioContext(
      await collectPortfolioContext(lastUserMessage.content, emit),
    );
    emit({
      type: 'status',
      id: 'portfolio-context',
      label: 'Preparing portfolio context',
      state: 'completed',
    });

    res.json({
      allowed: true,
      portfolioContext,
      events,
    } satisfies LocalChatPrepareResponse);
  } catch (error) {
    console.error('Local chat preparation failed:', error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
};
