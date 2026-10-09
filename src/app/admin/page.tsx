import type { Metadata } from 'next';
import { requireAdminSession } from '@/lib/admin-auth';
import { AdminLoginForm } from './AdminLoginForm';
import { AdminModelForm } from './AdminModelForm';

export const metadata: Metadata = {
  title: 'Model administration',
  robots: { index: false, follow: false },
};

// The session cookie decides what is rendered, so this page must never be cached.
export const dynamic = 'force-dynamic';

/**
 * `html`/`body` are locked to the viewport height in globals.css so the chat UI
 * can manage its own scrolling, which leaves this page with no scrollable box of
 * its own. `fixed inset-0 overflow-y-auto` re-establishes one, the same way
 * `.blog-shell` does.
 */
export default async function AdminPage() {
  const authenticated = await requireAdminSession();

  return (
    <main className="fixed inset-0 overflow-y-auto overscroll-contain bg-background text-foreground">
      {authenticated ? <AdminModelForm /> : <AdminLoginForm />}
    </main>
  );
}
