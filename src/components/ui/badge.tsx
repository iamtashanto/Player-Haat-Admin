import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary'

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success/15 text-success',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  danger: 'bg-destructive/15 text-destructive',
  primary: 'bg-accent text-primary',
}

export function Badge({ tone = 'neutral', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium', TONES[tone], className)} {...props} />
}

/** Status words used across the API, mapped to a colour once. */
const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'success', APPROVED: 'success', PAID: 'success', RESOLVED: 'success', ACCEPTED: 'success', OPEN: 'primary', COMPLETED: 'success',
  PENDING: 'warning', SUBMITTED: 'warning', FILLED: 'primary',
  SUSPENDED: 'warning', BANNED: 'danger', DELETED: 'danger', REJECTED: 'danger', CANCELLED: 'danger', DISMISSED: 'neutral', WITHDRAWN: 'neutral',
}
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>
