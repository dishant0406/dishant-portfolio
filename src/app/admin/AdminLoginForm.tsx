'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/shadcn/alert';
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Model administration</CardTitle>
        <CardDescription>Enter the admin password to manage the chat models.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3">
          <Input
            type="password"
            value={password}
            autoFocus
            autoComplete="current-password"
            placeholder="Admin password"
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={submitting || password.length === 0}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
