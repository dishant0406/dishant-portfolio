import { timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Call this after publishing or editing a post on dev.to. It marks the blog
 * list, every post page and the sitemap as stale, so the next visit rebuilds
 * them from dev.to instead of waiting for the hourly timer.
 *
 *   curl -X POST https://dishantsharma.dev/api/revalidate \
 *     -H "Authorization: Bearer $REVALIDATE_TOKEN"
 */

const noStore = { 'Cache-Control': 'no-store' };

function isTokenValid(request: Request): boolean {
  const expected = process.env.REVALIDATE_TOKEN?.trim();
  // No token configured means the endpoint is closed, never open.
  if (!expected) return false;

  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const givenBuffer = Buffer.from(given);
  const expectedBuffer = Buffer.from(expected);

  // timingSafeEqual throws on different lengths, so check that first.
  return givenBuffer.length === expectedBuffer.length && timingSafeEqual(givenBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  if (!isTokenValid(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore });
  }

  revalidatePath('/blog');
  revalidatePath('/blog/[slug]', 'page');
  revalidatePath('/sitemap.xml');

  return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() }, { headers: noStore });
}
