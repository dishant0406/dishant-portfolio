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
4. It answers `{"ok":true,"revalidatedAt":"..."}`.
5. The next visit to each page rebuilds it. `fetchAllPosts` in `src/lib/api/devto.ts` reads dev.to's authenticated list again and caches it for an hour.

## Edge cases

- No `Authorization` header, or wrong token: 401 `{"error":"Unauthorized"}`. Nothing is cleared.
- `REVALIDATE_TOKEN` not set on the server: always 401.
- `GET` instead of `POST`: 405.
- `curl: (56) Connection reset by peer` on `dishantsharma.dev`: seen with curl's default user agent, from the dev laptop. The same call works with any other `-A` value, and the browser works too. The app is not the cause: the `run.app` URL accepts plain curl. Keep `-A revalidate-script` in the command.
- New post still missing after a 200: dev.to's own cache is probably serving the old list. Wait, or check the dev.to API directly. The hourly timer still runs as a backup.
- Token leaked: add a new secret version in Secret Manager (`revalidate-token`) and redeploy. The worst an attacker can do is force rebuilds.
