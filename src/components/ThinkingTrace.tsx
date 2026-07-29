'use client';

import { StreamStatus, ThinkingTrace as ThinkingTraceData } from '@/types';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ThinkingTraceProps {
  thinking?: ThinkingTraceData;
  statusEvents?: StreamStatus[];
  isStreaming?: boolean;
  hasResponse?: boolean;
}

const hasVisibleWork = (
  thinking?: ThinkingTraceData,
  statusEvents?: StreamStatus[],
) => Boolean(thinking?.content.trim() || statusEvents?.length);

function StatusRow({ status }: { status: StreamStatus }) {
  const isRunning = status.state === 'running';

  return (
    <div className="flex items-center gap-2 min-w-0 py-0.5">
      {isRunning ? (
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
      ) : (
        <Check className="w-3 h-3 text-success shrink-0" />
      )}
      <span className={isRunning ? 'text-foreground/80' : 'text-muted-foreground'}>
        {status.label}
      </span>
    </div>
  );
}

const getPanelLabel = (
  thinking?: ThinkingTraceData,
  hasResponse?: boolean,
) => {
  if (thinking?.content.trim()) return 'Thinking';
  if (hasResponse) return 'Responding';
  return 'Working';
};

const getVisibleStatuses = (statusEvents: StreamStatus[] = []) => {
  const runningStatuses = statusEvents.filter((status) => status.state === 'running');
  if (runningStatuses.length > 0) return runningStatuses;

  return statusEvents.slice(-3);
};

export function ThinkingTrace({
  thinking,
  statusEvents,
  isStreaming,
  hasResponse,
}: ThinkingTraceProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!hasVisibleWork(thinking, statusEvents)) return null;

  const visibleStatuses = getVisibleStatuses(statusEvents);
  const activeStatusCount = visibleStatuses.filter((status) => status.state === 'running').length;
  const isActive = Boolean(isStreaming || thinking?.isStreaming || activeStatusCount);
  const hasThinkingText = Boolean(thinking?.content.trim());
  if (!isStreaming && hasResponse && !hasThinkingText) return null;

  const isWaitingForModel = Boolean(
    isStreaming &&
    !hasThinkingText &&
    statusEvents?.some((status) => status.id === 'compose-response' && status.state === 'running'),
  );

  return (
    <div className="mb-3 rounded-md border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
      >
        {isActive ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5 text-success" />
        )}
        <span className="font-medium text-foreground">
          {getPanelLabel(thinking, hasResponse)}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>

      {isOpen && (
        <div className="px-3 pb-3">
          {hasThinkingText ? (
            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground max-h-36 overflow-y-auto">
              {thinking?.content}
            </pre>
          ) : (
            <div className="space-y-1 text-[12px]">
              {visibleStatuses.map((status) => (
                <StatusRow key={status.id} status={status} />
              ))}
              {isWaitingForModel && (
                <div className="flex items-center gap-2 py-0.5 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  <span>Waiting for model output</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
