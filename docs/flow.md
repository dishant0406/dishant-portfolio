# Flows

## Publishing a blog post

1. Publish or edit the post on dev.to.
2. Call the endpoint:

   ```bash
   curl -X POST -d '' -A revalidate-script https://dishantsharma.dev/api/revalidate \
     -H "Authorization: Bearer $REVALIDATE_TOKEN"
   ```

The empty `-d ''` matters. Cloud Run's front end answers 411 to a POST with no body.

3. `POST` in `src/app/api/revalidate/route.ts` runs `isTokenValid`. Then it expires our cached post list (`revalidateTag('devto-posts', { expire: 0 })`) and calls `revalidatePath` for `/blog`, `/blog/[slug]` and `/sitemap.xml`.
4. It fixes the canonical URLs on dev.to (see the next section), then answers `{"ok":true,"revalidatedAt":"...","canonical":{...}}`.
5. The next visit to each page rebuilds it. `fetchAllPosts` in `src/lib/api/devto.ts` reads dev.to's authenticated list again and caches it for an hour.

## Making Google index a new post

This now happens inside the same refresh call. You do not run a second command.

1. You publish on dev.to. dev.to says the dev.to copy is the original (its "canonical URL").
2. You call `POST /api/revalidate` (step 2 above).
3. After it marks the pages stale, `POST` in `src/app/api/revalidate/route.ts` calls `syncCanonicalUrls` in `src/lib/api/devto.ts`.
4. `syncCanonicalUrls` reads your published posts from dev.to. For each post whose canonical URL is not `https://dishantsharma.dev/blog/<slug>`, it updates the post on dev.to. Posts that are already right are skipped.
5. The answer lists what changed: `{"ok":true,"revalidatedAt":"...","canonical":{"updated":["<slug>"],"failed":[]}}`.

If you never call the endpoint, the post shows on the site after the hourly timer, but Google keeps the dev.to copy. Search Console then says "Discovered, currently not indexed" for the site URL.

`pnpm devto:canonical` (`scripts/sync-devto-canonical.ts`) still works from a laptop. Use it with `-- --dry-run` when you only want to see what would change.

To check one URL in Google, use the repo-local credentials:

```bash
gsc-cli inspect url --credentials-file .gsc-cli/credentials.json --site sc-domain:dishantsharma.dev --url <url>
```

The `.gsc-cli/` folder is ignored by Git. It uses the `dishant5570@gmail.com` Search Console account. The global Google Cloud account stays unchanged.

## Edge cases

- No `Authorization` header, or wrong token: 401 `{"error":"Unauthorized"}`. Nothing is cleared.
- `REVALIDATE_TOKEN` not set on the server: always 401.
- `GET` instead of `POST`: 405.
- `curl: (56) Connection reset by peer` on `dishantsharma.dev`: seen with curl's default user agent, from the dev laptop. The same call works with any other `-A` value, and the browser works too. The app is not the cause: the `run.app` URL accepts plain curl. Keep `-A revalidate-script` in the command.
- `curl: (56) Connection reset by peer` even with `-A revalidate-script`: `$REVALIDATE_TOKEN` is empty in your terminal, so curl sends `Authorization: Bearer ` with nothing after it. Google's front end drops that connection before the app sees it (checked: empty token resets every time, a wrong token gets 401). Load the token first: `export REVALIDATE_TOKEN=$(grep '^REVALIDATE_TOKEN=' .env.local | cut -d= -f2-)`.
- New post still missing after a 200: dev.to's own cache is probably serving the old list. Wait, or check the dev.to API directly. The hourly timer still runs as a backup.
- dev.to rejects one canonical update: status 502, `ok` is `false`, and the slug is in `canonical.failed`. The pages are still refreshed. Call the endpoint again.
- dev.to cannot be read at all, or `DEVTO_API_KEY` is missing on the server: status 502 `{"ok":false,"revalidatedAt":"...","error":"Canonical sync failed"}`. The pages are still refreshed. The real error is in the server log.
- Token leaked: add a new secret version in Secret Manager (`revalidate-token`) and redeploy. The worst an attacker can do is force rebuilds.

