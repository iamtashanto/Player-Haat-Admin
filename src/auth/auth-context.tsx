import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { refreshAccessToken, setUnauthorizedHandler, tokenStore } from '@/lib/api'
import { can, type Permission } from '@/lib/permissions'
import { fetchMe, serverLogout, type AdminUser } from './auth-api'

/** Auto sign-out after this long without any interaction. */
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const

type Status = 'loading' | 'anonymous' | 'authenticated'

interface AuthState {
  status: Status
  user: AdminUser | null
  /** Called once the API has issued an access token (after password + TOTP). */
  completeSignIn: (accessToken: string) => Promise<void>
  signOut: (reason?: 'idle' | 'manual') => Promise<void>
  can: (permission: Permission) => boolean
  signedOutReason: 'idle' | null
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<AdminUser | null>(null)
  const [signedOutReason, setReason] = useState<'idle' | null>(null)
  const qc = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clear = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
    setStatus('anonymous')
    qc.clear()
  }, [qc])

  const signOut = useCallback(
    async (reason: 'idle' | 'manual' = 'manual') => {
      await serverLogout()
      setReason(reason === 'idle' ? 'idle' : null)
      clear()
    },
    [clear],
  )

  const completeSignIn = useCallback(async (accessToken: string) => {
    tokenStore.set(accessToken)
    try {
      setUser(await fetchMe())
      setReason(null)
      setStatus('authenticated')
    } catch (e) {
      tokenStore.set(null)
      await serverLogout()
      throw e
    }
  }, [])

  // Restore the session after a reload: the refresh cookie → new in-memory access token.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const token = await refreshAccessToken()
      if (!alive) return
      if (!token) return setStatus('anonymous')
      try {
        const me = await fetchMe()
        if (alive) {
          setUser(me)
          setStatus('authenticated')
        }
      } catch {
        if (alive) clear()
      }
    })()
    return () => {
      alive = false
    }
  }, [clear])

  // A 401 that refresh could not fix means the session is gone.
  useEffect(() => {
    setUnauthorizedHandler(clear)
    return () => setUnauthorizedHandler(null)
  }, [clear])

  // Idle timeout.
  useEffect(() => {
    if (status !== 'authenticated') return
    const reset = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void signOut('idle'), IDLE_TIMEOUT_MS)
    }
    reset()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      clearTimeout(timer.current)
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [status, signOut])

  const value = useMemo<AuthState>(
    () => ({ status, user, completeSignIn, signOut, signedOutReason, can: (p) => can(user?.role, p) }),
    [status, user, completeSignIn, signOut, signedOutReason],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
