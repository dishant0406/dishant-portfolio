'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import type { ChatProvider, LocalModelState } from '@/types';
import { WEBLLM_MODEL_OPTIONS } from '@/webllm/models';
import { getWebLlmSupport, type WebLlmSupportResult } from '@/webllm/support';
import { Cloud, Cpu } from 'lucide-react';
import { useEffect, useState } from 'react';

type ChatProviderSelectorProps = {
  provider: ChatProvider;
  modelId: string;
  localModel: LocalModelState;
  disabled?: boolean;
  onProviderChange: (provider: ChatProvider) => void;
  onModelChange: (modelId: string) => void;
};

export function ChatProviderSelector({
  provider,
  modelId,
  localModel,
  disabled = false,
  onProviderChange,
  onModelChange,
}: ChatProviderSelectorProps) {
  const [support, setSupport] = useState<WebLlmSupportResult | null>(null);

  useEffect(() => {
    if (provider !== 'webllm') return;

    let cancelled = false;
    getWebLlmSupport(modelId)
      .then((result) => {
        if (!cancelled) setSupport(result);
      })
      .catch((error) => {
        if (!cancelled) {
          setSupport({
            supported: false,
            reason: error instanceof Error ? error.message : 'WebGPU check failed.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [modelId, provider]);

  const buttonClassName = (active: boolean) => `
    h-8 px-2.5 inline-flex items-center gap-1.5 border text-xs
    transition-colors duration-150
    ${active
      ? 'bg-foreground text-background border-foreground'
      : 'bg-card/80 text-muted-foreground border-border hover:text-foreground hover:bg-card'}
  `;

  const isActiveLocalStatus = provider === 'webllm' && !['idle', 'ready'].includes(localModel.status);
  const statusText = localModel.status === 'failed'
    ? localModel.error || localModel.message
    : localModel.message;

  return (
    <div className="mx-auto mb-2 w-full max-w-full space-y-1.5 md:max-w-[50vw]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center overflow-hidden rounded-lg border border-border bg-card/70">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onProviderChange('hosted')}
            className={`${buttonClassName(provider === 'hosted')} border-y-0 border-l-0 rounded-none`}
          >
            <Cloud className="h-3.5 w-3.5" />
            Hosted
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onProviderChange('webllm')}
            className={`${buttonClassName(provider === 'webllm')} border-y-0 border-r-0 rounded-none`}
          >
            <Cpu className="h-3.5 w-3.5" />
            Local
          </button>
        </div>

        {provider === 'webllm' && (
          <div className="flex min-w-0 items-center gap-2">
            <Select
              value={modelId}
              disabled={disabled}
              onValueChange={onModelChange}
            >
              <SelectTrigger
                size="sm"
                className="
                  h-8 w-[min(44vw,19rem)] max-w-[44vw] rounded-lg border-border
                  bg-card/80 px-2 text-xs text-foreground shadow-none
                  focus-visible:ring-2 focus-visible:ring-ring/40
                "
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="w-[19rem] max-w-[calc(100vw-2rem)]">
                {WEBLLM_MODEL_OPTIONS.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    textValue={`${model.label} - ${Math.round(model.vramMb)} MB`}
                  >
                    <span className="truncate">
                      {model.label} - {Math.round(model.vramMb)} MB
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {support && !support.supported && !isActiveLocalStatus && (
              <span className="hidden sm:block max-w-48 truncate text-xs text-muted-foreground">
                {support.reason}
              </span>
            )}
          </div>
        )}
      </div>

      {provider === 'webllm' && isActiveLocalStatus && (
        <div className="grid gap-1">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs text-muted-foreground">
            <span className="min-w-0 truncate" title={statusText || 'Preparing local model'}>
              {statusText || 'Preparing local model'}
            </span>
            {localModel.status === 'loading' && (
              <span className="shrink-0 tabular-nums">{localModel.progress}%</span>
            )}
          </div>
          {localModel.status === 'loading' && (
            <div className="h-1 overflow-hidden rounded-sm bg-border">
              <div
                className="h-full bg-foreground transition-[width] duration-150"
                style={{ width: `${Math.max(2, Math.min(100, localModel.progress))}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
