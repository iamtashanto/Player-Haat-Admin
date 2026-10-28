import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Card, Input, Label } from '@/components/ui/form'
import { Select } from '@/components/ui/select'
import { api } from '@/lib/api'
import { useAction } from '@/lib/queries'
import { fmtNumber } from '@/lib/format'
import { PageHeader } from '@/pages/shared'
import { useSports } from '@/lib/sports'

interface Place { id: number; nameEn: string }

/** A push + inbox message to a slice of users. The size of the audience is shown before anything is sent. */
export default function AnnouncementsPage() {
  const sports = useSports().data ?? []
  const [f, setF] = useState({ title: '', body: '', role: '', sportId: '', divisionId: '', districtId: '' })
  const [confirm, setConfirm] = useState(false)
  const divisions = useQuery({ queryKey: ['locations', 'divisions', {}], staleTime: 60_000, queryFn: async () => (await api.get<Place[]>('/admin/locations/divisions')).data })
  const districts = useQuery({ queryKey: ['locations', 'districts', f.divisionId], enabled: !!f.divisionId, staleTime: 60_000, queryFn: async () => (await api.get<Place[]>('/admin/locations/districts', { divisionId: f.divisionId })).data })
  const audience = { role: f.role || undefined, sportId: f.sportId || undefined, divisionId: f.divisionId || undefined, districtId: f.districtId || undefined }
  const preview = useQuery({ queryKey: ['audience', audience], queryFn: async () => (await api.get<{ targetCount: number }>('/admin/notifications/preview', audience)).data.targetCount })
  const send = useAction(() => api.post('/admin/notifications/broadcast', { title: f.title.trim(), body: f.body.trim(), ...audience, ...(audience.sportId ? { sportId: Number(audience.sportId) } : {}), ...(audience.divisionId ? { divisionId: Number(audience.divisionId) } : {}), ...(audience.districtId ? { districtId: Number(audience.districtId) } : {}) }), { success: 'Announcement sent', invalidate: [['audience']] })
  const valid = f.title.trim().length >= 3 && f.body.trim().length >= 3
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v, ...(k === 'divisionId' ? { districtId: '' } : {}) }))

  return (
    <div className="animate-fade-up max-w-2xl">
      <PageHeader title="Announcements" description="Send a message to everyone, or narrow it by role, sport or place. It reaches their inbox and, if they allow it, their phone." />
      <Card className="space-y-4 p-6">
        <div><Label htmlFor="t">Title</Label><Input id="t" value={f.title} onChange={(e) => set('title')(e.target.value)} className="mt-1" maxLength={120} /></div>
        <div><Label htmlFor="b">Message</Label><textarea id="b" value={f.body} onChange={(e) => set('body')(e.target.value)} rows={4} maxLength={500} className="mt-1 w-full rounded-lg border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" /><p className="text-right text-xs text-muted-foreground">{f.body.length}/500</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="r">Who</Label><Select id="r" value={f.role} onChange={(e) => set('role')(e.target.value)} className="mt-1 w-full"><option value="">Everyone</option><option value="PLAYER">Players</option><option value="RECRUITER">Recruiters</option></Select></div>
          <div><Label htmlFor="s">Sport</Label><Select id="s" value={f.sportId} onChange={(e) => set('sportId')(e.target.value)} className="mt-1 w-full"><option value="">Any sport</option>{sports.map((s) => <option key={s.id} value={s.id}>{s.nameEn}</option>)}</Select></div>
          <div><Label htmlFor="dv">Division</Label><Select id="dv" value={f.divisionId} onChange={(e) => set('divisionId')(e.target.value)} className="mt-1 w-full"><option value="">Anywhere</option>{divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}</Select></div>
          <div><Label htmlFor="ds">District</Label><Select id="ds" value={f.districtId} disabled={!f.divisionId} onChange={(e) => set('districtId')(e.target.value)} className="mt-1 w-full"><option value="">Whole division</option>{districts.data?.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}</Select></div>
        </div>
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm"><span className="font-semibold">{preview.data == null ? '…' : fmtNumber(preview.data)}</span> <span className="text-muted-foreground">people will get this</span></p>
          <Button disabled={!valid || !preview.data || send.isPending} onClick={() => setConfirm(true)}>Review & send</Button>
        </div>
      </Card>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Send this announcement?" description="It can’t be recalled once sent.">
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm"><p className="font-semibold">{f.title}</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{f.body}</p></div>
          <p className="text-sm">To <span className="font-semibold">{fmtNumber(preview.data)}</span> people.</p>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={send.isPending} onClick={async () => { await send.mutateAsync(undefined).then(() => { setConfirm(false); setF((p) => ({ ...p, title: '', body: '' })) }).catch(() => undefined) }}>Send now</Button></div>
        </div>
      </Dialog>
    </div>
  )
}
