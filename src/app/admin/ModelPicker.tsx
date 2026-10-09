'use client';

import { Check, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';

export type CatalogModel = {
  id: string;
  apiTypes: string[];
  apiLabel: string;
  defaultApiType: string;
};

export type TestResult = {
  ok: boolean;
  apiType?: string;
  reply?: string;
  error?: string;
  durationMs: number;
};

/** One model choice: the picker, the protocol it will use, and a live test. */
export function ModelPicker({
  label,
  hint,
  value,
  models,
  onChange,
  onTest,
  testing,
  test,
}: {
  label: string;
  hint: string;
  value: string;
  models: CatalogModel[];
  onChange: (modelId: string) => void;
  onTest: () => void;
  testing: boolean;
  test?: TestResult;
}) {
  const selected = models.find((model) => model.id === value);
  // A refresh can drop the configured model. Showing it as unavailable keeps the
  // current value visible instead of rendering an empty picker the operator
  // cannot interpret.
  const options = selected || !value
    ? models
    : [
      ...models,
      { id: value, apiTypes: [], apiLabel: 'Not in the model list', defaultApiType: 'chat_completions' },
    ];

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {selected ? selected.apiLabel : 'Not in the model list'}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>

      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-10 w-full flex-1 bg-background font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" className="max-h-72">
            {options.map((model) => (
              <SelectItem key={model.id} value={model.id} disabled={model.apiTypes.length === 0}>
                <span className="font-mono text-xs">{model.id}</span>
                {model.apiTypes.length === 0 && (
                  <span className="text-xs text-muted-foreground">unavailable</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0"
          onClick={onTest}
          disabled={testing}
        >
          {testing ? <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} /> : 'Test'}
        </Button>
      </div>

      {test && (
        <p
          role="status"
          className={`flex items-start gap-1.5 text-xs ${
            test.ok ? 'text-muted-foreground' : 'text-destructive'
          }`}
        >
          {test.ok
            ? <Check className="mt-px size-3.5 shrink-0" strokeWidth={2} />
            : <X className="mt-px size-3.5 shrink-0" strokeWidth={2} />}
          <span>
            {test.ok
              ? `${test.apiType} responded in ${test.durationMs} ms — ${JSON.stringify(test.reply ?? '')}`
              : `${test.error} (${test.durationMs} ms)`}
          </span>
        </p>
      )}
    </div>
  );
}
