import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Card, Input, Label } from '@/components/ui/form'
import { api } from '@/lib/api'
import { useAction } from '@/lib/queries'
import { PageHeader } from '@/pages/shared'
import { useSports, type SportOption } from '@/lib/sports'

type Position = SportOption['positions'][number]

/** The sports catalogue the apps read. Adding a sport here makes it appear in the apps with no release. */
export default function SportsPage() {
  const sports = useSports()
  const refresh = [['sports']]
  const [sportForm, setSportForm] = useState<{ id?: number; code: string; nameEn: string; nameBn: string; isActive: boolean } | null>(null)
  const [posForm, setPosForm] = useState<{ sportId: number; id?: number; code: string; nameEn: string; nameBn: string; order: string } | null>(null)

  const saveSport = useAction(async () => (sportForm!.id ? api.put(`/admin/sports/${sportForm!.id}`, { nameEn: sportForm!.nameEn, nameBn: sportForm!.nameBn, isActive: sportForm!.isActive }) : api.post('/admin/sports', { code: sportForm!.code, nameEn: sportForm!.nameEn, nameBn: sportForm!.nameBn, isActive: sportForm!.isActive })), { success: 'Saved', invalidate: refresh })
  const savePos = useAction(async () => {
    const f = posForm!
    return f.id ? api.put(`/admin/positions/${f.id}`, { nameEn: f.nameEn, nameBn: f.nameBn, order: Number(f.order) }) : api.post(`/admin/sports/${f.sportId}/positions`, { code: f.code, nameEn: f.nameEn, nameBn: f.nameBn, order: Number(f.order) })
  }, { success: 'Saved', invalidate: refresh })
  const delPos = useAction((id: number) => api.delete(`/admin/positions/${id}`), { success: 'Position removed', invalidate: refresh })

  if (sports.isPending) return <div className="grid min-h-[40vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  const names = (f: { nameEn: string; nameBn: string }) => f.nameEn.trim().length >= 2 && f.nameBn.trim().length >= 2

  return (
    <div className="animate-fade-up space-y-4">
      <PageHeader title="Sports & positions" description="Both languages are required. A sport can be switched off without deleting it; players’ existing profiles stay." />
      <div><Button size="sm" onClick={() => setSportForm({ code: '', nameEn: '', nameBn: '', isActive: true })}>Add a sport</Button></div>
      {sports.data?.map((s) => (
        <Card key={s.id} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-lg font-semibold">{s.nameEn} <span className="text-sm font-normal text-muted-foreground">· {s.nameBn} · {s.code}</span></p></div>
            <div className="flex items-center gap-2">{s.isActive ? <Badge tone="success">Active</Badge> : <Badge>Off</Badge>}<Button variant="outline" size="sm" onClick={() => setSportForm({ id: s.id, code: s.code, nameEn: s.nameEn, nameBn: s.nameBn, isActive: s.isActive })}>Edit</Button></div>
          </div>
          <ul className="mt-3 divide-y text-sm">
            {s.positions.map((p: Position) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2"><span><span className="font-mono text-xs text-muted-foreground">{p.code}</span> {p.nameEn} · {p.nameBn}</span>
                <span className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => setPosForm({ sportId: s.id, id: p.id, code: p.code, nameEn: p.nameEn, nameBn: p.nameBn, order: String(p.order) })}>Edit</Button><Button variant="ghost" size="sm" disabled={delPos.isPending} onClick={() => { if (window.confirm(`Remove the ${p.nameEn} position?`)) delPos.mutate(p.id) }}>Remove</Button></span>
              </li>
            ))}
            {s.positions.length === 0 && <li className="py-2 text-muted-foreground">No positions yet.</li>}
          </ul>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setPosForm({ sportId: s.id, code: '', nameEn: '', nameBn: '', order: String(s.positions.length + 1) })}>Add a position</Button>
        </Card>
      ))}

      <Dialog open={sportForm !== null} onClose={() => setSportForm(null)} title={sportForm?.id ? `Edit ${sportForm.code}` : 'Add a sport'}>
        {sportForm && (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (!names(sportForm) || (!sportForm.id && sportForm.code.trim().length < 2)) return; await saveSport.mutateAsync(undefined).then(() => setSportForm(null)).catch(() => undefined) }}>
            {!sportForm.id && <div><Label htmlFor="scode">Code</Label><Input id="scode" value={sportForm.code} onChange={(e) => setSportForm({ ...sportForm, code: e.target.value.toUpperCase() })} className="mt-1" placeholder="BADMINTON" maxLength={30} /></div>}
            <div><Label htmlFor="sen">Name (English)</Label><Input id="sen" value={sportForm.nameEn} onChange={(e) => setSportForm({ ...sportForm, nameEn: e.target.value })} className="mt-1" maxLength={80} /></div>
            <div><Label htmlFor="sbn">Name (বাংলা)</Label><Input id="sbn" value={sportForm.nameBn} onChange={(e) => setSportForm({ ...sportForm, nameBn: e.target.value })} className="mt-1" maxLength={80} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sportForm.isActive} onChange={(e) => setSportForm({ ...sportForm, isActive: e.target.checked })} />Offered in the apps</label>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setSportForm(null)}>Cancel</Button><Button type="submit" disabled={saveSport.isPending}>Save</Button></div>
          </form>
        )}
      </Dialog>
      <Dialog open={posForm !== null} onClose={() => setPosForm(null)} title={posForm?.id ? `Edit ${posForm.code}` : 'Add a position'}>
        {posForm && (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (!names(posForm) || (!posForm.id && posForm.code.trim().length < 1)) return; await savePos.mutateAsync(undefined).then(() => setPosForm(null)).catch(() => undefined) }}>
            {!posForm.id && <div><Label htmlFor="pcode">Code</Label><Input id="pcode" value={posForm.code} onChange={(e) => setPosForm({ ...posForm, code: e.target.value.toUpperCase() })} className="mt-1" placeholder="GK" maxLength={20} /></div>}
            <div><Label htmlFor="pen">Name (English)</Label><Input id="pen" value={posForm.nameEn} onChange={(e) => setPosForm({ ...posForm, nameEn: e.target.value })} className="mt-1" maxLength={80} /></div>
            <div><Label htmlFor="pbn">Name (বাংলা)</Label><Input id="pbn" value={posForm.nameBn} onChange={(e) => setPosForm({ ...posForm, nameBn: e.target.value })} className="mt-1" maxLength={80} /></div>
            <div><Label htmlFor="pord">Order</Label><Input id="pord" type="number" value={posForm.order} onChange={(e) => setPosForm({ ...posForm, order: e.target.value })} className="mt-1 w-28" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPosForm(null)}>Cancel</Button><Button type="submit" disabled={savePos.isPending}>Save</Button></div>
          </form>
        )}
      </Dialog>
    </div>
  )
}
