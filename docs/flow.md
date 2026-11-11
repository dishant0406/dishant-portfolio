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

To check one URL in Google: `gsc-cli inspect url --site sc-domain:dishantsharma.dev --url <url>`.

## Edge cases

- No `Authorization` header, or wrong token: 401 `{"error":"Unauthorized"}`. Nothing is cleared.
- `REVALIDATE_TOKEN` not set on the server: always 401.
- `GET` instead of `POST`: 405.
- `curl: (56) Connection reset by peer` on `dishantsharma.dev`: seen with curl's default user agent, from the dev laptop. The same call works with any other `-A` value, and the browser works too. The app is not the cause: the `run.app` URL accepts plain curl. Keep `-A revalidate-script` in the command.
- New post still missing after a 200: dev.to's own cache is probably serving the old list. Wait, or check the dev.to API directly. The hourly timer still runs as a backup.
- dev.to rejects one canonical update: status 502, `ok` is `false`, and the slug is in `canonical.failed`. The pages are still refreshed. Call the endpoint again.
- dev.to cannot be read at all, or `DEVTO_API_KEY` is missing on the server: status 502 `{"ok":false,"revalidatedAt":"...","error":"Canonical sync failed"}`. The pages are still refreshed. The real error is in the server log.
- Token leaked: add a new secret version in Secret Manager (`revalidate-token`) and redeploy. The worst an attacker can do is force rebuilds.
