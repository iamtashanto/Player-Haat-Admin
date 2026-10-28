import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { FilterSelect, Toolbar } from '@/components/data/filters'
import { PagedTable, type Column } from '@/components/data/paged-table'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, ReasonDialog } from '@/components/ui/dialog'
import { useAuth } from '@/auth/auth-context'
import { api } from '@/lib/api'
import { useAction, usePaged } from '@/lib/queries'
import { ago, fmtDateTime, humanize } from '@/lib/format'
import { PageHeader } from '@/pages/shared'

interface Report { id: string; status: string; targetType: string; targetId: string; reason: string; details: string | null; reporter: { id: string; name: string }; createdAt: string; resolution?: string | null; openReportsOnTarget?: number }
interface ReportDetail extends Report { target: Record<string, unknown> | null; targetMissing: boolean; history: Array<{ id: string; action: string; reason: string | null; createdAt: string }> }
interface Transcript { messages: Array<{ id: string; from: string; body: string; createdAt: string }>; recruiter: { name: string }; player: { name: string } }

function Transcript({ conversationId }: { conversationId: string }) {
  const [shown, setShown] = useState(false)
  // Reading private messages is audit-logged on the server, so it only happens when the admin asks.
  const t = useQuery({ queryKey: ['transcript', conversationId], queryFn: async () => (await api.get<Transcript>(`/admin/conversations/${conversationId}/transcript`)).data, enabled: shown, staleTime: Infinity })
  if (!shown) return <div><Button variant="outline" size="sm" onClick={() => setShown(true)}>Read the conversation</Button><p className="mt-1 text-xs text-muted-foreground">Opening private messages is recorded in the audit log.</p></div>
  if (t.isPending) return <Loader2 className="h-4 w-4 animate-spin" />
  if (t.error || !t.data) return <p className="text-sm text-destructive">Couldn’t load the conversation.</p>
  return (
    <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg bg-muted p-3 text-sm">
      {t.data.messages.map((m) => <li key={m.id}><span className="font-medium">{m.from === 'RECRUITER' ? t.data.recruiter.name : t.data.player.name}</span> <span className="text-xs text-muted-foreground">{ago(m.createdAt)}</span><br />{m.body}</li>)}
    </ul>
  )
}

export default function ReportsPage() {
  const { can } = useAuth()
  const [status, setStatus] = useState('OPEN')
  const [openId, setOpenId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<'RESOLVED' | 'DISMISSED' | null>(null)
  const list = usePaged<Report>('/admin/reports', { status })
  const detail = useQuery({ queryKey: ['report', openId], queryFn: async () => (await api.get<ReportDetail>(`/admin/reports/${openId}`)).data, enabled: openId !== null })
  const resolve = useAction((v: { outcome: 'RESOLVED' | 'DISMISSED'; resolution: string }) => api.post(`/admin/reports/${openId}/resolve`, v), { success: 'Report closed', invalidate: [['paged'], ['report'], ['stats']] })
  const d = detail.data

  const columns: Column<Report>[] = [
    { header: 'Reported', cell: (r) => <div><Badge tone="primary">{humanize(r.targetType)}</Badge>{(r.openReportsOnTarget ?? 0) > 1 && <Badge tone="warning" className="ml-1">{r.openReportsOnTarget} open</Badge>}<p className="mt-1 font-mono text-[11px] text-muted-foreground">{r.targetId}</p></div> },
    { header: 'Why', cell: (r) => <div><p className="font-medium">{humanize(r.reason)}</p>{r.details && <p className="max-w-sm text-xs text-muted-foreground">{r.details}</p>}</div> },
    { header: 'By', cell: (r) => <span>{r.reporter.name}<span className="block text-xs text-muted-foreground">{ago(r.createdAt)}</span></span> },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
  ]
  return (
    <div className="animate-fade-up">
      <PageHeader title="Reports" description="What people flagged. Open one to see what it points at and its history, then act on the target and close the report." />
      <Toolbar><FilterSelect label="Status" value={status} onChange={setStatus} options={[['OPEN', 'Open (oldest first)'], ['RESOLVED', 'Resolved'], ['DISMISSED', 'Dismissed'], ['ALL', 'All']]} /></Toolbar>
      <PagedTable columns={columns} items={list.items} loading={list.loading} fetching={list.fetching} error={list.error} hasMore={!!list.hasMore} loadingMore={list.loadingMore} onLoadMore={list.loadMore} onRetry={list.reload} onRowClick={(r) => setOpenId(r.id)} empty="No reports." />

      <Dialog open={openId !== null} onClose={() => setOpenId(null)} title="Report" wide>
        {detail.isPending && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        {d && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={d.status} /><Badge tone="primary">{humanize(d.targetType)}</Badge><span className="text-muted-foreground">reported by {d.reporter.name} · {fmtDateTime(d.createdAt)}</span></div>
            <div><p className="font-medium">{humanize(d.reason)}</p>{d.details && <p className="mt-1 text-muted-foreground">{d.details}</p>}</div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">What it points at</p>
              {d.targetMissing ? <p className="text-muted-foreground">The target no longer exists.</p> : d.target && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-muted p-3">
                  {Object.entries(d.target).filter(([, v]) => v !== null && typeof v !== 'object').map(([k, v]) => <><dt key={`k${k}`} className="text-muted-foreground">{humanize(k.replace(/([A-Z])/g, '_$1'))}</dt><dd key={`v${k}`} className="break-words">{String(v)}</dd></>)}
                </dl>
              )}
              {d.target && typeof d.target.userId === 'string' && <Link className="mt-2 inline-block text-primary hover:underline" to={`/users/${d.target.userId}`}>Open the account to act on it →</Link>}
            </div>
            {d.targetType === 'CONVERSATION' && <Transcript conversationId={d.targetId} />}
            {d.history.length > 0 && <div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Earlier admin actions on this</p><ul className="space-y-1">{d.history.map((h) => <li key={h.id}>{humanize(h.action)} · {ago(h.createdAt)}{h.reason ? ` — ${h.reason}` : ''}</li>)}</ul></div>}
            {d.status === 'OPEN' && can('reports.resolve') && (
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setOutcome('DISMISSED')}>Dismiss (no action needed)</Button>
                <Button onClick={() => setOutcome('RESOLVED')}>Resolve (we acted)</Button>
              </div>
            )}
            {d.status !== 'OPEN' && d.resolution && <p className="border-t pt-3 text-muted-foreground">Closed: {d.resolution}</p>}
          </div>
        )}
      </Dialog>
      <ReasonDialog open={outcome !== null} onClose={() => setOutcome(null)} title={outcome === 'RESOLVED' ? 'Resolve this report' : 'Dismiss this report'} description="This only records the outcome. Hide, suspend or ban separately if the target needs it." label="What was decided" confirmLabel={outcome === 'RESOLVED' ? 'Resolve' : 'Dismiss'} onConfirm={(resolution) => resolve.mutateAsync({ outcome: outcome!, resolution })} />
    </div>
  )
}
