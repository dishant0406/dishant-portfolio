import { NextRequest, NextResponse } from 'next/server';
import {
  createSessionToken,
  clearLoginAttempts,
  getAdminSessionCookieName,
  getAdminSessionMaxAgeSeconds,
  getLoginRetryAfterSeconds,
  isAdminPasswordValid,
  registerLoginAttempt,
} from '@/lib/admin-auth';
import { getClientIP } from '@/lib/security';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  if (!registerLoginAttempt(ip)) {
    const retryAfter = getLoginRetryAfterSeconds(ip);
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${retryAfter} seconds.` },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(retryAfter),
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    );
  }

  let password = '';
  try {
    const body: unknown = await request.json();
    if (body && typeof body === 'object' && 'password' in body) {
      password = String((body as { password: unknown }).password ?? '');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!password || !(await isAdminPasswordValid(password))) {
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  }

  clearLoginAttempts(ip);

  const response = NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
  );

  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: createSessionToken(),
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getAdminSessionMaxAgeSeconds(),
  });

  return response;
}
