import type { Response } from 'express';

export type ChatSseEvent =
  | { type: 'text'; text: string }
  | { type: 'thinking-start'; id?: string }
  | { type: 'thinking-delta'; id?: string; text: string }
  | { type: 'thinking-end'; id?: string }
  | { type: 'status'; id: string; label: string; state: 'running' | 'completed' | 'cancelled' }
  | { type: 'tool-call'; toolName: string; toolCallId: string; args?: unknown }
  | { type: 'tool-result'; toolName: string; toolCallId: string; result?: unknown }
  | { type: 'error'; error: string };

type SseWriter = {
  close: () => void;
  done: () => void;
  write: (event: ChatSseEvent) => void;
};

type StreamChunkOptions = {
  includeThinking?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string') return value;
  }

  return '';
};

const nestedRecord = (value: unknown, key: string) => {
  if (!isRecord(value)) return undefined;
  return isRecord(value[key]) ? value[key] : undefined;
};

const nestedValue = (value: unknown, ...path: string[]) => {
  let current = value;

  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }

  return current;
};

const fallbackToolCallId = (chunk: Record<string, unknown>) =>
  firstString(
    chunk.toolCallId,
    chunk.id,
    nestedValue(chunk, 'payload', 'toolCallId'),
    nestedValue(chunk, 'payload', 'id'),
  ) || `tool-${Date.now()}`;

const getToolArgs = (chunk: Record<string, unknown>, payload?: Record<string, unknown>) =>
  chunk.args ?? chunk.input ?? chunk.toolInput ?? payload?.args ?? payload?.input ?? payload?.toolInput;

export const createSseWriter = (res: Response): SseWriter => {
  let closed = false;
  const flushableResponse = res as Response & { flush?: () => void };

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.socket?.setNoDelay(true);
  res.flushHeaders?.();
  res.write(': connected\n\n');
  flushableResponse.flush?.();

  res.on('close', () => {
    closed = true;
  });

  const writeData = (data: string) => {
    if (closed || res.writableEnded) return;
    res.write(`data: ${data}\n\n`);
    flushableResponse.flush?.();
  };

  return {
    close: () => {
      closed = true;
    },
    done: () => {
      writeData('[DONE]');
      if (!res.writableEnded) res.end();
    },
    write: (event) => {
      writeData(JSON.stringify(event));
    },
  };
};

export const streamChunkToSseEvent = (
  chunk: unknown,
  options: StreamChunkOptions = {},
): ChatSseEvent | null => {
  if (!isRecord(chunk)) return null;

  const payload = nestedRecord(chunk, 'payload');
  const chunkType = firstString(chunk.type, payload?.type);
  const includeThinking = options.includeThinking ?? true;

  if (chunkType === 'text-delta' || chunkType === 'textDelta' || chunkType === 'text') {
    const text = firstString(chunk.text, payload?.text, chunk.textDelta, payload?.textDelta);
    return text ? { type: 'text', text } : null;
  }

  if (chunkType === 'reasoning-start') {
    if (!includeThinking) return null;
    return { type: 'thinking-start', id: firstString(chunk.id, payload?.id) || 'reasoning' };
  }

  if (chunkType === 'reasoning-delta') {
    if (!includeThinking) return null;
    const text = firstString(chunk.text, payload?.text, chunk.delta, payload?.delta);
    return text
      ? { type: 'thinking-delta', id: firstString(chunk.id, payload?.id) || 'reasoning', text }
      : null;
  }

  if (chunkType === 'reasoning-end') {
    if (!includeThinking) return null;
    return { type: 'thinking-end', id: firstString(chunk.id, payload?.id) || 'reasoning' };
  }

  if (
    chunkType === 'tool-call' ||
    chunkType === 'toolCall' ||
    chunkType === 'tool-input-available'
  ) {
    return {
      type: 'tool-call',
      toolName: firstString(chunk.toolName, payload?.toolName) || 'unknown',
      toolCallId: fallbackToolCallId(chunk),
      args: getToolArgs(chunk, payload),
    };
  }

  if (chunkType === 'tool-result' || chunkType === 'toolResult') {
    return {
      type: 'tool-result',
      toolName: firstString(chunk.toolName, payload?.toolName) || 'unknown',
      toolCallId: fallbackToolCallId(chunk),
      result: chunk.result ?? payload?.result ?? payload,
    };
  }

  if (chunkType === 'tripwire') {
    const text = firstString(chunk.tripwireReason, payload?.tripwireReason);
    return { type: 'text', text: text || 'Request blocked by guardrails' };
  }

  if (chunkType === 'error') {
    const error = firstString(chunk.error, payload?.error, chunk.message, payload?.message);
    return { type: 'error', error: error || 'Stream error' };
  }

  return null;
};
