import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Loader2 } from 'lucide-react'
import { FilterSelect, Toolbar } from '@/components/data/filters'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReasonDialog } from '@/components/ui/dialog'
import { Card } from '@/components/ui/form'
import { useAuth } from '@/auth/auth-context'
import { api } from '@/lib/api'
import { useAction, usePaged } from '@/lib/queries'
import { ago, fmtDateTime, humanize } from '@/lib/format'
import { PageHeader } from '@/pages/shared'

interface Verification {
  id: string; kind: 'RECRUITER' | 'PLAYER_STATS'; status: string; note: string | null; evidenceLinks: string[]; evidenceImages: Array<{ url: string }>; reviewNote: string | null
  createdAt: string; reviewedAt: string | null
  submitter: { id: string; name: string; email: string | null; phone: string | null }
  recruiter: { id: string; type: string; organization: string | null; bio: string | null; verifiedBadge: boolean } | null
  playerSport: { id: string; sportName: string; playerName: string; stats: Record<string, number> | null; experienceYears: number | null; currentTeam: string | null } | null
}

/** Links come from users, so only https ones are made clickable, and always without sending a referrer. */
const SafeLink = ({ href }: { href: string }) => {
  const ok = /^https:\/\//i.test(href)
  return ok ? <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 break-all text-primary hover:underline">{href}<ExternalLink className="h-3 w-3 shrink-0" /></a> : <span className="break-all text-muted-foreground">{href}</span>
}

export default function VerificationsPage() {
  const { can } = useAuth()
  const [status, setStatus] = useState('PENDING')
  const [kind, setKind] = useState('')
  const [decision, setDecision] = useState<{ v: Verification; approve: boolean } | null>(null)
  const list = usePaged<Verification>('/admin/verifications', { status, kind: kind || undefined }, 15)
  const review = useAction((v: { id: string; approve: boolean; note?: string }) => api.post(`/admin/verifications/${v.id}/review`, { approve: v.approve, ...(v.note ? { note: v.note } : {}) }), { success: (r) => ((r as { data: { status: string } }).data.status === 'APPROVED' ? 'Approved — the badge is live' : 'Rejected — they were told why'), invalidate: [['paged'], ['stats']] })

  return (
    <div className="animate-fade-up">
      <PageHeader title="Verifications" description="Recruiters proving who they are, and players proving the stats on a sport profile. Approving adds the badge people see; rejecting needs a reason the person can read." />
      <Toolbar>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[['PENDING', 'Waiting for review'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'], ['ALL', 'All']]} />
        <FilterSelect label="Kind" value={kind} onChange={setKind} options={[['', 'Recruiters and stats'], ['RECRUITER', 'Recruiters'], ['PLAYER_STATS', 'Player stats']]} />
      </Toolbar>

      {list.loading && <div className="grid place-items-center p-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
      {list.error && <p className="text-sm text-destructive">{list.error.message}</p>}
      {!list.loading && !list.error && list.items.length === 0 && <Card className="p-10 text-center text-sm text-muted-foreground">{status === 'PENDING' ? 'Nothing to review. 🎉' : 'Nothing here.'}</Card>}

      <div className="space-y-3">
        {list.items.map((v) => (
          <Card key={v.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{v.kind === 'RECRUITER' ? 'Recruiter' : 'Player stats'}</Badge><StatusBadge status={v.status} />
                  <span className="text-xs text-muted-foreground">{ago(v.createdAt)}</span>
                </div>
                <p className="mt-2 font-semibold"><Link to={`/users/${v.submitter.id}`} className="hover:underline">{v.submitter.name}</Link> <span className="font-normal text-muted-foreground">{v.submitter.email ?? v.submitter.phone}</span></p>
              </div>
              {v.status === 'PENDING' && can('verifications.review') && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDecision({ v, approve: false })}>Reject</Button>
                  <Button size="sm" onClick={() => setDecision({ v, approve: true })}>Approve</Button>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Vouching for</p>
                {v.recruiter && <p><span className="font-medium">{v.recruiter.organization ?? 'Independent'}</span> · {humanize(v.recruiter.type)}{v.recruiter.bio && <span className="mt-1 block text-muted-foreground">{v.recruiter.bio}</span>}</p>}
                {v.playerSport && (
                  <p>
                    <span className="font-medium">{v.playerSport.playerName}</span> · {v.playerSport.sportName}{v.playerSport.currentTeam ? ` · ${v.playerSport.currentTeam}` : ''}{v.playerSport.experienceYears != null ? ` · ${v.playerSport.experienceYears} yrs` : ''}
                    <span className="mt-1 block text-muted-foreground">{v.playerSport.stats ? Object.entries(v.playerSport.stats).map(([k, n]) => `${humanize(k.replace(/([A-Z])/g, '_$1'))}: ${n}`).join(' · ') : 'No stats on the profile'}</span>
                  </p>
                )}
                {v.note && <p className="mt-2 rounded-lg bg-muted p-2 text-muted-foreground">“{v.note}”</p>}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidence</p>
                <ul className="space-y-1">{v.evidenceLinks.map((l) => <li key={l}><SafeLink href={l} /></li>)}</ul>
                {v.evidenceImages.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {v.evidenceImages.map((img) => (
                      <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer"><img src={img.url} alt="Submitted document" loading="lazy" className="h-20 w-20 rounded-lg border object-cover hover:opacity-80" /></a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {v.status !== 'PENDING' && <p className="mt-3 text-xs text-muted-foreground">Decided {fmtDateTime(v.reviewedAt)}{v.reviewNote ? ` — ${v.reviewNote}` : ''}</p>}
          </Card>
        ))}
      </div>
      {list.hasMore && <div className="mt-4 text-center"><Button variant="ghost" size="sm" onClick={list.loadMore} disabled={list.loadingMore}>Load more</Button></div>}

      <ReasonDialog
        open={decision !== null} onClose={() => setDecision(null)}
        title={decision?.approve ? 'Approve this verification?' : 'Reject this verification?'}
        description={decision?.approve ? 'They get the badge straight away and are told.' : 'They’re told it wasn’t approved, and see your reason, so make it useful.'}
        required={!decision?.approve} label={decision?.approve ? 'Note' : 'Why it wasn’t approved'} confirmLabel={decision?.approve ? 'Approve' : 'Reject'} destructive={!decision?.approve}
        onConfirm={(note) => review.mutateAsync({ id: decision!.v.id, approve: decision!.approve, note })}
      />
    </div>
  )
}
