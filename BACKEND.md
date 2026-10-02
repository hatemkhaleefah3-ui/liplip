# Backend v1

The backend runs as Cloudflare Pages Functions under `/functions` and stores user state in Cloudflare D1.

## What is implemented

- `GET /api/health` — runtime/D1 health check.
- `GET|POST|DELETE /api/session` — anonymous HttpOnly session lifecycle.
- `GET|PUT /api/state` — authenticated state load/save with optimistic concurrency (`revision`).
- `backend-client.js` — offline-first bridge for progress, course content, language and local profile/session preview.
- `migrations/0001_backend.sql` — D1 schema.

Anonymous sessions are intentionally the first backend identity layer. Google/Facebook buttons are still not authentication and should not be presented as such until OAuth is implemented.

## Cloudflare setup

1. Create a D1 database, for example `liplip-db`.
2. Apply `migrations/0001_backend.sql` to that database (Dashboard SQL console or Wrangler).
3. In the Cloudflare Pages project, add a D1 binding named exactly `DB` for Production and Preview and point it to `liplip-db`.
4. Redeploy `main`.
5. Open `/api/health`; it should return HTTP 200 with `database: "ok"`.

Example Wrangler commands if you use the CLI:

```sh
npx wrangler d1 create liplip-db
npx wrangler d1 execute liplip-db --remote --file=migrations/0001_backend.sql
```

The Pages dashboard binding is still required unless you later add a Wrangler configuration with the real D1 database ID.

## Sync semantics

The client persists a backend revision and a fingerprint of the last synchronized local state. A local-only change is pushed; a remote-only change is pulled; if both changed since the last successful synchronization, the client refuses to overwrite either side and logs a conflict. The API also enforces revision compare-and-swap at the database layer.

State payloads are capped at 512 KiB. This is suitable for the current progress/profile/content JSON but not for media uploads. Images/audio should move to R2 in a later backend phase.

## Security properties and limits

Session tokens are random, stored only in an `HttpOnly; Secure; SameSite=Lax` cookie, and only their SHA-256 hash is stored in D1. The current anonymous identity is device/browser-specific, so it does not yet provide cross-device account login. Registered identity, account recovery, OAuth, abuse controls/rate limiting, admin authorization, and server-managed course publishing remain separate backend phases.
