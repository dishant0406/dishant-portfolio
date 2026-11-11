import { timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { POSTS_CACHE_TAG, syncCanonicalUrls } from '@/lib/api/devto';

/**
 * Call this after publishing or editing a post on dev.to. It marks the blog
 * list, every post page and the sitemap as stale, so the next visit rebuilds
 * them from dev.to instead of waiting for the hourly timer. It also points the
 * canonical URL of every dev.to post at this site, so Google indexes our copy.
 *
 *   curl -X POST -d '' https://dishantsharma.dev/api/revalidate \
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

  // First drop our cached post list, so the pages below rebuild from dev.to.
  revalidateTag(POSTS_CACHE_TAG, { expire: 0 });
  revalidatePath('/blog');
  revalidatePath('/blog/[slug]', 'page');
  revalidatePath('/sitemap.xml');

  const revalidatedAt = new Date().toISOString();

  // The pages are already refreshed above, so a dev.to failure here must not
  // hide that. It is reported with a 502 so a script still notices.
  try {
    const canonical = await syncCanonicalUrls();
    const status = canonical.failed.length > 0 ? 502 : 200;
    return NextResponse.json({ ok: status === 200, revalidatedAt, canonical }, { status, headers: noStore });
  } catch (error) {
    console.error('Canonical sync failed:', error);
    return NextResponse.json(
      { ok: false, revalidatedAt, error: 'Canonical sync failed' },
      { status: 502, headers: noStore },
    );
  }
}
