import { api, ApiError, tokenStore } from '@/lib/api'
import { isDashboardRole } from '@/lib/permissions'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
}

/**
 * Backend contract for the mandatory-2FA flow. These endpoints do NOT exist in the API yet —
 * see README ("Backend work required") for the full spec.
 */
export type LoginStep =
  | { status: 'TOTP_REQUIRED'; challengeToken: string }
  | { status: 'TOTP_SETUP_REQUIRED'; challengeToken: string }
  | { status: 'AUTHENTICATED'; accessToken: string }

export interface TotpSetup {
  secret: string
  otpauthUrl: string
}

export interface EnableResult {
  accessToken: string
  backupCodes: string[]
}

export async function login(email: string, password: string): Promise<LoginStep> {
  const { data } = await api.post<LoginStep | { accessToken: string; user?: AdminUser }>(
    '/admin/auth/login',
    { email, password },
    { anonymous: true },
  )
  if ('status' in data) return data
  // Today's API returns tokens straight after the password. Mandatory 2FA means we refuse that,
  // except in `vite dev` with VITE_ALLOW_NO_2FA_DEV=true so the UI can be exercised pre-backend.
  if (import.meta.env.DEV && import.meta.env.VITE_ALLOW_NO_2FA_DEV === 'true') {
    return { status: 'AUTHENTICATED', accessToken: data.accessToken }
  }
  throw new ApiError(500, 'TWO_FACTOR_NOT_ENFORCED', 'Server did not require two-factor authentication. Sign-in blocked.')
}

export const verifyTotp = (challengeToken: string, input: { code: string } | { backupCode: string }) =>
  api.post<{ accessToken: string }>('/admin/auth/2fa/verify', { challengeToken, ...input }, { anonymous: true }).then((r) => r.data)

export const startTotpSetup = (challengeToken: string) =>
  api.post<TotpSetup>('/admin/auth/2fa/setup', { challengeToken }, { anonymous: true }).then((r) => r.data)

export const enableTotp = (challengeToken: string, code: string) =>
  api.post<EnableResult>('/admin/auth/2fa/enable', { challengeToken, code }, { anonymous: true }).then((r) => r.data)

export async function fetchMe(): Promise<AdminUser> {
  const { data } = await api.get<AdminUser>('/admin/me')
  if (!isDashboardRole(data.role)) {
    // Player/recruiter accounts must never get in, even with a valid token.
    tokenStore.set(null)
    throw new ApiError(403, 'NOT_ADMIN', 'This account cannot access the dashboard.')
  }
  return data
}

export const serverLogout = () => api.post('/admin/auth/logout').catch(() => undefined)
