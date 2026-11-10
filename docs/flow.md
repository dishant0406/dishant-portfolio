# Flows

## Publishing a blog post

1. Publish or edit the post on dev.to.
2. Call the endpoint:

   ```bash
   curl -X POST https://dishantsharma.dev/api/revalidate \
     -H "Authorization: Bearer $REVALIDATE_TOKEN"
   ```

3. `POST` in `src/app/api/revalidate/route.ts` runs `isTokenValid`. Then it calls `revalidatePath` for `/blog`, `/blog/[slug]` and `/sitemap.xml`.
4. It answers `{"ok":true,"revalidatedAt":"..."}`.
5. The next visit to each page rebuilds it. `fetchAllPosts` in `src/lib/api/devto.ts` reads dev.to again.

## Edge cases

- No `Authorization` header, or wrong token: 401 `{"error":"Unauthorized"}`. Nothing is cleared.
- `REVALIDATE_TOKEN` not set on the server: always 401.
- `GET` instead of `POST`: 405.
- New post still missing after a 200: dev.to's own cache is probably serving the old list. Wait, or check the dev.to API directly. The hourly timer still runs as a backup.
- Token leaked: add a new secret version in Secret Manager (`revalidate-token`) and redeploy. The worst an attacker can do is force rebuilds.
