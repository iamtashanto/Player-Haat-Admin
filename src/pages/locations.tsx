import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Card, Input, Label } from '@/components/ui/form'
import { Select } from '@/components/ui/select'
import { api } from '@/lib/api'
import { useAction } from '@/lib/queries'
import { PageHeader } from '@/pages/shared'

interface Place { id: number; nameEn: string; nameBn: string }
type Level = 'divisions' | 'districts' | 'upazilas' | 'unions'
const LEVELS: Array<[Level, string]> = [['divisions', 'Divisions'], ['districts', 'Districts'], ['upazilas', 'Upazilas'], ['unions', 'Unions']]
const PARENT: Record<Exclude<Level, 'divisions'>, { param: string; from: Level; label: string }> = {
  districts: { param: 'divisionId', from: 'divisions', label: 'Division' },
  upazilas: { param: 'districtId', from: 'districts', label: 'District' },
  unions: { param: 'upazilaId', from: 'upazilas', label: 'Upazila' },
}

const useList = (level: Level, query: Record<string, string | undefined>, enabled = true) =>
  useQuery({ queryKey: ['locations', level, query], enabled, staleTime: 60_000, queryFn: async () => (await api.get<Place[]>(`/admin/locations/${level}`, query)).data })

/** Names are fixed reference data; this page only corrects spellings (the structure itself isn't editable). */
export default function LocationsPage() {
  const [level, setLevel] = useState<Level>('divisions')
  const [division, setDivision] = useState('')
  const [district, setDistrict] = useState('')
  const [upazila, setUpazila] = useState('')
  const [edit, setEdit] = useState<(Place & { level: Level }) | null>(null)

  const divisions = useList('divisions', {})
  const districts = useList('districts', { divisionId: division || undefined }, level !== 'divisions' && !!division)
  const upazilas = useList('upazilas', { districtId: district || undefined }, (level === 'upazilas' || level === 'unions') && !!district)
  const unions = useList('unions', { upazilaId: upazila || undefined }, level === 'unions' && !!upazila)
  const rows = { divisions, districts, upazilas, unions }[level]
  const save = useAction(() => api.put(`/admin/locations/${edit!.level}/${edit!.id}`, { nameEn: edit!.nameEn.trim(), nameBn: edit!.nameBn.trim() }), { success: 'Renamed', invalidate: [['locations']] })

  const need = level !== 'divisions' ? PARENT[level] : null
  const parents: Array<{ label: string; value: string; set: (v: string) => void; options?: Place[] }> = [
    ...(level !== 'divisions' ? [{ label: 'Division', value: division, set: (v: string) => { setDivision(v); setDistrict(''); setUpazila('') }, options: divisions.data }] : []),
    ...(level === 'upazilas' || level === 'unions' ? [{ label: 'District', value: district, set: (v: string) => { setDistrict(v); setUpazila('') }, options: districts.data }] : []),
    ...(level === 'unions' ? [{ label: 'Upazila', value: upazila, set: setUpazila, options: upazilas.data }] : []),
  ]
  const ready = !need || (level === 'districts' ? !!division : level === 'upazilas' ? !!district : !!upazila)

  return (
    <div className="animate-fade-up">
      <PageHeader title="Locations" description="Division → district → upazila → union. Correct a name in either language; changes show in the apps right away." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-card p-1 text-sm">
          {LEVELS.map(([l, label]) => <button key={l} onClick={() => setLevel(l)} className={`rounded-md px-3 py-1.5 font-medium ${level === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>)}
        </div>
        {parents.map((p) => (
          <Select key={p.label} value={p.value} onChange={(e) => p.set(e.target.value)} aria-label={p.label}>
            <option value="">{p.label}…</option>
            {p.options?.map((o) => <option key={o.id} value={o.id}>{o.nameEn}</option>)}
          </Select>
        ))}
      </div>
      <Card className="overflow-hidden">
        {!ready && <p className="p-10 text-center text-sm text-muted-foreground">Pick a {need?.label.toLowerCase()} first.</p>}
        {ready && rows.isPending && <div className="grid place-items-center p-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
        {ready && rows.data && (
          <ul className="max-h-[65vh] divide-y overflow-y-auto text-sm">
            {rows.data.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5"><span>{p.nameEn} <span className="text-muted-foreground">· {p.nameBn}</span></span><Button variant="ghost" size="sm" onClick={() => setEdit({ ...p, level })}>Rename</Button></li>)}
            {rows.data.length === 0 && <li className="p-8 text-center text-muted-foreground">Nothing here.</li>}
          </ul>
        )}
      </Card>
      <Dialog open={edit !== null} onClose={() => setEdit(null)} title="Rename">
        {edit && (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (edit.nameEn.trim().length < 2 || edit.nameBn.trim().length < 2) return; await save.mutateAsync(undefined).then(() => setEdit(null)).catch(() => undefined) }}>
            <div><Label htmlFor="len">English</Label><Input id="len" value={edit.nameEn} onChange={(e) => setEdit({ ...edit, nameEn: e.target.value })} className="mt-1" maxLength={80} /></div>
            <div><Label htmlFor="lbn">বাংলা</Label><Input id="lbn" value={edit.nameBn} onChange={(e) => setEdit({ ...edit, nameBn: e.target.value })} className="mt-1" maxLength={80} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button type="submit" disabled={save.isPending}>Save</Button></div>
          </form>
        )}
      </Dialog>
    </div>
  )
}
