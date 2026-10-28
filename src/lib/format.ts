const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export const fmtDateTime = (iso?: string | null) => (iso ? dateTime.format(new Date(iso)) : '—')
export const fmtDate = (iso?: string | null) => (iso ? dateOnly.format(new Date(iso)) : '—')
export const fmtNumber = (n?: number | null) => (n == null ? '—' : n.toLocaleString())
export const fmtMoney = (n?: number | null) => (n == null ? '—' : `৳${n.toLocaleString()}`)

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000], ['month', 2_592_000], ['day', 86_400], ['hour', 3_600], ['minute', 60],
]
/** "3 hours ago" / "in 2 days". */
export function ago(iso?: string | null): string {
  if (!iso) return '—'
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  for (const [unit, size] of UNITS) if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  return 'just now'
}

/** "CONTACT_REVEAL" → "Contact reveal". */
export const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')
