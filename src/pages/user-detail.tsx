import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/auth/auth-context'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReasonDialog } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/form'
import { Card } from '@/components/ui/form'
import { Select } from '@/components/ui/select'
import { useAction } from '@/lib/queries'
import { ago, fmtDateTime, humanize } from '@/lib/format'
import { PageHeader } from '@/pages/shared'
import type { UserRow } from '@/pages/users'

interface Detail extends UserRow {
  birthYear: number | null
  authAccounts: Array<{ provider: string }>
  captainRating: { average: number; count: number }
  recruiter: { id: string; type: string; organization: string | null; verifiedBadge: boolean; district?: { nameEn: string } | null } | null
  playerProfile: {
    id: string; location: string; isVisible: boolean; hiddenByAdmin: boolean; verifiedBadge: boolean; avgRating: number; ratingCount: number; noShowCount: number
    sports: Array<{ id: string; sportName: string; positions: string[]; headline: string | null; experienceYears: number | null; avgRating: number; ratingCount: number; hiddenByAdmin: boolean; stats: Record<string, number> | null }>
  } | null
  recentRequests: Array<{ id: string; sport: string; venue: string; matchAt: string; status: string; applicationsCount: number }>
  recentApplications: Array<{ id: string; sport: string; venue: string; status: string; createdAt: string }>
  counts: Record<string, number>
  reportsAgainst: Array<{ id: string; reason: string; status: string; reporterName: string; createdAt: string }>
  auditHistory: Array<{ id: string; action: string; reason: string | null; createdAt: string }>
}

type Dialog = 'suspend' | 'unsuspend' | 'ban' | 'delete' | 'role' | 'credits' | 'reset' | null

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="p-5"><h2 className="mb-3 text-sm font-semibold">{title}</h2>{children}</Card>
)
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>

