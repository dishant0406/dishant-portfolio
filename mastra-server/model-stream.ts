import { streamChunkToSseEvent, type ChatSseEvent } from './sse';

type StreamCapableAgent<StreamOptions> = {
  stream: (message: string, options: StreamOptions) => Promise<{
    fullStream: AsyncIterable<unknown>;
  }>;
};

type ModelStreamOptions<StreamOptions> = {
  agent: StreamCapableAgent<StreamOptions>;
  prompt: string;
  streamOptions: StreamOptions;
  includeThinking: boolean;
  hasStartedOutput: () => boolean;
  onFirstOutput: (eventType: string) => void;
  write: (event: ChatSseEvent) => void;
};

export const streamModelOutput = async <StreamOptions>({
  agent,
  prompt,
  streamOptions,
  includeThinking,
  hasStartedOutput,
  onFirstOutput,
  write,
}: ModelStreamOptions<StreamOptions>) => {
  const stream = await agent.stream(prompt, streamOptions);

  for await (const chunk of stream.fullStream) {
    const event = streamChunkToSseEvent(chunk, { includeThinking });
    if (!event) continue;

    if (event.type === 'error' && !hasStartedOutput()) {
      throw new Error(event.error);
    }

    onFirstOutput(event.type);
    write(event);
  }
};
