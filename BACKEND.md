# Backend v2

The production backend runs as Cloudflare Pages Functions under `/functions` with Cloudflare D1 as the primary database.

## Implemented

### Identity and sessions

- Anonymous device sessions remain supported for guests.
- Registered email/password accounts are now supported.
- `POST /api/auth/register` upgrades an anonymous session in place when possible, preserving the user's existing progress.
- `POST /api/auth/login` signs into an existing account.
- `GET /api/auth/me` returns the current account/session identity.
- `POST /api/auth/logout` revokes the current user session.
- Passwords are never stored directly. They use PBKDF2-HMAC-SHA256 with a per-account random salt and 210,000 iterations.
- Login and registration attempts are throttled in D1.
- User sessions are random HttpOnly, Secure, SameSite=Lax cookies; only SHA-256 token hashes are stored in D1.

### User state

- `GET|PUT /api/state` stores progress/profile state with optimistic revision control.
- User state now contains only user-owned data: progress, literacy/level milestones, UI language, and local profile preview.
- Shared course content is no longer copied into each user's state.
- `backend-client.js` performs offline-first synchronization and refuses silent overwrite on concurrent edits.

### Shared content

- `GET /api/content` returns the published course and fast-practice content bundle.
- `GET|PUT /api/admin/content` lets an authenticated admin publish the shared content bundle using revision compare-and-swap.
- `frontend/features/backend-content-v49.js` pulls published content for users and publishes local admin edits back to the server.
- Published content changes are recorded in `audit_log`.

### Administration

- Server-authenticated admin sessions remain separate from user sessions.
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/users`
- `GET /api/admin/user/:id`
- `GET|PUT /api/admin/content`

The admin password exists only as the Cloudflare secret `ADMIN_PASSWORD`; it is not embedded in frontend code.

## Database migrations

Apply all migrations in order:

```sh
npx wrangler d1 execute liplip-db --remote --file=migrations/0001_backend.sql
npx wrangler d1 execute liplip-db --remote --file=migrations/0002_admin.sql
npx wrangler d1 execute liplip-db --remote --file=migrations/0003_accounts_content.sql
```

Migration `0003_accounts_content.sql` adds:

- `user_accounts`
- `auth_attempts`
- `course_content`
- `audit_log`

It also creates the initial `published` course-content row.

## Cloudflare configuration

The Pages project requires a D1 binding named exactly `DB` in both Production and Preview.

Add the admin secret with Wrangler or the Pages dashboard:

```sh
npx wrangler pages secret put ADMIN_PASSWORD --project-name <your-pages-project>
```

Use a long unique password. Do not place it in git or frontend JavaScript.

After applying migrations and redeploying, verify:

1. `GET /api/health` returns HTTP 200 and `database: "ok"`.
2. Create a normal account through the website Sign Up form.
3. Sign out, then sign back in from another browser and confirm the same progress is restored.
4. Sign in through Admin access and verify the account appears in the users list.
5. Change course content as admin and confirm another browser receives the published content.

## State and content limits

- User state: 512 KiB per user.
- Shared published content: 2 MiB.
- Images/audio/video files must not be embedded as large base64 blobs in D1. Use URLs. A future media-upload layer should use Cloudflare R2.

## Security model

- Password hashes are salted PBKDF2 hashes.
- User and admin sessions are separate cookies.
- Admin APIs require a server-validated admin session.
- Account login failures are throttled.
- State and content writes use optimistic concurrency revisions.
- Content publishing records an audit event.
- The backend does not expose account passwords, session tokens, or admin credentials through APIs.

## Remaining external integrations

The core application backend is now present. These features still require third-party provider configuration rather than additional local backend logic:

- Google/Facebook/WhatsApp OAuth login credentials and callback configuration.
- Transactional email provider for email verification/password reset.
- Cloudflare R2 binding if direct media uploads are required.

Until an email provider is configured, account recovery and email verification should not be presented as active features.