export default function UserDetailPage() {
  const { id = '' } = useParams()
  const { can } = useAuth()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [days, setDays] = useState('')
  const [role, setRole] = useState<'PLAYER' | 'RECRUITER'>('RECRUITER')
  const [delta, setDelta] = useState('10')

  const { data: u, isPending, error } = useQuery({ queryKey: ['user', id], queryFn: async () => (await api.get<Detail>(`/admin/users/${id}`)).data })
  const refresh = [['user', id], ['paged']]
  const base = `/admin/users/${id}`
  const suspend = useAction((reason: string) => api.post(`${base}/suspend`, { reason }), { success: 'Account suspended', invalidate: refresh })
  const unsuspend = useAction((reason: string) => api.post(`${base}/unsuspend`, reason ? { reason } : {}), { success: 'Suspension lifted', invalidate: refresh })
  const ban = useAction((v: { reason: string; durationDays?: number }) => api.post(`${base}/ban`, v), { success: 'Account banned', invalidate: refresh })
  const del = useAction((reason: string) => api.delete(base, { reason }), { success: 'Account deleted', invalidate: refresh })
  const changeRole = useAction((v: { role: string; reason: string }) => api.put(`${base}/role`, v), { success: 'Role changed', invalidate: refresh })
  const credits = useAction((v: { delta: number; reason: string }) => api.post(`${base}/credits`, v), { success: (r) => `Balance is now ${(r as { data: { balance: number } }).data.balance}`, invalidate: refresh })
  const reset = useAction(() => api.post(`${base}/reset-sessions`), { success: 'Signed out of every device', invalidate: refresh })

  if (isPending) return <div className="grid min-h-[40vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  if (error || !u) return <p className="text-sm text-destructive">{(error as Error | null)?.message ?? 'User not found.'}</p>
  const isAdmin = u.role === 'ADMIN'
  const close = () => setDialog(null)

  return (
    <div className="animate-fade-up space-y-5">
      <Link to="/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All users</Link>
      <PageHeader title={u.name} description={[u.email, u.phone].filter(Boolean).join(' · ') || undefined} />

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Badge tone="primary">{humanize(u.role)}</Badge><StatusBadge status={u.status} />
        {u.isVerified && <Badge tone="success"><BadgeCheck className="h-3 w-3" />Verified</Badge>}
        <span className="text-xs text-muted-foreground">Joined {fmtDateTime(u.createdAt)} · sign-in: {u.authAccounts.map((a) => humanize(a.provider)).join(', ') || '—'}</span>
        {!isAdmin && u.status !== 'DELETED' && (
          <div className="ml-auto flex flex-wrap gap-2">
            {can('users.suspend') && (u.status === 'SUSPENDED' ? <Button variant="outline" size="sm" onClick={() => setDialog('unsuspend')}>Lift suspension</Button> : <Button variant="outline" size="sm" onClick={() => setDialog('suspend')}>Suspend</Button>)}
            {can('users.ban') && <Button variant="outline" size="sm" onClick={() => setDialog('ban')}>Ban</Button>}
            {can('users.reset_sessions') && <Button variant="outline" size="sm" onClick={() => setDialog('reset')}>Sign out everywhere</Button>}
            {can('users.change_role') && <Button variant="outline" size="sm" onClick={() => { setRole(u.role === 'PLAYER' ? 'RECRUITER' : 'PLAYER'); setDialog('role') }}>Change role</Button>}
            {can('credits.grant') && <Button variant="outline" size="sm" onClick={() => setDialog('credits')}>Credits</Button>}
            {can('users.delete') && <Button variant="destructive" size="sm" onClick={() => setDialog('delete')}>Delete</Button>}
          </div>
        )}
        {isAdmin && <p className="ml-auto text-xs text-muted-foreground">Admin accounts can’t be moderated here.</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(u.counts).map(([k, v]) => <Card key={k} className="p-4"><p className="text-2xl font-bold">{v}</p><p className="text-xs text-muted-foreground">{humanize(k.replace(/([A-Z])/g, '_$1'))}</p></Card>)}
      </div>

      {u.recruiter && (
        <Section title="Recruiter">
          <p className="text-sm"><span className="font-medium">{u.recruiter.organization ?? 'Independent'}</span> · {humanize(u.recruiter.type)} {u.recruiter.verifiedBadge ? <Badge tone="success" className="ml-1">Verified</Badge> : <Badge className="ml-1">Not verified</Badge>}</p>
        </Section>
      )}

      {u.playerProfile && (
        <Section title="Player profile">
          <p className="mb-3 text-sm text-muted-foreground">{u.playerProfile.location} · ★ {u.playerProfile.avgRating.toFixed(1)} ({u.playerProfile.ratingCount}) · {u.playerProfile.noShowCount} no-shows {u.playerProfile.hiddenByAdmin && <Badge tone="danger" className="ml-1">Hidden by admin</Badge>}</p>
          <div className="space-y-2">
            {u.playerProfile.sports.map((s) => (
              <div key={s.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{s.sportName} <span className="font-normal text-muted-foreground">· {s.positions.join(', ')}{s.experienceYears != null ? ` · ${s.experienceYears} yrs` : ''}</span> {s.hiddenByAdmin && <Badge tone="danger">Hidden</Badge>}</p>
                {s.headline && <p className="text-muted-foreground">{s.headline}</p>}
                {s.stats && <p className="mt-1 text-xs text-muted-foreground">{Object.entries(s.stats).map(([k, v]) => `${humanize(k.replace(/([A-Z])/g, '_$1'))}: ${v}`).join(' · ')}</p>}
              </div>
            ))}
            {u.playerProfile.sports.length === 0 && <Empty>No sport profiles yet.</Empty>}
          </div>
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Recent requests">
          {u.recentRequests.length === 0 ? <Empty>None.</Empty> : <ul className="divide-y text-sm">{u.recentRequests.map((r) => <li key={r.id} className="flex items-center justify-between gap-2 py-2"><span>{r.sport} · {r.venue}<span className="block text-xs text-muted-foreground">{fmtDateTime(r.matchAt)} · {r.applicationsCount} applied</span></span><StatusBadge status={r.status} /></li>)}</ul>}
        </Section>
        <Section title="Recent applications">
          {u.recentApplications.length === 0 ? <Empty>None.</Empty> : <ul className="divide-y text-sm">{u.recentApplications.map((a) => <li key={a.id} className="flex items-center justify-between gap-2 py-2"><span>{a.sport} · {a.venue}<span className="block text-xs text-muted-foreground">{ago(a.createdAt)}</span></span><StatusBadge status={a.status} /></li>)}</ul>}
        </Section>
        <Section title="Reports against this account">
          {u.reportsAgainst.length === 0 ? <Empty>None.</Empty> : <ul className="divide-y text-sm">{u.reportsAgainst.map((r) => <li key={r.id} className="flex items-center justify-between gap-2 py-2"><span>{humanize(r.reason)}<span className="block text-xs text-muted-foreground">by {r.reporterName} · {ago(r.createdAt)}</span></span><StatusBadge status={r.status} /></li>)}</ul>}
        </Section>
        <Section title="Admin history">
          {u.auditHistory.length === 0 ? <Empty>No admin actions on this account.</Empty> : <ul className="divide-y text-sm">{u.auditHistory.map((a) => <li key={a.id} className="py-2"><span className="font-medium">{humanize(a.action)}</span> <span className="text-xs text-muted-foreground">· {ago(a.createdAt)}</span>{a.reason && <span className="block text-xs text-muted-foreground">{a.reason}</span>}</li>)}</ul>}
        </Section>
      </div>

      <ReasonDialog open={dialog === 'suspend'} onClose={close} title={`Suspend ${u.name}?`} description="They're signed out and can't sign back in. Their upcoming requests are cancelled and the people affected are told." confirmLabel="Suspend" destructive onConfirm={(reason) => suspend.mutateAsync(reason)} />
      <ReasonDialog open={dialog === 'unsuspend'} onClose={close} title={`Lift ${u.name}'s suspension?`} required={false} confirmLabel="Lift suspension" onConfirm={(reason) => unsuspend.mutateAsync(reason)} />
      <ReasonDialog
        open={dialog === 'ban'} onClose={close} title={`Ban ${u.name}?`} description="Stronger than a suspension. Leave the duration empty for a permanent ban." confirmLabel="Ban" destructive
        extra={<div><Label htmlFor="days">Duration in days (optional)</Label><Input id="days" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} className="mt-1" /></div>}
        onConfirm={(reason) => ban.mutateAsync({ reason, durationDays: days ? Number(days) : undefined })}
      />
      <ReasonDialog open={dialog === 'delete'} onClose={close} title={`Delete ${u.name}?`} description="Anonymises the account and removes it from the app. This can't be undone." confirmLabel="Delete account" destructive onConfirm={(reason) => del.mutateAsync(reason)} />
      <ReasonDialog open={dialog === 'reset'} onClose={close} title={`Sign ${u.name} out everywhere?`} description="Every device is signed out; they can sign back in." required={false} confirmLabel="Sign out" onConfirm={() => reset.mutateAsync(undefined)} />
      <ReasonDialog
        open={dialog === 'role'} onClose={close} title="Change role" description="Switch between player and recruiter. Their data is kept; a player switched to recruiter drops out of search." confirmLabel="Change role"
        extra={<div><Label htmlFor="role">New role</Label><Select id="role" value={role} onChange={(e) => setRole(e.target.value as 'PLAYER' | 'RECRUITER')} className="mt-1 w-full"><option value="PLAYER">Player</option><option value="RECRUITER">Recruiter</option></Select></div>}
        onConfirm={(reason) => changeRole.mutateAsync({ role, reason })}
      />
      <ReasonDialog
        open={dialog === 'credits'} onClose={close} title="Add or remove credits" description="Positive adds credits (support, promotions); negative takes them back. A balance can't go below zero." confirmLabel="Apply"
        extra={<div><Label htmlFor="delta">Amount</Label><Input id="delta" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} className="mt-1" /></div>}
        onConfirm={(reason) => credits.mutateAsync({ delta: Number(delta), reason })}
      />
    </div>
  )
}
