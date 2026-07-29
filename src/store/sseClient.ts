type SseBoundary = { index: number; length: number } | null;

export const findSseBoundary = (buffer: string): SseBoundary => {
  const lfIndex = buffer.indexOf('\n\n');
  const crlfIndex = buffer.indexOf('\r\n\r\n');

  if (lfIndex === -1 && crlfIndex === -1) return null;
  if (lfIndex === -1) return { index: crlfIndex, length: 4 };
  if (crlfIndex === -1) return { index: lfIndex, length: 2 };

  return lfIndex < crlfIndex
    ? { index: lfIndex, length: 2 }
    : { index: crlfIndex, length: 4 };
};

export const extractSseData = (event: string) => {
  const dataLines = event
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart());

  return dataLines.length > 0 ? dataLines.join('\n').trim() : '';
};

export const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

export const yieldToBrowser = () => new Promise<void>((resolve) => {
  globalThis.setTimeout(resolve, 0);
});
