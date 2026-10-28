# PlayerHaat Admin

Internal Super Admin dashboard (React + TypeScript + Tailwind v4 + TanStack Query). Separate from the public site; talks only to `/api/v1/admin/*`.

## Run

```bash
pnpm install
cp .env.example .env     # optional in dev
pnpm dev                 # http://localhost:5174  (proxies /api -> http://localhost:4000)
pnpm test                # unit tests
pnpm build               # type-check + production bundle
```

## What it covers

Dashboard, users (suspend/ban/delete, credits, role), player profiles, recruiters, verifications (recruiter + player stats),
manual payments (approve/reject bKash/Nagad/Rocket top-ups), requests & events, reports, sports/positions, locations,
feature flags & pricing, announcements, audit log, and your own account (password, sessions, backup codes).
Every action is gated by `lib/permissions.ts` and written to the audit log by the API.

## Sign-in and 2FA

Password, then an authenticator code (TOTP). The first sign-in shows a QR/secret and one-time backup codes. The API does this
itself (`/admin/auth/*`): short-lived challenge token, httpOnly refresh cookie, single-use rotating refresh tokens.
2FA is required in production (`ADMIN_REQUIRE_2FA`, forced on there); set `ADMIN_TOTP_KEY` (32+ random chars) to encrypt secrets.
A locked-out admin can have their 2FA reset directly in the database (`totpSecret`, `totpEnabledAt`, `totpBackupHashes` -> null).

## Deploying

Build with `pnpm build` and host `dist/` on its own origin. Add that origin to the API's `CORS_ORIGINS`
(credentials are allowed) and serve everything over HTTPS so the refresh cookie is `Secure`.

## Security notes

- Access token: memory only. Refresh: httpOnly cookie. Idle sign-out after 15 min.
- `<meta name="robots" content="noindex">` and `robots.txt` disallow-all (add an `X-Robots-Tag: noindex` response header at the host in Phase 5).
- Permissions are checked per action in `src/lib/permissions.ts`.