## Changing what the home page says

Basically, you edit one file and reload. No code change is needed.

1. Open `src/config/config.json`.
2. Change a value, for example `hero.greeting` or an item in `projects.items`.
3. The files in `src/config/` read the JSON, for example `src/config/hero.ts`. The components read those files.
4. `Home` in `src/app/page.tsx` runs `getHasContent`. It shows a section only if its list has items.

Edge cases:
- A list is empty (for example `bookmarks.items`): the section does not show, and it is also missing from the side rail.
- `PROFILE_G_TOKEN` is not set: the GitHub section is hidden. If the token is wrong, `fetchGithubData` returns nothing and the section stays empty.
- You want a project on the page: add the GitHub topic `portfolio` to the repo (repo page, the gear next to About, Topics). `fetchProjects` in `src/lib/github/projects.ts` searches for every public repo with that topic under `projects.github.owners`. It shows within an hour. Remove the topic to hide it. Add an entry to `overrides` (keyed by repo name) to set a nicer `title`, `tagline`, `liveUrl` or `image`.
- No repo has the topic, GitHub cannot be reached, or the rate limit is hit: `fetchProjects` returns an empty list, the Projects section hides, and the command palette has no Projects group. The result is cached for an hour, so a short outage is not seen.
- You add a job to `experience.items`: it needs `role`, `company`, `period` and `location`. `summary` is optional.
- You add a skill with an `icon` name that `skillIconMap` in `src/components/landing/skills.tsx` does not know: the build fails on the type check. Add the icon there.
- A project image on a new host: add the host to `images.remotePatterns` in `next.config.ts`, or the hover preview fails.
- `sections.order` lists an id that does not exist: TypeScript says no. Use only the ids in `SectionId` in `src/config/types.ts`.

## What a visitor sees

1. `src/app/layout.tsx` draws the sticky header (logo, tabs, command palette, GitHub link, theme toggle) and the dotted side gutters.
2. The wave header and the hero text fade in (`src/components/landing/hero.tsx`).
3. The sections show in the order of `sections.order`.
4. The footer shows the quote and the Earth (`src/components/landing/footer-scene.tsx`).
5. `/blog` and each post render in the same frame, with the dev.to posts (see the first section).

Keys: `Ctrl or Cmd + K` opens the command palette. `D` flips the theme.

Edge cases:
- Unknown URL: `src/app/not-found.tsx` shows the 404 scene.
- Motion turned off in the system settings: the animations use the `motion-reduce` styles and stop.
- No JavaScript: the `no-js-visible` rule in `src/app/layout.tsx` shows the faded-in parts anyway.

## Insights and the contribution graph

1. `Insights` in `src/components/landing/insights.tsx` calls `getInsights` in `src/lib/github/insights.ts`.
2. Followers and stars come from the GitHub REST API (`src/lib/github/repos.ts`). Stars are the sum over your public repos.
3. Contributions and active days for the last 7 days come from the contribution calendar (`fetchGithubData`). The trend compares them with the 7 days before.
4. The line chart under the numbers (`InsightsChart` in `src/components/landing/insights-chart.tsx`) plots two lines for the same 7 days: contributions (from the calendar) and pushes (public push events from `fetchPublicEvents`). You can hover, touch or use the arrow keys to read one day.
5. The contribution graph (`GitHubSection`) uses the same calendar.

Edge cases:
- `PROFILE_G_TOKEN` is not set: Contributions and Active days show "No data", and the line chart is hidden. Followers and stars still show. The contribution graph is hidden.
- A push is to a private repo: it counts in Contributions but not in Pushes, because the public events list does not include it.
- The 7 days before had 0 contributions: the trend shows "New".
- Both weeks are equal: no trend arrow shows.

