import { describe, expect, it } from 'vitest'
import { can, canAny, isDashboardRole, normalizeRole, PERMISSIONS } from './permissions'

describe('permissions', () => {
  it('treats API role ADMIN as SUPER_ADMIN with every permission', () => {
    expect(normalizeRole('ADMIN')).toBe('SUPER_ADMIN')
    for (const p of PERMISSIONS) expect(can('ADMIN', p)).toBe(true)
  })

  it('rejects player and recruiter roles', () => {
    expect(isDashboardRole('PLAYER')).toBe(false)
    expect(isDashboardRole('RECRUITER')).toBe(false)
    expect(can('PLAYER', 'dashboard.view')).toBe(false)
  })

  it('denies missing roles', () => {
    expect(can(null, 'users.view')).toBe(false)
    expect(can(undefined, 'users.view')).toBe(false)
  })

  it('limits MODERATOR and SUPPORT per action', () => {
    expect(can('MODERATOR', 'reports.resolve')).toBe(true)
    expect(can('MODERATOR', 'users.ban')).toBe(false)
    expect(can('SUPPORT', 'users.reset_sessions')).toBe(true)
    expect(can('SUPPORT', 'users.suspend')).toBe(false)
    expect(can('SUPPORT', 'config.flags')).toBe(false)
  })

  it('canAny matches when at least one permission is granted', () => {
    expect(canAny('SUPPORT', ['users.ban', 'users.view'])).toBe(true)
    expect(canAny('SUPPORT', ['users.ban', 'audit.view'])).toBe(false)
  })
})
