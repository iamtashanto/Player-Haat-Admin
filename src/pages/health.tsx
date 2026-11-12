import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/form'
import { FilterSelect, Toolbar } from '@/components/data/filters'
import { ago, fmtNumber, humanize } from '@/lib/format'
import { PageHeader } from '@/pages/shared'

interface ErrorGroup { fingerprint: string; name: string; message: string | null; route: string | null; count: number; sessions: number; platforms: string[]; firstSeen: string; lastSeen: string; stack: string | null }
interface Summary {
  days: number
  enabled: boolean
  sessions: number
  platforms: { platform: string; sessions: number }[]
  errors: ErrorGroup[]
  funnel: { name: string; count: number; sessions: number }[]
}

/** Crash reports and the sign-up funnel, from the first-party telemetry the web and the app send (no account ids, no IPs). */
export default function HealthPage() {
  const [days, setDays] = useState('7')
  const q = useQuery({ queryKey: ['telemetry', days], queryFn: async () => (await api.get<Summary>('/admin/telemetry/summary', { days: Number(days) })).data })
  const s = q.data
  const first = s?.funnel[0]?.sessions ?? 0

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader title="App health" description="Errors people ran into and how far they get, from anonymous reports the website and the app send. No names, emails, phone numbers, account ids or IP addresses are stored, and reports are deleted after 90 days." />
      <Toolbar>
        <FilterSelect label="Period" value={days} onChange={setDays} options={[['1', 'Last 24 hours'], ['7', 'Last 7 days'], ['14', 'Last 14 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']]} />
      </Toolbar>

      {q.isPending ? <div className="grid min-h-[30vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : q.error || !s ? <p className="text-sm text-destructive">Couldn’t load this report.</p> : (
        <>
          {!s.enabled && <p role="alert" className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">Telemetry is switched off on the server (TELEMETRY_ENABLED=false), so nothing new is being collected.</p>}
          <section aria-label="Sessions" className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4"><p className="text-xs text-muted-foreground">Sessions</p><p className="mt-1 text-2xl font-bold tabular-nums">{fmtNumber(s.sessions)}</p></Card>
            {s.platforms.map((p) => <Card key={p.platform} className="p-4"><p className="text-xs text-muted-foreground">{humanize(p.platform)}</p><p className="mt-1 text-2xl font-bold tabular-nums">{fmtNumber(p.sessions)}</p></Card>)}
          </section>

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Funnel</h2>
            <p className="mb-3 text-xs text-muted-foreground">People (sessions) reaching each step. The bar is the share of those who started.</p>
            {s.funnel.length === 0 ? <p className="text-sm text-muted-foreground">No events yet for this period.</p> : (
              <ul className="space-y-2.5">
                {s.funnel.map((f) => {
                  const pct = first > 0 ? Math.min(100, Math.round((f.sessions / first) * 100)) : 0
                  return (
                    <li key={f.name}>
                      <div className="flex items-baseline justify-between text-sm"><span>{humanize(f.name)}</span><span className="tabular-nums text-muted-foreground">{fmtNumber(f.sessions)} people · {fmtNumber(f.count)} times{first > 0 ? ` · ${pct}%` : ''}</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Errors, most frequent first</h2>
            {s.errors.length === 0 ? <p className="text-sm text-muted-foreground">No errors reported in this period.</p> : (
              <ul className="divide-y">
                {s.errors.map((e) => (
                  <li key={e.fingerprint} className="py-3">
                    <details>
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="danger">{e.count}×</Badge>
                          <span className="font-mono text-xs text-muted-foreground">{e.name}</span>
                          {e.platforms.map((p) => <Badge key={p}>{humanize(p)}</Badge>)}
                          <span className="text-xs text-muted-foreground">{e.sessions} {e.sessions === 1 ? 'person' : 'people'} · last {ago(e.lastSeen)}</span>
                        </div>
                        <p className="mt-1 break-words text-sm">{e.message ?? 'No message'}</p>
                        {e.route && <p className="font-mono text-[11px] text-muted-foreground">{e.route}</p>}
                      </summary>
                      {e.stack && <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-muted p-3 font-mono text-[11px]">{e.stack}</pre>}
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
