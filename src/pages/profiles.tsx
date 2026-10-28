import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterSelect, SearchBox, Toolbar } from '@/components/data/filters'
import { PagedTable, type Column } from '@/components/data/paged-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReasonDialog } from '@/components/ui/dialog'
import { useAuth } from '@/auth/auth-context'
import { api } from '@/lib/api'
import { useAction, usePaged } from '@/lib/queries'
import { humanize } from '@/lib/format'
import { useSports } from '@/lib/sports'
import { PageHeader } from '@/pages/shared'

interface SportProfile {
  id: string; profileId: string
  player: { id: string; name: string; email: string | null; status: string }
  location: string; sport: { id: number; nameEn: string }; positions: string[]; headline: string | null; experienceYears: number | null
  stats: Record<string, number> | null; rating: { average: number; count: number }; achievementsCount: number; hiddenByAdmin: boolean; isVisible: boolean
}
export default function ProfilesPage() {
  const { can } = useAuth()
  const sports = useSports().data ?? []
  const [f, setF] = useState({ q: '', sportId: '', hidden: '', khep: '' })
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const [target, setTarget] = useState<{ row: SportProfile; hide: boolean } | null>(null)
  const list = usePaged<SportProfile>('/admin/sport-profiles', { q: f.q || undefined, sportId: f.sportId || undefined, hidden: f.hidden || undefined, khep: f.khep || undefined })
  const hide = useAction((v: { id: string; reason: string }) => api.post(`/admin/sport-profiles/${v.id}/hide`, { reason: v.reason }), { success: 'Sport profile hidden' })
  const unhide = useAction((v: { id: string; reason: string }) => api.post(`/admin/sport-profiles/${v.id}/unhide`, v.reason ? { reason: v.reason } : {}), { success: 'Sport profile visible again' })

  const columns: Column<SportProfile>[] = [
    { header: 'Player', cell: (s) => <div><Link to={`/users/${s.player.id}`} className="font-medium hover:underline">{s.player.name}</Link><p className="text-xs text-muted-foreground">{s.location}</p></div> },
    { header: 'Sport profile', cell: (s) => <div><p className="font-medium">{s.sport.nameEn} <span className="font-normal text-muted-foreground">· {s.positions.join(', ')}</span></p>{s.headline && <p className="max-w-xs truncate text-xs text-muted-foreground">{s.headline}</p>}</div> },
    { header: 'Record', cell: (s) => <span className="text-xs text-muted-foreground">★ {s.rating.average.toFixed(1)} ({s.rating.count}){s.experienceYears != null ? ` · ${s.experienceYears} yrs` : ''}{s.achievementsCount ? ` · ${s.achievementsCount} achievements` : ''}{s.stats ? <><br />{Object.entries(s.stats).map(([k, v]) => `${humanize(k.replace(/([A-Z])/g, '_$1'))} ${v}`).join(' · ')}</> : null}</span> },
    { header: 'Visibility', cell: (s) => (s.hiddenByAdmin ? <Badge tone="danger">Hidden by admin</Badge> : !s.isVisible ? <Badge tone="warning">Hidden by player</Badge> : <Badge tone="success">Visible</Badge>) },
    { header: '', className: 'text-right', cell: (s) => can('profiles.moderate') && <Button variant="outline" size="sm" onClick={() => setTarget({ row: s, hide: !s.hiddenByAdmin })}>{s.hiddenByAdmin ? 'Unhide' : 'Hide'}</Button> },
  ]
  return (
    <div className="animate-fade-up">
      <PageHeader title="Sport profiles" description="One per sport per player. Hiding one removes only that sport profile from search; the player can’t undo it." />
      <Toolbar>
        <SearchBox value={f.q} onChange={set('q')} placeholder="Player name, email or phone" />
        <FilterSelect label="Sport" value={f.sportId} onChange={set('sportId')} options={[['', 'All sports'], ...sports.map((s): [string, string] => [String(s.id), s.nameEn])]} />
        <FilterSelect label="Visibility" value={f.hidden} onChange={set('hidden')} options={[['', 'Hidden or not'], ['true', 'Hidden by admin'], ['false', 'Not hidden']]} />
        <FilterSelect label="Paid matches" value={f.khep} onChange={set('khep')} options={[['', 'Any'], ['true', 'Open to paid matches'], ['false', 'Free only']]} />
      </Toolbar>
      <PagedTable columns={columns} items={list.items} loading={list.loading} fetching={list.fetching} error={list.error} hasMore={!!list.hasMore} loadingMore={list.loadingMore} onLoadMore={list.loadMore} onRetry={list.reload} empty="No sport profiles match." />
      <ReasonDialog
        open={target !== null} onClose={() => setTarget(null)}
        title={target?.hide ? `Hide ${target.row.player.name}'s ${target.row.sport.nameEn} profile?` : 'Make this sport profile visible again?'}
        required={target?.hide ?? true} confirmLabel={target?.hide ? 'Hide' : 'Unhide'} destructive={target?.hide}
        onConfirm={(reason) => (target!.hide ? hide.mutateAsync({ id: target!.row.id, reason }) : unhide.mutateAsync({ id: target!.row.id, reason }))}
      />
    </div>
  )
}
