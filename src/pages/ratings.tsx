import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterSelect, Toolbar } from '@/components/data/filters'
import { PagedTable, type Column } from '@/components/data/paged-table'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReasonDialog } from '@/components/ui/dialog'
import { Card } from '@/components/ui/form'
import { api } from '@/lib/api'
import { useAction, usePaged } from '@/lib/queries'
import { ago, fmtNumber } from '@/lib/format'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/pages/shared'

interface Dispute {
  id: string; status: 'OPEN' | 'UPHELD' | 'REMOVED'; reason: string; adminNote: string | null; createdAt: string; resolvedAt: string | null
  rating: { id: string; requestId: string; noShow: boolean; overall: number | null; comment: string | null; rater: { id: string; name: string }; ratee: { id: string; name: string } }
}
interface Flagged { organiserId: string; name: string; games: number; marked: number; noShows: number }

function Disputes() {
  const [status, setStatus] = useState('OPEN')
  const [pick, setPick] = useState<{ d: Dispute; decision: 'UPHOLD' | 'REMOVE' } | null>(null)
  const list = usePaged<Dispute>('/admin/ratings/disputes', { status: status === 'ALL' ? undefined : status })
  const resolve = useAction((v: { id: string; decision: 'UPHOLD' | 'REMOVE'; note: string }) => api.post(`/admin/ratings/disputes/${v.id}/resolve`, { decision: v.decision, note: v.note }), { success: 'Dispute resolved — both people were told', invalidate: [['paged']] })

  const columns: Column<Dispute>[] = [
    { header: 'What was disputed', cell: (d) => <div><p className="font-medium">{d.rating.noShow ? 'No-show strike' : `Review (${d.rating.overall?.toFixed(1)}★)`}</p>{d.rating.comment && <p className="max-w-xs text-xs text-muted-foreground">“{d.rating.comment}”</p>}<p className="text-xs text-muted-foreground">{ago(d.createdAt)}</p></div> },
    { header: 'People', cell: (d) => <div className="text-sm"><p>Given by <Link className="hover:underline" to={`/users/${d.rating.rater.id}`}>{d.rating.rater.name}</Link></p><p>To <Link className="hover:underline" to={`/users/${d.rating.ratee.id}`}>{d.rating.ratee.name}</Link></p></div> },
    { header: 'Their reason', cell: (d) => <p className="max-w-sm text-sm">{d.reason}</p> },
    { header: 'Status', cell: (d) => <div><StatusBadge status={d.status} />{d.adminNote && <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground">{d.adminNote}</p>}</div> },
    { header: '', className: 'text-right', cell: (d) => d.status === 'OPEN' && <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setPick({ d, decision: 'UPHOLD' })}>Keep it</Button><Button size="sm" onClick={() => setPick({ d, decision: 'REMOVE' })}>Remove it</Button></div> },
  ]
  return (
    <>
      <Toolbar>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[['OPEN', 'Waiting for me'], ['UPHELD', 'Kept'], ['REMOVED', 'Removed'], ['ALL', 'All']]} />
      </Toolbar>
      <PagedTable columns={columns} items={list.items} loading={list.loading} fetching={list.fetching} error={list.error} hasMore={!!list.hasMore} loadingMore={list.loadingMore} onLoadMore={list.loadMore} onRetry={list.reload} empty={status === 'OPEN' ? 'No disputes are waiting.' : 'Nothing here.'} />
      <ReasonDialog
        open={pick !== null} onClose={() => setPick(null)} destructive={pick?.decision === 'REMOVE'}
        title={pick?.decision === 'REMOVE' ? 'Remove this review or strike?' : 'Keep this review or strike?'}
        description={pick?.decision === 'REMOVE' ? 'It is hidden and every average and strike count is recomputed.' : 'The dispute is closed and the strike counts again.'}
        confirmLabel={pick?.decision === 'REMOVE' ? 'Remove' : 'Keep'} label="Reason (kept in the audit log)"
        onConfirm={async (note) => { if (pick) await resolve.mutateAsync({ id: pick.d.id, decision: pick.decision, note }); setPick(null) }}
      />
    </>
  )
}

function FlaggedOrganisers() {
  const q = useQuery({ queryKey: ['flagged-organisers'], queryFn: async () => (await api.get<Flagged[]>('/admin/ratings/flagged-organisers')).data })
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Organisers marking most players absent</h2>
      <p className="mb-3 text-xs text-muted-foreground">More than half of the players they marked, across at least 3 games. Worth a look before the strikes are trusted.</p>
      {q.isPending ? <p className="text-sm text-muted-foreground">Loading…</p> : q.error ? <p className="text-sm text-destructive">Couldn’t load this list.</p> : (q.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No organiser is flagged.</p> : (
        <ul className="space-y-2 text-sm">
          {q.data!.map((o) => <li key={o.organiserId} className="flex justify-between"><Link className="font-medium hover:underline" to={`/users/${o.organiserId}`}>{o.name}</Link><span className="text-muted-foreground">{fmtNumber(o.noShows)} of {fmtNumber(o.marked)} marked absent · {fmtNumber(o.games)} games</span></li>)}
        </ul>
      )}
    </Card>
  )
}

export default function RatingsPage() {
  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader title="Ratings" description="Disputes about reviews and no-shows. Reviews are double-blind and stay hidden for 7 days or until both sides rate." />
      <Disputes />
      <FlaggedOrganisers />
    </div>
  )
}