## The picture on a project hover

1. `toProject` in `src/lib/github/projects.ts` picks the image. First, the `image` you set in `overrides`.
2. Next, the share image (`og:image`) that the live site publishes. The server reads the site's HTML once a day.
3. Last, the card that GitHub makes for the repo (`opengraph.githubassets.com`).

Edge cases:
- The live site is down, slow (over 4 seconds) or has no share image: step 3 is used.
- The repo has no live site: step 3 is used.
- The picture fails to load in the browser: the hover card shows a gallery icon instead.

## Recent articles

1. `Home` in `src/app/page.tsx` calls `fetchAllPosts` (dev.to, cached for an hour) and passes the newest `articles.limit` posts to `Articles`.
2. `Articles` in `src/components/landing/articles.tsx` splits them into two rows that scroll in opposite directions. Hover slows the scroll. The scroll pauses when the section is off screen.
3. A card links to `/blog/<slug>`. The link under the cards goes to `/blog`.

Edge cases:
- dev.to cannot be read: the section hides and the rest of the page loads.
- Motion is off in the system settings: the rows stay still.

## Homepage identity and project links

1. `Hero` in `src/components/landing/hero.tsx` shows the name, role message, location, and intro.
2. The H1 comes from `hero.headline` in `src/config/config.json`.
3. The highlighted word `blog` links to `/blog`.
4. `HomeProjectExplorer` passes GitHub projects to `ProjectExplorer`.
5. `WorkRow` uses `href`, then `liveUrl`, then `githubUrl`.

Edge cases:

- The hero text renders visible before client JavaScript runs.
- A project with no live URL opens its GitHub repository.
- A project with no URL of any kind keeps a `#` link. Current GitHub projects always have a repository URL.
- `ProfilePage` structured data renders on the homepage. `WebSite` structured data renders on every route.

## Article identity, dates, and related links

1. `BlogPostPage` reads one dev.to article through `fetchBlogPostBySlug`.
2. The page shows the publication date first.
3. If the update time is later, the page also shows the update date.
4. The author name links to `/#about`.
5. The cover image uses high fetch priority when a cover exists.
6. `RecentPosts` reads the cached article list.
7. It excludes the current article and counts shared tags.
8. It sorts by shared tags, then by publication date.
9. It shows four posts.

Edge cases:

- No article shares a tag: the section shows the newest posts and uses `More articles`.
- No other article exists: the section does not render.
- The dev.to list fails: the section does not render and the article still loads.
- No allowed cover image exists: share metadata uses `site.blogOgImage`.
- The article is missing: the page returns 404 with no canonical URL.

## Response headers and sitemap dates

1. `next.config.ts` adds security headers to every route.
2. `sitemap.ts` lists the homepage, blog, and article URLs.
3. Article entries do not include `lastmod` because the list feed cannot prove prose edit dates.
4. Search Console reads the sitemap without errors or warnings.

Edge cases:

- A request uses HTTP: Cloud Run redirects it to HTTPS with 302. A deployment change can make this permanent.
- A request uses `www`: Next.js redirects it to the apex host with 308.
- A request uses an unknown URL: the 404 page returns `noindex, nofollow` and no canonical URL.

## Repo-local Search Console commands

1. Read `.gsc-cli/config.json` for the account and property.
2. Pass `.gsc-cli/credentials.json` to `gsc-cli`.
3. Keep `.gsc-cli/` ignored by Git.

Example:

```bash
gsc-cli report overview --credentials-file .gsc-cli/credentials.json --site sc-domain:dishantsharma.dev --days 28 --output table
```

Edge cases:

- The token expires: repeat the Google sign-in flow for `dishant5570@gmail.com`.
- The global Google Cloud account changes: do not use it for this repository. Restore or keep `dishants@groww.in` as the global account.
- The credential file is missing: the command stops before it reads another account.
