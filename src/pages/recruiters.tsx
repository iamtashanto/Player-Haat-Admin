import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { FilterSelect, SearchBox, Toolbar } from '@/components/data/filters'
import { PagedTable, type Column } from '@/components/data/paged-table'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/auth-context'
import { api } from '@/lib/api'
import { useAction, usePaged } from '@/lib/queries'
import { humanize } from '@/lib/format'
import { PageHeader } from '@/pages/shared'

interface Recruiter { id: string; user: { id: string; name: string; email: string | null; status: string }; type: string; organization: string | null; district: string; sportIds: number[]; verifiedBadge: boolean }

export default function RecruitersPage() {
  const { can } = useAuth()
  const [f, setF] = useState({ q: '', verified: '' })
  const list = usePaged<Recruiter>('/admin/recruiters', { q: f.q || undefined, verified: f.verified || undefined })
  const verify = useAction((v: { id: string; verified: boolean }) => api.post(`/admin/recruiters/${v.id}/verify`, { verified: v.verified }), { success: 'Updated' })
  const columns: Column<Recruiter>[] = [
    { header: 'Recruiter', cell: (r) => <div><Link to={`/users/${r.user.id}`} className="font-medium hover:underline">{r.user.name}</Link><p className="text-xs text-muted-foreground">{r.user.email ?? '—'}</p></div> },
    { header: 'Organisation', cell: (r) => <div><p>{r.organization ?? 'Independent'}</p><p className="text-xs text-muted-foreground">{humanize(r.type)} · {r.district}</p></div> },
    { header: 'Account', cell: (r) => <StatusBadge status={r.user.status} /> },
    { header: 'Badge', cell: (r) => (r.verifiedBadge ? <Badge tone="success"><BadgeCheck className="h-3 w-3" />Verified</Badge> : <Badge>Not verified</Badge>) },
    { header: '', className: 'text-right', cell: (r) => can('verifications.review') && <Button variant="outline" size="sm" disabled={verify.isPending} onClick={() => verify.mutate({ id: r.id, verified: !r.verifiedBadge })}>{r.verifiedBadge ? 'Remove badge' : 'Verify'}</Button> },
  ]
  return (
    <div className="animate-fade-up">
      <PageHeader title="Recruiters" description="Anyone who recruits players. The usual route to a badge is a verification request; this is the manual override." />
      <Toolbar>
        <SearchBox value={f.q} onChange={(v) => setF((p) => ({ ...p, q: v }))} placeholder="Name, email or organisation" />
        <FilterSelect label="Verified" value={f.verified} onChange={(v) => setF((p) => ({ ...p, verified: v }))} options={[['', 'Verified or not'], ['true', 'Verified'], ['false', 'Not verified']]} />
      </Toolbar>
      <PagedTable columns={columns} items={list.items} loading={list.loading} fetching={list.fetching} error={list.error} hasMore={!!list.hasMore} loadingMore={list.loadingMore} onLoadMore={list.loadMore} onRetry={list.reload} empty="No recruiters match." />
    </div>
  )
}
