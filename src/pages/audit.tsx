import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterSelect, Toolbar } from '@/components/data/filters'
import { PagedTable, type Column } from '@/components/data/paged-table'
import { Badge } from '@/components/ui/badge'
import { usePaged } from '@/lib/queries'
import { fmtDateTime, humanize } from '@/lib/format'
import { PageHeader } from '@/pages/shared'

interface Action { id: string; adminId: string; action: string; targetType: string; targetId: string; reason: string | null; metadata: Record<string, unknown> | null; createdAt: string }

const TARGETS = ['USER', 'PLAYER_PROFILE', 'PLAYER_SPORT', 'RECRUITER', 'REQUEST', 'REPORT', 'VERIFICATION', 'PAYMENT', 'CREDIT_PACK', 'CONVERSATION', 'CONFIG', 'SPORT']

/** Everything an admin did, newest first. Append-only on the server: this page can read it, never change it. */
export default function AuditPage() {
  const [targetType, setTargetType] = useState('')
  const list = usePaged<Action>('/admin/actions', { targetType: targetType || undefined }, 40)
  const columns: Column<Action>[] = [
    { header: 'When', cell: (a) => <span className="whitespace-nowrap text-muted-foreground">{fmtDateTime(a.createdAt)}</span> },
    { header: 'Action', cell: (a) => <Badge tone={/BAN|DELETE|REJECT|HIDE|SUSPEND/.test(a.action) ? 'danger' : 'primary'}>{humanize(a.action)}</Badge> },
    { header: 'Target', cell: (a) => (a.targetType === 'USER' ? <Link className="hover:underline" to={`/users/${a.targetId}`}>User <span className="font-mono text-[11px]">{a.targetId}</span></Link> : <span>{humanize(a.targetType)} <span className="font-mono text-[11px] text-muted-foreground">{a.targetId}</span></span>) },
    { header: 'Reason', cell: (a) => <div className="max-w-md">{a.reason ?? <span className="text-muted-foreground">—</span>}{a.metadata && <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">{JSON.stringify(a.metadata)}</p>}</div> },
    { header: 'Admin', cell: (a) => <Link className="font-mono text-[11px] text-muted-foreground hover:underline" to={`/users/${a.adminId}`}>{a.adminId}</Link> },
  ]
  return (
    <div className="animate-fade-up">
      <PageHeader title="Audit log" description="Who did what to whom, and why. Written in the same step as the change, so it can’t disagree with what happened." />
      <Toolbar><FilterSelect label="Target" value={targetType} onChange={setTargetType} options={[['', 'Everything'], ...TARGETS.map((t): [string, string] => [t, humanize(t)])]} /></Toolbar>
      <PagedTable columns={columns} items={list.items} loading={list.loading} fetching={list.fetching} error={list.error} hasMore={!!list.hasMore} loadingMore={list.loadingMore} onLoadMore={list.loadMore} onRetry={list.reload} empty="No admin actions yet." />
    </div>
  )
}
