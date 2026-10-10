/**
 * Points every dev.to article's canonical URL at its dishantsharma.dev copy.
 *
 * dev.to is the writing surface, but the site is the canonical home. A post
 * created in the dev.to UI defaults to canonicalising itself, which makes Google
 * treat the dev.to copy as the original and the site copy as the duplicate. This
 * script is the fix, and it is idempotent: running it again changes nothing.
 *
 * Requires a dev.to API key with write access:
 *
 *   DEVTO_API_KEY=xxx pnpm devto:canonical
 *   DEVTO_API_KEY=xxx pnpm devto:canonical -- --dry-run
 *
 * It prints a per-article result and exits non-zero if anything failed, so it is
 * safe to run in CI or from a pre-publish checklist.
 */

const API = 'https://dev.to/api';
const SITE = 'https://dishantsharma.dev';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** dev.to throttles bursts, so a 429 is retried with backoff rather than failed. */
async function devto(
  path: string,
  apiKey: string,
  options: RequestInit = {},
  attempt = 0,
): Promise<Response> {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      'api-key': apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if ((response.status === 429 || response.status === 503) && attempt < 6) {
    await sleep(Math.min(2000 * 2 ** attempt, 30000));
    return devto(path, apiKey, options, attempt + 1);
  }

  return response;
}

interface ArticleSummary {
  id: number;
  slug: string;
  canonical_url: string | null;
  /** Only needed to prove the update did not wipe the article body. */
  title?: string;
  body_markdown?: string;
}

async function publishedArticles(apiKey: string): Promise<ArticleSummary[]> {
  const articles: ArticleSummary[] = [];

  for (let page = 1; page <= 5; page += 1) {
    const response = await devto(`/articles/me/published?per_page=100&page=${page}`, apiKey);
    if (!response.ok) {
      throw new Error(`listing articles failed: ${response.status} ${await response.text()}`);
    }

    const batch = (await response.json()) as ArticleSummary[];
    articles.push(...batch);
    if (batch.length < 100) break;
  }

  return articles;
}

async function main(): Promise<void> {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    console.error(
      'DEVTO_API_KEY is required (dev.to Settings -> Extensions -> DEV Community API Keys).',
    );
    process.exit(1);
  }

  const dryRun = process.argv.includes('--dry-run');
  const articles = await publishedArticles(apiKey);
  console.log(`${articles.length} published articles${dryRun ? ' (dry run)' : ''}`);

  const failures: Array<Record<string, unknown>> = [];
  let alreadyCorrect = 0;
  let updated = 0;
  let wouldUpdate = 0;

  for (const article of articles) {
    const canonical = `${SITE}/blog/${article.slug}`;

    if (article.canonical_url === canonical) {
      alreadyCorrect += 1;
      continue;
    }

    if (dryRun) {
      console.log(
        `  would set  ${article.slug}\n             ${article.canonical_url || '(none)'} -> ${canonical}`,
      );
      wouldUpdate += 1;
      continue;
    }

    const response = await devto(`/articles/${article.id}`, apiKey, {
      method: 'PUT',
      body: JSON.stringify({ article: { canonical_url: canonical } }),
    });

    if (!response.ok) {
      failures.push({
        slug: article.slug,
        status: response.status,
        body: (await response.text()).slice(0, 200),
      });
      console.log(`  FAILED    ${article.slug} (${response.status})`);
      await sleep(1000);
      continue;
    }

    // Trust the response, not the request: dev.to echoes the stored article back.
    //
    // The body and title are checked too. `PUT /articles/:id` is a partial update
    // today, but if dev.to ever changed it to a full replace this script would
    // blank every article while still reporting success. Only a field the
    // response actually carries can be judged: an absent field is unverifiable,
    // not a failure.
    const saved = (await response.json()) as ArticleSummary;
    const emptiedBody = article.body_markdown ? saved.body_markdown === '' : false;
    const emptiedTitle = article.title ? saved.title === '' : false;

    if (saved.canonical_url !== canonical) {
      failures.push({
        slug: article.slug,
        reason: 'canonical not persisted',
        got: saved.canonical_url,
      });
      console.log(`  NOT SAVED ${article.slug}`);
    } else if (emptiedBody || emptiedTitle) {
      failures.push({
        slug: article.slug,
        reason: 'article content was emptied by the update',
        emptiedBody,
        emptiedTitle,
      });
      console.log(`  CONTENT LOST ${article.slug}`);
    } else {
      updated += 1;
      console.log(`  set       ${article.slug}`);
    }

    await sleep(1000);
  }

  console.log(
    dryRun
      ? `\nwould update: ${wouldUpdate}, already correct: ${alreadyCorrect}`
      : `\nupdated: ${updated}, already correct: ${alreadyCorrect}, failed: ${failures.length}`,
  );

  if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log(`every published article canonicalises to ${SITE}`);
}

void main();
