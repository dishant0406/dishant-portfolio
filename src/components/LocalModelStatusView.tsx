'use client';

import { Progress } from '@/components/shadcn/progress';
import type { LocalModelState } from '@/types';
import type { WebLlmSupportResult } from '@/webllm/support';

type LocalModelStatusViewProps = {
  localModel: LocalModelState;
  statusText: string;
  support: WebLlmSupportResult | null;
};

export function LocalModelStatusView({
  localModel,
  statusText,
  support,
}: LocalModelStatusViewProps) {
  if (localModel.status === 'loading') {
    return (
      <div className="grid gap-1.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs text-muted-foreground">
          <span className="truncate" title={statusText || 'Loading local model'}>
            {statusText || 'Loading local model'}
          </span>
          <span className="tabular-nums">{localModel.progress}%</span>
        </div>
        <Progress value={localModel.progress} className="h-1 rounded-sm bg-border" />
      </div>
    );
  }

  if (localModel.status === 'failed') {
    return <p className="line-clamp-2 text-xs text-destructive">{statusText}</p>;
  }

  if (support && !support.supported) {
    return <p className="line-clamp-2 text-xs text-muted-foreground">{support.reason}</p>;
  }

  if (statusText) {
    return <p className="truncate text-xs text-muted-foreground">{statusText}</p>;
  }

  return <p className="text-xs text-muted-foreground">Runs in this browser with WebGPU.</p>;
}
