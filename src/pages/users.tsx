import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { FilterSelect, SearchBox, Toolbar } from '@/components/data/filters'
import { PagedTable, type Column } from '@/components/data/paged-table'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { usePaged } from '@/lib/queries'
import { ago, humanize } from '@/lib/format'
import { PageHeader } from '@/pages/shared'

export interface UserRow {
  id: string; name: string; email: string | null; phone: string | null; status: string; role: string
  isVerified: boolean; emailVerified: boolean; createdAt: string
}

export default function UsersPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ q: params.get('q') ?? '', role: '', status: '', verified: '' })
  const set = (k: keyof typeof filters) => (v: string) => { setFilters((f) => ({ ...f, [k]: v })); if (k === 'q') setParams(v ? { q: v } : {}) }

  const list = usePaged<UserRow>('/admin/users', { q: filters.q || undefined, role: filters.role || undefined, status: filters.status || undefined, verified: filters.verified || undefined })
  const columns: Column<UserRow>[] = [
    { header: 'Account', cell: (u) => <div><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email ?? u.phone ?? '—'}</p></div> },
    { header: 'Role', cell: (u) => <Badge tone={u.role === 'ADMIN' ? 'primary' : 'neutral'}>{humanize(u.role)}</Badge> },
    { header: 'Status', cell: (u) => <StatusBadge status={u.status} /> },
    { header: 'Verified', cell: (u) => (u.isVerified ? <BadgeCheck className="h-4 w-4 text-success" aria-label="Verified" /> : <span className="text-muted-foreground">—</span>) },
    { header: 'Joined', cell: (u) => <span className="text-muted-foreground">{ago(u.createdAt)}</span> },
  ]
  return (
    <div className="animate-fade-up">
      <PageHeader title="Users" description="Every account, players and recruiters. Open one to moderate it." />
      <Toolbar>
        <SearchBox value={filters.q} onChange={set('q')} placeholder="Name, email or phone" />
        <FilterSelect label="Role" value={filters.role} onChange={set('role')} options={[['', 'All roles'], ['PLAYER', 'Players'], ['RECRUITER', 'Recruiters'], ['ADMIN', 'Admins']]} />
        <FilterSelect label="Status" value={filters.status} onChange={set('status')} options={[['', 'Any status'], ['ACTIVE', 'Active'], ['SUSPENDED', 'Suspended'], ['DELETED', 'Deleted']]} />
        <FilterSelect label="Verified" value={filters.verified} onChange={set('verified')} options={[['', 'Verified or not'], ['true', 'Verified'], ['false', 'Not verified']]} />
      </Toolbar>
      <PagedTable columns={columns} items={list.items} loading={list.loading} fetching={list.fetching} error={list.error} hasMore={!!list.hasMore} loadingMore={list.loadingMore} onLoadMore={list.loadMore} onRetry={list.reload} onRowClick={(u) => navigate(`/users/${u.id}`)} empty="No accounts match." />
    </div>
  )
}
