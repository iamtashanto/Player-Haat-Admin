import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BadgeCheck, CreditCard, Flag, Loader2, UserPlus, Users, type LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/auth/auth-context'
import { Card } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/badge'
import { ago, fmtNumber, humanize } from '@/lib/format'
import { PageHeader } from '@/pages/shared'

interface Stats {
  summary: {
    users: { total: number; byRole: Record<string, number>; signupsToday: number; signupsLast7Days: number; signupsLast30Days: number }
    players: { totalProfiles: number; verifiedProfiles: number; hiddenByAdmin: number }
    recruiters: { totalProfiles: number; verifiedProfiles: number }
    requests: { total: number; byStatus: Record<string, number> }
    applications: { total: number; byStatus: Record<string, number> }
    moderation: { openReports: number; actionsLast24h: number; pendingVerifications: number; pendingPayments: number }
  }
  charts: {
    signupsTrend: Array<{ date: string; total: number; players: number; recruiters: number }>
    activityTrend: Array<{ date: string; requests: number; applications: number }>
    sportsDistribution: Array<{ sportId: number; nameEn: string; count: number }>
    topDistricts: Array<{ id: number; nameEn: string; players: number; recruiters: number; requests: number }>
  }
  recentActivity: {
    recentActions: Array<{ id: string; action: string; targetType: string; reason: string | null; createdAt: string }>
    recentSignups: Array<{ id: string; name: string; email: string | null; role: string; createdAt: string }>
    recentReports: Array<{ id: string; targetType: string; reason: string; reporter: string; createdAt: string }>
  }
}

/** A hand-drawn trend line: no chart library for one small picture. */
function Trend({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values)
  const w = 240
  const h = 56
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - 4 - (v / max) * (h - 8)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" role="img" aria-label={label}>
      <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Tile({ icon: Icon, label, value, to, attention }: { icon: LucideIcon; label: string; value: number | string; to?: string; attention?: boolean }) {
  const body = (
    <Card className={`flex items-center gap-4 p-4 transition-shadow ${to ? 'hover:shadow-md' : ''} ${attention ? 'ring-2 ring-primary/40' : ''}`}>
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${attention ? 'bg-primary text-primary-foreground' : 'bg-accent text-primary'}`}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-2xl font-bold leading-none">{typeof value === 'number' ? fmtNumber(value) : value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
  return to ? <Link to={to} className="block">{body}</Link> : body
}

export function DashboardHome() {
  const { user, can } = useAuth()
  const { data, isPending, error } = useQuery({ queryKey: ['stats'], queryFn: async () => (await api.get<Stats>('/admin/stats')).data, refetchInterval: 60_000 })

  if (isPending) return <div className="grid min-h-[40vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  if (error || !data) return <p className="text-sm text-destructive">Couldn’t load the overview. {(error as Error | null)?.message}</p>
  const { summary: s, charts: c, recentActivity: r } = data
  const waiting = s.moderation.pendingVerifications + s.moderation.pendingPayments + s.moderation.openReports

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader title={`Welcome back, ${user?.name.split(' ')[0] ?? 'admin'}`} description={waiting > 0 ? `${waiting} item${waiting === 1 ? '' : 's'} waiting for a person.` : 'Nothing is waiting for review.'} />

      <section aria-label="Waiting for review" className="grid gap-3 sm:grid-cols-3">
        {can('verifications.review') && <Tile icon={BadgeCheck} label="Verifications to review" value={s.moderation.pendingVerifications} to="/verifications" attention={s.moderation.pendingVerifications > 0} />}
        {can('payments.review') && <Tile icon={CreditCard} label="Payments to confirm" value={s.moderation.pendingPayments} to="/payments" attention={s.moderation.pendingPayments > 0} />}
        {can('reports.view') && <Tile icon={Flag} label="Open reports" value={s.moderation.openReports} to="/reports" attention={s.moderation.openReports > 0} />}
      </section>

      <section aria-label="Platform" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={Users} label={`Accounts (${fmtNumber(s.users.byRole.PLAYER ?? 0)} players · ${fmtNumber(s.users.byRole.RECRUITER ?? 0)} recruiters)`} value={s.users.total} to="/users" />
        <Tile icon={UserPlus} label="Sign-ups, last 7 days" value={s.users.signupsLast7Days} />
        <Tile icon={BadgeCheck} label={`Verified players (of ${fmtNumber(s.players.totalProfiles)})`} value={s.players.verifiedProfiles} />
        <Tile icon={BadgeCheck} label={`Verified recruiters (of ${fmtNumber(s.recruiters.totalProfiles)})`} value={s.recruiters.verifiedProfiles} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Sign-ups, last 30 days</h2>
          <Trend values={c.signupsTrend.map((d) => d.total)} label="Sign-ups per day" />
          <p className="text-xs text-muted-foreground">{fmtNumber(s.users.signupsLast30Days)} new accounts · {fmtNumber(s.users.signupsToday)} today</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Requests and applications</h2>
          <Trend values={c.activityTrend.map((d) => d.requests + d.applications)} label="Requests and applications per day" />
          <p className="text-xs text-muted-foreground">{fmtNumber(s.requests.total)} requests · {fmtNumber(s.applications.total)} applications · {fmtNumber(s.requests.byStatus.OPEN ?? 0)} open now</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Sport profiles by sport</h2>
          <ul className="space-y-2 text-sm">
            {c.sportsDistribution.length === 0 && <li className="text-muted-foreground">None yet.</li>}
            {c.sportsDistribution.map((d) => (
              <li key={d.sportId} className="flex justify-between"><span>{d.nameEn}</span><span className="font-medium">{fmtNumber(d.count)}</span></li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Busiest districts</h2>
          <ul className="space-y-2 text-sm">
            {c.topDistricts.slice(0, 6).map((d) => (
              <li key={d.id} className="flex justify-between"><span>{d.nameEn}</span><span className="text-muted-foreground">{d.players} players · {d.requests} requests</span></li>
            ))}
            {c.topDistricts.length === 0 && <li className="text-muted-foreground">None yet.</li>}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">New accounts</h2>
          <ul className="space-y-2 text-sm">
            {r.recentSignups.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2">
                <Link to={`/users/${u.id}`} className="truncate font-medium hover:underline">{u.name}</Link>
                <span className="shrink-0 text-xs text-muted-foreground">{humanize(u.role)} · {ago(u.createdAt)}</span>
              </li>
            ))}
            {r.recentSignups.length === 0 && <li className="text-muted-foreground">None yet.</li>}
          </ul>
        </Card>
      </section>

      {can('audit.view') && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Recent admin activity</h2><Link to="/audit" className="text-xs text-primary hover:underline">See all</Link></div>
          <ul className="divide-y text-sm">
            {r.recentActions.length === 0 && <li className="py-2 text-muted-foreground">No actions yet.</li>}
            {r.recentActions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><StatusBadge status="ACTIVE" /> <span className="ml-1 font-medium">{humanize(a.action)}</span> <span className="text-muted-foreground">on {humanize(a.targetType)}{a.reason ? ` — ${a.reason}` : ''}</span></span>
                <span className="text-xs text-muted-foreground">{ago(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
