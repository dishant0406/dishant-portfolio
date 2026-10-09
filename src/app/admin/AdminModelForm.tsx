'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/shadcn/alert';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { OPENCODE_API_TYPE_LABELS, type OpencodeApiType } from '@/mastra/agents/opencode-model-catalog';

type CatalogModel = { id: string; apiTypes: OpencodeApiType[] };

type AdminConfig = {
  model: string;
  fallbackModel: string;
  guardrailModel: string;
  guardrailBaseURL: string;
  thinkingMode: 'disabled' | 'enabled' | 'auto';
  cacheTtlSeconds: number;
};

type ConfigResponse = {
  config: AdminConfig;
  models: CatalogModel[];
  writable: boolean;
};

type TestResult = { ok: boolean; apiType?: string; reply?: string; error?: string; durationMs: number };

const THINKING_MODES: AdminConfig['thinkingMode'][] = ['disabled', 'enabled', 'auto'];

const describeApiTypes = (apiTypes: OpencodeApiType[]) =>
  apiTypes.length === 0
    ? 'No supported protocol'
    : apiTypes.map((apiType) => OPENCODE_API_TYPE_LABELS[apiType]).join(', ');

function ModelRow({
  label,
  hint,
  value,
  models,
  onChange,
  onTest,
  test,
  testing,
}: {
  label: string;
  hint: string;
  value: string;
  models: CatalogModel[];
  onChange: (modelId: string) => void;
  onTest: () => void;
  test?: TestResult;
  testing: boolean;
}) {
  const selected = models.find((model) => model.id === value);

  return (
    <div className="grid gap-2 border-b border-border pb-5 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Badge variant="outline" className="font-mono text-[11px]">
          {selected ? describeApiTypes(selected.apiTypes) : 'Unknown model'}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-9 w-full min-w-56 flex-1 bg-background sm:w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" className="max-h-72">
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id} disabled={model.apiTypes.length === 0}>
                <span className="font-mono text-xs">{model.id}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" size="sm" onClick={onTest} disabled={testing}>
          {testing ? 'Testing…' : 'Test'}
        </Button>
      </div>

      {test && (
        <p
          className={`text-xs ${test.ok ? 'text-muted-foreground' : 'text-destructive'}`}
          role="status"
        >
          {test.ok
            ? `OK via ${test.apiType} in ${test.durationMs} ms — replied ${JSON.stringify(test.reply ?? '')}`
            : `Failed via ${test.apiType ?? 'unknown protocol'} in ${test.durationMs} ms — ${test.error}`}
        </p>
      )}
    </div>
  );
}

export function AdminModelForm() {
  const [data, setData] = useState<ConfigResponse | null>(null);
  const [form, setForm] = useState<AdminConfig | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, TestResult>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/config', { cache: 'no-store' });
      if (response.status === 401) {
        window.location.reload();
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to load config');
      setData(payload);
      setForm(payload.config);
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = <Key extends keyof AdminConfig>(key: Key, value: AdminConfig[Key]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setMessage(null);
  };

  const testModel = async (field: 'model' | 'fallbackModel' | 'guardrailModel') => {
    if (!form) return;
    const modelId = form[field];
    setTesting(field);
    try {
      const response = await fetch('/api/admin/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId }),
      });
      const payload = await response.json();
      setTests((current) => ({
        ...current,
        [field]: {
          ok: Boolean(payload.ok),
          apiType: payload.apiType,
          reply: payload.reply,
          error: payload.error,
          durationMs: payload.durationMs ?? 0,
        },
      }));
    } catch (error) {
      setTests((current) => ({
        ...current,
        [field]: { ok: false, error: String(error), durationMs: 0 },
      }));
    } finally {
      setTesting(null);
    }
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setErrors([]);
    setMessage(null);

    const body: Record<string, unknown> = {
      model: form.model,
      fallbackModel: form.fallbackModel,
      guardrailModel: form.guardrailModel,
      guardrailBaseURL: form.guardrailBaseURL,
      thinkingMode: form.thinkingMode,
      cacheTtlSeconds: form.cacheTtlSeconds,
    };
    if (newPassword) body.adminPassword = newPassword;

    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrors(Array.isArray(payload.errors) ? payload.errors : [payload.error ?? 'Save failed']);
        return;
      }

      setData((current) => (current ? { ...current, config: payload.config } : current));
      setForm(payload.config);
      setNewPassword('');
      setMessage({
        kind: 'ok',
        text: payload.reload?.reloaded
          ? 'Saved. Chat server reloaded, changes are live now.'
          : `Saved. Chat server picks this up within ${payload.config.cacheTtlSeconds}s (${payload.reload?.reason ?? 'reload skipped'}).`,
      });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.reload();
  };

  if (loading || !form || !data) {
    return <p className="text-sm text-muted-foreground">Loading configuration…</p>;
  }

  const dirty = JSON.stringify(data.config) !== JSON.stringify(form) || newPassword !== '';

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Models</CardTitle>
            <CardDescription>
              The protocol for each model is fixed by OpenCode Go and shown next to the picker.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
        </CardHeader>
        <CardContent className="grid gap-5">
          <ModelRow
            label="Primary model"
            hint="Answers portfolio questions."
            value={form.model}
            models={data.models}
            onChange={(modelId) => update('model', modelId)}
            onTest={() => testModel('model')}
            test={tests.model}
            testing={testing === 'model'}
          />
          <ModelRow
            label="Fallback model"
            hint="Used when the primary model fails before producing output."
            value={form.fallbackModel}
            models={data.models}
            onChange={(modelId) => update('fallbackModel', modelId)}
            onTest={() => testModel('fallbackModel')}
            test={tests.fallbackModel}
            testing={testing === 'fallbackModel'}
          />
          <ModelRow
            label="Guardrail model"
            hint="Classifies whether a message is in scope. A failure here is reported as unavailable, not as an off-topic block."
            value={form.guardrailModel}
            models={data.models}
            onChange={(modelId) => update('guardrailModel', modelId)}
            onTest={() => testModel('guardrailModel')}
            test={tests.guardrailModel}
            testing={testing === 'guardrailModel'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Runtime</CardTitle>
          <CardDescription>Applied to the next chat request.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">Guardrail base URL</span>
            <Input
              value={form.guardrailBaseURL}
              onChange={(event) => update('guardrailBaseURL', event.target.value)}
              spellCheck={false}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">Thinking mode</span>
            <Select
              value={form.thinkingMode}
              onValueChange={(value) => update('thinkingMode', value as AdminConfig['thinkingMode'])}
            >
              <SelectTrigger className="h-9 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THINKING_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">Config cache TTL (seconds)</span>
            <Input
              type="number"
              min={5}
              max={3600}
              value={form.cacheTtlSeconds}
              onChange={(event) => update('cacheTtlSeconds', Number(event.target.value))}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">New admin password</span>
            <Input
              type="password"
              value={newPassword}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert>
          <AlertTitle>{message.kind === 'ok' ? 'Saved' : 'Error'}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {!data.writable && (
        <Alert variant="destructive">
          <AlertTitle>Read only</AlertTitle>
          <AlertDescription>
            No writable config target is configured. Set MODEL_CONFIG_FILE or MODEL_CONFIG_GCS_URI.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || !dirty || !data.writable}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      </div>
    </div>
  );
}
