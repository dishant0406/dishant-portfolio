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
