/** `…/img/-/<path>` → `…/img/<transform>/<path>`; any other URL passes through. */
export function mediaUrl(url: string | null | undefined, transform: string): string | undefined {
  if (!url) return undefined
  const i = url.indexOf('/img/-/')
  return i < 0 ? url : `${url.slice(0, i)}/img/${transform}/${url.slice(i + '/img/-/'.length)}`
}
export const AVATAR = 'w_150,h_150,c_fill'
export const THUMB = 'w_400'
export const COVER = 'w_1200,h_400,c_fill'
export const fmtBytes = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(0, Math.round(n / 1e3))} kB`)
