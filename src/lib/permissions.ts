/**
 * Permissions are checked per *action*, never per role, so adding MODERATOR / SUPPORT later is a
 * one-line change in ROLE_PERMISSIONS and no component needs rewriting.
 *
 * The API currently names the top role `ADMIN`; it is treated as an alias of `SUPER_ADMIN`.
 */
export const PERMISSIONS = [
  'dashboard.view',
  'users.view',
  'users.suspend',
  'users.ban',
  'users.verify',
  'users.change_role',
  'users.reset_sessions',
  'users.delete',
  'users.export',
  'profiles.view',
  'profiles.moderate',
  'requests.view',
  'requests.moderate',
  'reports.view',
  'reports.resolve',
  'config.sports',
  'config.locations',
  'config.flags',
  'notifications.send',
  'audit.view',
  'recruiters.view',
  'verifications.review',
  'payments.review',
  'packs.manage',
  'credits.grant',
] as const

export type Permission = (typeof PERMISSIONS)[number]
export type Role = 'SUPER_ADMIN' | 'MODERATOR' | 'SUPPORT'

/** Roles the dashboard accepts. Anything else (PLAYER, RECRUITER, …) is rejected at login. */
export type ApiRole = Role | 'ADMIN' | 'PLAYER' | 'RECRUITER'

const MODERATOR: Permission[] = [
  'dashboard.view', 'users.view', 'users.suspend', 'profiles.view', 'profiles.moderate',
  'requests.view', 'requests.moderate', 'reports.view', 'reports.resolve', 'recruiters.view', 'verifications.review',
]
const SUPPORT: Permission[] = ['dashboard.view', 'users.view', 'users.reset_sessions', 'profiles.view', 'requests.view', 'reports.view', 'recruiters.view']

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  MODERATOR,
  SUPPORT,
}

export function normalizeRole(role: string): Role | null {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return 'SUPER_ADMIN'
  if (role === 'MODERATOR' || role === 'SUPPORT') return role
  return null
}

export function can(role: string | null | undefined, permission: Permission): boolean {
  const r = role ? normalizeRole(role) : null
  return r !== null && ROLE_PERMISSIONS[r].includes(permission)
}

export function canAny(role: string | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => can(role, p))
}

/** Only these roles may sign in to the dashboard at all. */
export function isDashboardRole(role: string): boolean {
  return normalizeRole(role) !== null
}
