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

export default async function AdminPage() {
  const authenticated = await requireAdminSession();

  return (
    <main className="flex min-h-dvh justify-center bg-background px-4 py-10 sm:py-16">
      <div className="w-full max-w-3xl">
        <h1 className="mb-6 text-lg font-semibold text-foreground">Model administration</h1>
        {authenticated ? <AdminModelForm /> : <AdminLoginForm />}
      </div>
    </main>
  );
}
