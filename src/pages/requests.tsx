import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterSelect, SearchBox, Toolbar } from '@/components/data/filters'
import { PagedTable, type Column } from '@/components/data/paged-table'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReasonDialog } from '@/components/ui/dialog'
import { useAuth } from '@/auth/auth-context'
import { api } from '@/lib/api'
import { useAction, usePaged } from '@/lib/queries'
import { fmtDateTime, fmtMoney } from '@/lib/format'
import { PageHeader } from '@/pages/shared'
import { useSports } from '@/lib/sports'

interface Req {
  id: string; poster: { id: string; name: string; email: string | null }; sport: { nameEn: string }; location: string; venueText: string; matchAt: string
  playersNeeded: number; playersAccepted: number; isPaid: boolean; budget: { min: number | null; max: number | null }; status: string; isHidden: boolean; applicationsCount: number
}

export default function RequestsPage() {
  const { can } = useAuth()
  const sports = useSports().data ?? []
  const [f, setF] = useState({ q: '', status: '', sportId: '', hidden: '', isPaid: '' })
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const [act, setAct] = useState<{ r: Req; kind: 'hide' | 'unhide' | 'cancel' } | null>(null)
  const list = usePaged<Req>('/admin/requests', { q: f.q || undefined, status: f.status || undefined, sportId: f.sportId || undefined, hidden: f.hidden || undefined, isPaid: f.isPaid || undefined })
  const run = useAction((v: { id: string; kind: 'hide' | 'unhide' | 'cancel'; reason: string }) => (v.kind === 'cancel' ? api.post(`/admin/requests/${v.id}/cancel`, { reason: v.reason }) : api.post(`/admin/requests/${v.id}/${v.kind}`, v.reason ? { reason: v.reason } : {})), { success: 'Done' })

  const columns: Column<Req>[] = [
    { header: 'Request', cell: (r) => <div><p className="font-medium">{r.sport.nameEn} · {r.venueText}</p><p className="text-xs text-muted-foreground">{r.location} · {fmtDateTime(r.matchAt)}</p></div> },
    { header: 'Posted by', cell: (r) => <Link to={`/users/${r.poster.id}`} className="hover:underline">{r.poster.name}</Link> },
    { header: 'Players', cell: (r) => <span>{r.playersAccepted}/{r.playersNeeded} <span className="text-xs text-muted-foreground">· {r.applicationsCount} applied</span></span> },
    { header: 'Pay', cell: (r) => (r.isPaid ? <Badge tone="primary">{r.budget.min != null || r.budget.max != null ? `${fmtMoney(r.budget.min)}–${fmtMoney(r.budget.max)}` : 'Paid'}</Badge> : <Badge>Free</Badge>) },
    { header: 'Status', cell: (r) => <div className="flex flex-wrap gap-1"><StatusBadge status={r.status} />{r.isHidden && <Badge tone="danger">Hidden</Badge>}</div> },
    { header: '', className: 'text-right', cell: (r) => can('requests.moderate') && (
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setAct({ r, kind: r.isHidden ? 'unhide' : 'hide' })}>{r.isHidden ? 'Unhide' : 'Hide'}</Button>
        {(r.status === 'OPEN' || r.status === 'FILLED') && <Button variant="outline" size="sm" onClick={() => setAct({ r, kind: 'cancel' })}>Cancel</Button>}
      </div>
    ) },
  ]
  return (
    <div className="animate-fade-up">
      <PageHeader title="Requests" description="Every match and event posted. Hide one to take it out of the feed, or cancel it (applicants are told)." />
      <Toolbar>
        <SearchBox value={f.q} onChange={set('q')} placeholder="Venue or poster" />
        <FilterSelect label="Status" value={f.status} onChange={set('status')} options={[['', 'Any status'], ['OPEN', 'Open'], ['FILLED', 'Filled'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled']]} />
        <FilterSelect label="Sport" value={f.sportId} onChange={set('sportId')} options={[['', 'All sports'], ...sports.map((s): [string, string] => [String(s.id), s.nameEn])]} />
        <FilterSelect label="Hidden" value={f.hidden} onChange={set('hidden')} options={[['', 'Hidden or not'], ['true', 'Hidden'], ['false', 'Visible']]} />
        <FilterSelect label="Pay" value={f.isPaid} onChange={set('isPaid')} options={[['', 'Paid or free'], ['true', 'Paid'], ['false', 'Free']]} />
      </Toolbar>
      <PagedTable columns={columns} items={list.items} loading={list.loading} fetching={list.fetching} error={list.error} hasMore={!!list.hasMore} loadingMore={list.loadingMore} onLoadMore={list.loadMore} onRetry={list.reload} empty="No requests match." />
      <ReasonDialog
        open={act !== null} onClose={() => setAct(null)}
        title={act?.kind === 'cancel' ? 'Cancel this request?' : act?.kind === 'hide' ? 'Hide this request?' : 'Show this request again?'}
        description={act?.kind === 'cancel' ? 'It can’t be reopened. Accepted and pending players are told.' : act?.kind === 'hide' ? 'It disappears from the feed for everyone except the poster.' : undefined}
        required={act?.kind !== 'unhide'} confirmLabel={act?.kind === 'cancel' ? 'Cancel request' : act?.kind === 'hide' ? 'Hide' : 'Unhide'} destructive={act?.kind !== 'unhide'}
        onConfirm={(reason) => run.mutateAsync({ id: act!.r.id, kind: act!.kind, reason })}
      />
    </div>
  )
}
