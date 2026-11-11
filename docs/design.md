# Design decisions

## Blog refresh endpoint (`POST /api/revalidate`)

**What we chose.** One route, `src/app/api/revalidate/route.ts`. You call it after you publish on dev.to. It marks `/blog`, every `/blog/[slug]` page and `/sitemap.xml` as stale. The next visit rebuilds them from dev.to.

**Why.** The blog pages used `revalidate = 3600`. A new post could take up to an hour to show. The timer stays as a safety net, but now you do not have to wait for it.

**Auth.** A secret token in the `Authorization: Bearer` header, checked against `REVALIDATE_TOKEN`. If the variable is not set, the endpoint always says 401. So a missing secret closes it, never opens it. The compare uses `timingSafeEqual`.

**Why a separate token.** `INTERNAL_API_TOKEN` is for Next.js talking to Mastra. If we reused it, leaking one would open both. In production the token comes from Secret Manager (`revalidate-token`), wired in `.github/workflows/prod-deploy.yaml`.

**Why it works on Cloud Run.** The cache lives inside one server instance. The service is pinned to `maxScale: 1`, so there is only one instance and the clear reaches every visitor. If you ever raise `maxScale`, this endpoint only clears the instance that got the call. You would then need a shared cache.

**Rejected.**
- Rebuild and redeploy on each post: slow, and a deploy is a lot of work for one article.
- Cookie login like `/admin`: a script cannot easily log in. A bearer token is simpler for `curl`.
- Revalidate only one slug: more input to validate, and clearing all post pages costs nothing, because pages rebuild only when someone visits.

**Trade-off.** dev.to's own list cache (Fastly) can still serve old data for a while. See `src/lib/api/devto.ts`. If a new post does not show after a refresh, that is the likely cause, not this endpoint.

## Where the post list comes from, and our own cache

**What we chose.** `fetchAllPosts` in `src/lib/api/devto.ts` reads dev.to's authenticated list (`/api/articles/me/published`, via `client.articles.minePublished`). It keeps the result in our own cache (`unstable_cache`, tag `devto-posts`, one hour). `POST /api/revalidate` expires that tag first, then marks the pages stale.

**Why.** The public list (`/api/articles?username=...`) goes through dev.to's CDN. The copy our Cloud Run server reads was stale: the live sitemap had 84 posts while dev.to had 86. The authenticated list is private and is never cached by the CDN (checked: `Cache-Control: private`, no cache hits). We could not look at the server's side directly, so the CDN is the most likely cause, not a proven one. Adding a throwaway query value does not help, because the CDN ignores it.

**Why our own cache.** Without it, every page rebuild would call dev.to again. One cached list serves the blog page, recent posts and the sitemap, and the refresh endpoint can drop it on demand.

**Trade-off.** The authenticated list has no `edited_at`. So the sitemap's last-modified date for a post is its publish date. The post page still shows "Updated <date>", because it reads the single-post endpoint. The authenticated list also carries each post's full markdown, so the response is bigger.

**Fallback.** With no `DEVTO_API_KEY` (for example a local build), the code reads the public list instead.

## SEO audit fixes (November 2026)

**The main problem found.** 31 of 88 posts were not in Google. Search Console said "Discovered, currently not indexed" or "URL is unknown". The cause: those posts (all published after 2026-10-11) still said on dev.to that dev.to is the original. Basically Google saw two copies and trusted dev.to. The fix is not code. You run `pnpm devto:canonical`, which points each dev.to post back at the site. It must run after every new post.

**Blog list thumbnails use a fixed size.** `src/components/blog/BlogListItem.tsx` now passes `width={96}` and `height={96}` to the image, not `fill` plus `sizes`. Why: with `fill`, Next.js writes 16 image URLs per thumbnail into the HTML. With 88 posts that made `/blog` 627 KB. A fixed size writes 2 URLs. The page is now about 307 KB. Rejected: paging the list, because paging is what hid posts from Google before. Trade-off: the thumbnail is always loaded at 96px or 2x, which is fine because it is never shown bigger.

**Post titles have no "| Dishant Sharma" suffix.** `src/app/blog/[slug]/page.tsx` uses `title: { absolute: title }`. Why: Google shows about 60 characters. Post titles are already near that, so the suffix pushed them to 77 and got cut. Trade-off: the name is not in the browser tab for posts. Google shows the site name separately anyway.

**The post cover image loads first.** It now has `priority`, the real size (1000 by 420, what dev.to serves) and a `sizes` value. Why: the cover is the biggest thing on screen, and it was lazy-loaded, which makes the page feel slow to Google (LCP). The old 1280 by 720 numbers also made the browser ask for images up to 3840px wide.

**The homepage h1 is the line with the name.** In `src/components/GreetingSection.tsx` the greeting ("Good Evening! It's sunny in Delhi") is now a `<p>`, and the subtitle with "Dishant Sharma, a Full Stack Developer" is the `<h1>`. It looks the same. Why: the h1 tells Google what the page is about, and the greeting changes for every visitor and never had the name in it. The site sits at position 8.9 for "dishant sharma", so this matters.

**Homepage structured data is a ProfilePage plus a WebSite.** `profilePageJsonLd` and `websiteJsonLd` in `src/lib/seo.ts`. The Person block now sits inside the ProfilePage. Why: ProfilePage is the type Google reads for "this page is about one person", and WebSite gives it the site name.

**The post author carries name and url.** `blogPostingJsonLd` used to say only `author: { '@id': ... }`. The Person block with that id is only on the homepage, so on a post the id pointed at nothing. Now the author has `@type`, `name` and `url` too.

**Shared chat pages are noindex.** `/?chat=<id>` in `src/app/page.tsx` now sends `robots: { index: false, follow: true }`. Why: a shared chat is the homepage with another title. It adds thin copies to Google.

**Smaller things.** `/blog` has a real title and description, and an image for link previews (it had none, because setting `openGraph` on a page drops the images from the root layout). The homepage now has `og:url`.

**Looked at, not changed.**
- `http://` goes to `https://` with a 302, not a 301. That comes from Cloud Run, not from this code.
- The homepage is built on every request (it reads the visitor's city), so it cannot be cached. First byte took about 1.5 s. Fixing it means moving the greeting to the browser, which is a bigger change.
- The homepage has about 125 words and 2 links. A short "about" block with links to GitHub and top posts would help the name search.
- `userScalable: false` in `src/app/layout.tsx` stops pinch zoom. It is an accessibility problem, but it was likely set on purpose for the chat input.
- No `llms.txt`. There is no good proof yet that AI search tools read it.
