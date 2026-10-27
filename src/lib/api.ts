/**
 * HTTP client for the admin API.
 *  - Access token lives in module memory only (never localStorage/sessionStorage).
 *  - Refresh token is an httpOnly Secure cookie set by the API; we only ever call /auth/refresh.
 *  - Success envelope is `{ data, meta }`, errors are `{ error: { code, message, details } }`.
 */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api/v1'

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

let accessToken: string | null = null
let onUnauthorized: (() => void) | null = null
let refreshing: Promise<string | null> | null = null

export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => {
    accessToken = t
  },
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

export interface ApiResult<T> {
  data: T
  meta: Record<string, unknown>
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  /** Skip the Authorization header and the 401 refresh dance (used by the auth endpoints). */
  anonymous?: boolean
  signal?: AbortSignal
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  const s = qs.toString()
  return `${BASE}${path}${s ? `?${s}` : ''}`
}

async function parse<T>(res: Response): Promise<ApiResult<T>> {
  const json = (await res.json().catch(() => null)) as
    | { data?: T; meta?: Record<string, unknown>; error?: { code: string; message: string; details?: unknown } }
    | null
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? 'UNKNOWN', json?.error?.message ?? res.statusText, json?.error?.details)
  }
  return { data: json?.data as T, meta: json?.meta ?? {} }
}

/** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(buildUrl('/admin/auth/refresh'), { method: 'POST', credentials: 'include' })
      if (!res.ok) return null
      const { data } = await parse<{ accessToken: string }>(res)
      accessToken = data.accessToken
      return accessToken
    } catch {
      return null
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

async function send(path: string, opts: RequestOptions) {
  const headers: Record<string, string> = {}
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (!opts.anonymous && accessToken) headers.Authorization = `Bearer ${accessToken}`
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers,
    credentials: 'include',
    signal: opts.signal,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  let res = await send(path, opts)
  if (res.status === 401 && !opts.anonymous) {
    const fresh = await refreshAccessToken()
    if (!fresh) {
      accessToken = null
      onUnauthorized?.()
      return parse<T>(res)
    }
    res = await send(path, opts)
  }
  return parse<T>(res)
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, o?: Pick<RequestOptions, 'anonymous'>) => request<T>(path, { method: 'POST', body: body ?? {}, ...o }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
}
