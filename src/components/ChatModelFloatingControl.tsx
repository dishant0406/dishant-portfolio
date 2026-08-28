'use client';

import { Button } from '@/components/shadcn/button';
import { ChatProviderModeButton } from '@/components/ChatProviderModeButton';
import { LocalModelStatusView } from '@/components/LocalModelStatusView';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { cn } from '@/lib/utils';
import type { ChatProvider, LocalModelState } from '@/types';
import { WEBLLM_MODEL_OPTIONS } from '@/webllm/models';
import { getWebLlmSupport, type WebLlmSupportResult } from '@/webllm/support';
import { AlertCircle, Cloud, Cpu, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type ChatModelFloatingControlProps = {
  provider: ChatProvider;
  modelId: string;
  localModel: LocalModelState;
  disabled?: boolean;
  className?: string;
  onProviderChange: (provider: ChatProvider) => void;
  onModelChange: (modelId: string) => void;
};

const activeLocalStatuses = ['checking', 'preparing', 'loading', 'generating'];

export function ChatModelFloatingControl({
  provider,
  modelId,
  localModel,
  disabled = false,
  className,
  onProviderChange,
  onModelChange,
}: ChatModelFloatingControlProps) {
  const [open, setOpen] = useState(false);
  const [support, setSupport] = useState<WebLlmSupportResult | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLocal = provider === 'webllm';
  const isBusy = isLocal && activeLocalStatuses.includes(localModel.status);
  const hasIssue = isLocal && (localModel.status === 'failed' || support?.supported === false);
  const selectedModel = useMemo(
    () => WEBLLM_MODEL_OPTIONS.find((model) => model.id === modelId),
    [modelId],
  );
  const statusText = localModel.status === 'failed'
    ? localModel.error || localModel.message
    : localModel.message;

  useEffect(() => {
    if (!isLocal) return;

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
  }, [isLocal, modelId]);

  const openPanel = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    // Generous grace so the pointer can travel from the icon into the panel.
    closeTimer.current = setTimeout(() => setOpen(false), 260);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          aria-label="Chat model settings"
          aria-expanded={open}
          variant="outline"
          size="icon-lg"
          onPointerEnter={openPanel}
          onPointerLeave={scheduleClose}
          onFocus={openPanel}
          className={cn(
            'fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-4 z-[60]',
            'h-11 w-11 rounded-full border-border bg-card text-foreground shadow-sm',
            'hover:bg-accent hover:text-accent-foreground sm:bottom-6 sm:right-6 lg:bottom-10 lg:right-10',
            className,
          )}
        >
          {isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isLocal ? (
            <Cpu className="h-4 w-4" />
          ) : (
            <Cloud className="h-4 w-4" />
          )}
          {hasIssue && <AlertCircle className="absolute -right-1 -top-1 h-4 w-4 text-destructive" />}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        onPointerEnter={openPanel}
        onPointerLeave={scheduleClose}
        className="animate-popover-in w-[min(20rem,calc(100vw-2rem))] overflow-hidden border-border bg-popover p-0 shadow-lg"
      >
        {/* Header */}
        <div data-popover-item className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-background text-foreground shadow-xs ring-1 ring-border">
              {isLocal ? (
                <Cpu className="size-4" />
              ) : (
                <Cloud className="size-4" />
              )}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-foreground">Model</p>
              <p className="truncate text-xs text-muted-foreground">
                {isLocal ? selectedModel?.label || 'Local inference' : 'Hosted inference'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid gap-4 px-4 py-4">
          {/* Provider toggle */}
          <div data-popover-item className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Provider</span>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
              <ChatProviderModeButton
                active={!isLocal}
                disabled={disabled}
                icon={<Cloud className="size-3.5" />}
                label="Hosted"
                onClick={() => onProviderChange('hosted')}
              />
              <ChatProviderModeButton
                active={isLocal}
                disabled={disabled}
                icon={<Cpu className="size-3.5" />}
                label="Local"
                onClick={() => onProviderChange('webllm')}
              />
            </div>
          </div>

          {isLocal && (
            <div data-popover-item className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">Model</span>
              <Select value={modelId} disabled={disabled} onValueChange={onModelChange}>
                <SelectTrigger size="sm" className="h-9 w-full rounded-md bg-background">
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

              {/* Status */}
              <div className="mt-0.5 rounded-md bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground">
                <LocalModelStatusView
                  localModel={localModel}
                  statusText={statusText}
                  support={support}
                />
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
