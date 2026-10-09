'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Field, Section } from './Section';
import { ModelPicker, type CatalogModel, type TestResult } from './ModelPicker';

type ThinkingMode = 'disabled' | 'enabled' | 'auto';

type AdminConfig = {
  model: string;
  fallbackModel: string;
  guardrailModel: string;
  baseURL: string;
  guardrailBaseURL: string;
  thinkingMode: ThinkingMode;
  cacheTtlSeconds: number;
  hasApiKey: boolean;
  modelCatalog: { updatedAt: string; source: string };
};

type ConfigResponse = {
  config: AdminConfig;
  models: CatalogModel[];
  writable: boolean;
};

type CatalogDiff = { added: string[]; removed: string[]; protocolChanged: string[] };

type CatalogResponse = {
  ok: boolean;
  models: CatalogModel[];
  updatedAt: string;
  unusable: string[];
  warnings: string[];
  diff: CatalogDiff;
};

type Notice = { kind: 'ok' | 'error'; text: string };

const THINKING_MODES: ThinkingMode[] = ['disabled', 'enabled', 'auto'];

type ModelField = 'model' | 'fallbackModel' | 'guardrailModel';

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const describeDiff = (diff: CatalogDiff) => {
  const parts = [
    diff.added.length > 0 && `${diff.added.length} added`,
    diff.removed.length > 0 && `${diff.removed.length} removed`,
    diff.protocolChanged.length > 0 && `${diff.protocolChanged.length} changed protocol`,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : 'No models changed';
};

export function AdminModelForm() {
  const [data, setData] = useState<ConfigResponse | null>(null);
  const [form, setForm] = useState<AdminConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, TestResult>>({});

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/config', { cache: 'no-store' });
      if (response.status === 401) {
        window.location.reload();
        return;
      }

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not load the configuration');

      setData(payload);
      setForm(payload.config);
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = <Key extends keyof AdminConfig>(key: Key, value: AdminConfig[Key]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setErrors([]);
    setNotice(null);
  };

  const dirty = useMemo(() => {
    if (!data || !form) return false;

    return JSON.stringify(data.config) !== JSON.stringify(form)
      || apiKey !== ''
      || newPassword !== '';
  }, [data, form, apiKey, newPassword]);

  const testModel = async (field: ModelField) => {
    if (!form) return;

    setTesting(field);
    try {
      const response = await fetch('/api/admin/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: form[field],
          scope: field === 'guardrailModel' ? 'guardrail' : 'chat',
          // Send the endpoint that model will actually use, so the test reflects
          // the saved configuration rather than the guardrail's endpoint.
          baseURL: field === 'guardrailModel' ? form.guardrailBaseURL : form.baseURL,
          apiKey,
        }),
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

  const refreshCatalog = async () => {
    if (!form) return;

    setRefreshing(true);
    setErrors([]);
    setNotice(null);

    try {
      const response = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseURL: form.baseURL, apiKey }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrors([payload.error ?? 'The model list could not be refreshed.']);
        return;
      }

      const result = payload as CatalogResponse;
      // The catalog was already saved server-side, so the baseline is updated
      // too. Otherwise the form would report unsaved changes that do not exist.
      setData((current) => (current
        ? { ...current, models: result.models, config: { ...current.config, modelCatalog: { updatedAt: result.updatedAt, source: 'probe' } } }
        : current));
      setForm((current) => (current
        ? {
          ...current,
          modelCatalog: { updatedAt: result.updatedAt, source: 'probe' },
        }
        : current));
      setNotice({
        kind: 'ok',
        text: `Model list refreshed: ${describeDiff(result.diff)}.`
          + (result.unusable.length > 0 ? ` ${result.unusable.length} models are unavailable.` : ''),
      });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setRefreshing(false);
    }
  };

  const save = async () => {
    if (!form) return;

    setSaving(true);
    setErrors([]);
    setNotice(null);

    const body: Record<string, unknown> = {
      model: form.model,
      fallbackModel: form.fallbackModel,
      guardrailModel: form.guardrailModel,
      baseURL: form.baseURL,
      guardrailBaseURL: form.guardrailBaseURL,
      thinkingMode: form.thinkingMode,
      cacheTtlSeconds: form.cacheTtlSeconds,
    };
    if (apiKey) body.apiKey = apiKey;
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
      setApiKey('');
      setNewPassword('');
      setNotice({
        kind: 'ok',
        text: payload.reload?.reloaded
          ? 'Saved. The chat server reloaded, so this is live now.'
          : `Saved. The chat server picks this up within ${payload.config.cacheTtlSeconds}s.`,
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

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
        Loading configuration…
      </div>
    );
  }

  if (!form || !data) {
    return (
      <div className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-foreground">The configuration could not be loaded.</p>
        <p className="text-xs text-muted-foreground">{notice?.text}</p>
        <Button variant="outline" onClick={() => void load()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Model administration</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Changes apply to the next chat request. The API key is stored but never shown again.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
      </header>

      <div className="grid gap-5">
        <Section
          title="Models"
          description="The protocol is fixed by the provider and shown beside each picker."
        >
          <ModelPicker
            label="Primary model"
            hint="Answers portfolio questions."
            value={form.model}
            models={data.models}
            onChange={(modelId) => update('model', modelId)}
            onTest={() => void testModel('model')}
            testing={testing === 'model'}
            test={tests.model}
          />
          <ModelPicker
            label="Fallback model"
            hint="Used when the primary model fails before producing any output."
            value={form.fallbackModel}
            models={data.models}
            onChange={(modelId) => update('fallbackModel', modelId)}
            onTest={() => void testModel('fallbackModel')}
            testing={testing === 'fallbackModel'}
            test={tests.fallbackModel}
          />
          <ModelPicker
            label="Guardrail model"
            hint="Decides whether a message is in scope. If it is unreachable the visitor is told so instead of being blocked."
            value={form.guardrailModel}
            models={data.models}
            onChange={(modelId) => update('guardrailModel', modelId)}
            onTest={() => void testModel('guardrailModel')}
            testing={testing === 'guardrailModel'}
            test={tests.guardrailModel}
          />
        </Section>

        <Section
          title="Provider"
          description="Where requests are sent and how they are authenticated."
        >
          <Field
            label="Base URL"
            htmlFor="base-url"
            hint="Used by the chat and fallback models."
          >
            <Input
              id="base-url"
              value={form.baseURL}
              spellCheck={false}
              className="h-10 font-mono text-xs"
              onChange={(event) => update('baseURL', event.target.value)}
            />
          </Field>

          <Field
            label="Guardrail base URL"
            htmlFor="guardrail-base-url"
            hint="Leave blank to use the base URL above."
          >
            <Input
              id="guardrail-base-url"
              value={form.guardrailBaseURL}
              spellCheck={false}
              placeholder="Same as the base URL"
              className="h-10 font-mono text-xs"
              onChange={(event) => update('guardrailBaseURL', event.target.value)}
            />
          </Field>

          <Field
            label="API key"
            htmlFor="api-key"
            hint={form.hasApiKey
              ? 'A key is stored. Leave blank to keep it.'
              : 'No key is stored yet.'}
          >
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              autoComplete="off"
              spellCheck={false}
              placeholder={form.hasApiKey ? 'Leave blank to keep the current key' : 'Paste the API key'}
              className="h-10 font-mono text-xs"
              onChange={(event) => {
                setApiKey(event.target.value);
                setErrors([]);
                setNotice(null);
              }}
            />
          </Field>
        </Section>

        <Section
          title="Model list"
          description="Which models the provider serves, and over which protocol. Refreshing asks the provider directly."
          action={(
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => void refreshCatalog()}
              disabled={refreshing || !data.writable}
            >
              {refreshing
                ? <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} />
                : <RefreshCw className="size-3.5" strokeWidth={1.5} />}
              {refreshing ? 'Refreshing…' : 'Refresh model list'}
            </Button>
          )}
        >
          <div className="grid gap-1 text-xs text-muted-foreground">
            <p>
              {data.models.length} models in the list
              {form.modelCatalog.source === 'probe' ? ' from the last refresh' : ' from the bundled default'}.
            </p>
            <p>Last refreshed: {formatTimestamp(form.modelCatalog.updatedAt)}</p>
            {refreshing && (
              <p role="status">Checking every model against all three protocols. This takes a moment.</p>
            )}
          </div>
        </Section>

        <Section title="Runtime" description="Applied to the next chat request.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Thinking mode" htmlFor="thinking-mode">
              <Select
                value={form.thinkingMode}
                onValueChange={(value) => update('thinkingMode', value as ThinkingMode)}
              >
                <SelectTrigger id="thinking-mode" className="h-10 w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THINKING_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Config cache TTL"
              htmlFor="cache-ttl"
              hint="Seconds before the chat server re-reads this config."
            >
              <Input
                id="cache-ttl"
                type="number"
                min={5}
                max={3600}
                value={form.cacheTtlSeconds}
                className="h-10"
                onChange={(event) => update('cacheTtlSeconds', Number(event.target.value))}
              />
            </Field>
          </div>
        </Section>

        <Section title="Security" description="The password for this page.">
          <Field
            label="New admin password"
            htmlFor="new-password"
            hint="Leave blank to keep the current password. At least 8 characters."
          >
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              autoComplete="new-password"
              placeholder="Leave blank to keep the current password"
              className="h-10"
              onChange={(event) => {
                setNewPassword(event.target.value);
                setErrors([]);
                setNotice(null);
              }}
            />
          </Field>
        </Section>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="mt-5 rounded-lg border border-destructive/40 bg-card px-4 py-3">
          <p className="text-sm font-medium text-destructive">Could not save</p>
          <ul className="mt-1 grid gap-1 text-xs text-destructive">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`mt-5 rounded-lg border px-4 py-3 text-xs ${
            notice.kind === 'ok'
              ? 'border-border bg-muted text-muted-foreground'
              : 'border-destructive/40 bg-card text-destructive'
          }`}
        >
          {notice.text}
        </div>
      )}

      {!data.writable && (
        <div role="status" className="mt-5 rounded-lg border border-border bg-muted px-4 py-3 text-xs text-muted-foreground">
          Read only: no writable config target is configured. Set MODEL_CONFIG_FILE or
          MODEL_CONFIG_GCS_URI.
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="text-xs text-muted-foreground">
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <Button
            onClick={() => void save()}
            disabled={saving || !dirty || !data.writable}
            className="active:scale-[0.96]"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
