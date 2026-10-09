import { NextResponse } from 'next/server';
import { getAdminSessionCookieName } from '@/lib/admin-auth';

export async function POST() {
  const response = NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
  );

  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}
