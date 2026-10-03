# Backend

The production backend runs as Cloudflare Pages Functions under `/functions` with Cloudflare D1 as the primary database.

## Identity and sessions

- Anonymous device sessions are supported for guests.
- Registered email/password accounts are supported.
- `POST /api/auth/register` upgrades an anonymous session in place when possible.
- `POST /api/auth/login` signs into an existing account.
- `GET /api/auth/me` returns the current identity.
- `POST /api/auth/logout` revokes the current user session.
- Session cookies are random `HttpOnly; Secure; SameSite=Lax` values; only SHA-256 token hashes are stored in D1.
- Passwords use PBKDF2-HMAC-SHA256 with a per-account random 16-byte salt. The current default is **30,000 iterations**, stored per account so the verifier can support future iteration changes.
- Email login failures are counted in `auth_attempts` and throttled. Registration currently calls the throttle gate but does not record failed attempts; do not treat registration as abuse-rate-limited until that path is fixed.

### Social identity

Migration `0004_social_auth.sql` enables:

- Google OAuth;
- Facebook OAuth;
- WhatsApp one-time-code identity;
- provider identity records and short-lived OAuth state rows.

Required provider credentials/secrets must be configured in Cloudflare before the corresponding flow is usable.

## User state

- `GET|PUT /api/state` stores learner-owned state with optimistic revision control.
- The write path performs both a revision precheck and a conditional update, preventing silent last-writer overwrite.
- `backend-client.js` is active in `index.html`; it creates/loads sessions, synchronizes state, and reports concurrent-change conflicts instead of silently overwriting them.

Limits:

- request/state payload: 512 KiB;
- user state: 512 KiB serialized JSON.

## Shared content

- `GET /api/content` returns published shared content.
- `GET|PUT /api/admin/content` requires a server-validated admin session and uses revision compare-and-swap.
- publishing records an `audit_log` entry;
- shared published content is capped at 2 MiB.

`frontend/features/backend-content-v49.js` is the browser-side transport for published content.

## Administration

Admin sessions are independent from normal user sessions.

Endpoints:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/users`
- `GET /api/admin/user/:id`
- `GET|PUT /api/admin/content`

`ADMIN_PASSWORD` exists only as a Cloudflare secret and is never embedded in frontend JavaScript.

**Current security gap:** `/api/admin/login` does not have a server-side attempt throttle. Use a high-entropy unique secret and add rate limiting before exposing the endpoint to hostile traffic.

## Database migrations

Apply every migration in order:

```sh
npx wrangler d1 execute liplip-db --remote --file=migrations/0001_backend.sql
npx wrangler d1 execute liplip-db --remote --file=migrations/0002_admin.sql
npx wrangler d1 execute liplip-db --remote --file=migrations/0003_accounts_content.sql
npx wrangler d1 execute liplip-db --remote --file=migrations/0004_social_auth.sql
```

Migration `0003_accounts_content.sql` adds account/auth-attempt/shared-content/audit structures. Migration `0004_social_auth.sql` adds `auth_identities`, `oauth_states`, and `whatsapp_otps`.

The Pages project requires a D1 binding named exactly `DB` in Production and Preview.

## Cloudflare secrets and provider configuration

Admin:

```sh
npx wrangler pages secret put ADMIN_PASSWORD --project-name <your-pages-project>
```

Gemini:

```sh
npx wrangler pages secret put GEMINI_API_KEY --project-name <your-pages-project>
```

Google/Facebook/WhatsApp require their corresponding provider IDs/secrets/tokens referenced by the functions under `functions/api/oauth` and `functions/api/auth/whatsapp`.

After changing bindings, variables, or secrets, redeploy the production commit.

## Gemini learning services

Server-side Gemini endpoints are:

- `POST /api/gemini/speech` — TTS for `letter`, `number`, `word`, and `sentence`;
- `POST /api/gemini/drawing` — handwriting/image judgment;
- `POST /api/gemini/course-exam` — generated grammar/story/video exam questions.

The API key stays server-side. Optional model/voice overrides are read from environment variables.

Current request validation includes source/type/location bounds and structured response validation. The course exam endpoint follows the deployed Study geometry: levels 1–5, boxes 1–50 within each level.

**Current security gap:** Gemini endpoints reject browser requests explicitly marked cross-site, but they do not require a user session or enforce a durable server-side request quota. A direct HTTP client can omit browser fetch metadata, so these endpoints should not be considered protected against API-key quota abuse.

The v114 browser speech runtime uses native Web Speech first and only calls Gemini when native speech fails or code explicitly requests a prefetch.

## WhatsApp OTP

- codes are random six-digit values stored only as a secret-bound SHA-256 hash;
- codes expire after 10 minutes;
- verification is limited to five wrong attempts for a phone number;
- sending enforces a one-minute cooldown per destination phone.

**Current abuse gap:** send throttling is per phone number only. A client rotating destination numbers can still drive paid sends unless an additional client/network/account quota is added.

## OAuth/account-linking review notes

Before treating social account linking as hardened production identity, address these audit items:

- account lookup/linking by provider email should require an appropriately verified provider email claim;
- the stored OAuth state `user_id` should be incorporated into/link-authorization semantics when an OAuth flow can attach identity to an existing session;
- callback/public origin is currently hard-coded to `https://liplip.pages.dev`; deployments on another canonical origin need coordinated configuration.

## Health verification

After migrations and deployment:

1. `GET /api/health` should return HTTP 200 with `database: "ok"` and schema `v3`.
2. Create an account, sign out, and sign in again.
3. Verify state synchronization from another browser/session.
4. Sign in through Admin and verify users/content access.
5. Publish content and confirm another client receives the new revision.
6. Exercise configured social providers and WhatsApp on a non-production test account before enabling their UI broadly.

## Media storage

Do not place large image/audio/video base64 payloads in D1. Use URLs; direct media upload should use a dedicated object store such as Cloudflare R2.
