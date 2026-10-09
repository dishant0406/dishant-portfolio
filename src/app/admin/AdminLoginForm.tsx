'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';

export function AdminLoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        window.location.reload();
        return;
      }

      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? 'Login failed');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted">
            <ShieldCheck className="size-4 text-foreground" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-base">Model administration</CardTitle>
          <CardDescription>Sign in to manage the chat models and provider settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                autoFocus
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'admin-password-error' : undefined}
                className="h-10"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
              />
              {error && (
                <p id="admin-password-error" role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full active:scale-[0.96]"
              disabled={submitting || password.length === 0}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
