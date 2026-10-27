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

## Status

**Phase 1 done:** layout (sidebar/header/theme), auth UI with mandatory 2FA, permission helpers, `noindex`.

## Backend work required (not built — listed per instructions)

The current API cannot satisfy the security spec. The dashboard is already written against this contract and **refuses sign-in** if the API returns tokens without 2FA.

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `POST /admin/auth/login` | After password: return `{status:"TOTP_REQUIRED"\|"TOTP_SETUP_REQUIRED", challengeToken}` (short-lived, single-purpose) instead of tokens |
| 2 | `POST /admin/auth/2fa/setup` `{challengeToken}` | → `{secret, otpauthUrl}` |
| 3 | `POST /admin/auth/2fa/enable` `{challengeToken, code}` | verify first code → `{accessToken, backupCodes[]}` and set refresh cookie |
| 4 | `POST /admin/auth/2fa/verify` `{challengeToken, code}` or `{backupCode}` | → `{accessToken}` + refresh cookie |
| 5 | `POST /admin/auth/refresh` | refresh via **httpOnly Secure SameSite cookie** (today the refresh token is returned in the JSON body) → `{accessToken}` |
| 6 | `POST /admin/auth/logout` | revoke session, clear cookie |
| 7 | CORS | `credentials: true` + add the admin origin to `CORS_ORIGINS` |
| 8 | Role naming | API role is `ADMIN`; the UI treats it as `SUPER_ADMIN`. Add `MODERATOR`/`SUPPORT` later |
| 9 | Account page | change password, list/revoke sessions, regenerate backup codes, disable/reset 2FA |

Until 1–6 exist you can exercise the UI with `VITE_ALLOW_NO_2FA_DEV=true` in `pnpm dev` only (stripped from production behaviour).

## Security notes

- Access token: memory only. Refresh: httpOnly cookie. Idle sign-out after 15 min.
- `<meta name="robots" content="noindex">` and `robots.txt` disallow-all (add an `X-Robots-Tag: noindex` response header at the host in Phase 5).
- Permissions are checked per action in `src/lib/permissions.ts`.
