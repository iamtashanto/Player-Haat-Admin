import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, Input } from '@/components/ui/form'
import { api } from '@/lib/api'
import { useAction } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/pages/shared'

type Config = Record<string, boolean | string | number>
interface Field { key: string; label: string; hint: string }

const SWITCHES: Field[] = [
  { key: 'ads_enabled', label: 'Show ads', hint: 'Banner and in-feed ads in the app.' },
  { key: 'boost_enabled', label: 'Paid boost', hint: 'Owners can pay credits to feature a request. Needs a boost price below.' },
  { key: 'contact_credits_enabled', label: 'Charge for opening numbers', hint: 'Off = everyone can open any number for free, whatever the prices below say.' },
]
const NUMBERS: Field[] = [
  { key: 'contact_free_per_day', label: 'Free number views per day', hint: 'How many new numbers a person can open each day before credits are needed.' },
  { key: 'contact_credit_cost', label: 'Credits per number view', hint: 'After the free allowance. Numbers someone has already opened, and people the player accepted, are always free.' },
  { key: 'boost_credit_cost', label: 'Credits per boost', hint: 'What boosting one request costs.' },
  { key: 'boost_hours', label: 'Boost length (hours)', hint: 'How long a boosted request stays featured (1–720).' },
]

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50', checked ? 'bg-primary' : 'bg-muted-foreground/30')}>
      <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  )
}

function NumberRow({ field, value, onSave, saving }: { field: Field; value: number; onSave: (v: string) => void; saving: boolean }) {
  const [text, setText] = useState(String(value))
  const dirty = text !== String(value) && /^\d+$/.test(text)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="max-w-md"><p className="text-sm font-medium">{field.label}</p><p className="text-xs text-muted-foreground">{field.hint}</p></div>
      <div className="flex items-center gap-2">
        <Input type="number" min={0} value={text} onChange={(e) => setText(e.target.value)} className="w-28" aria-label={field.label} />
        <Button size="sm" disabled={!dirty || saving} onClick={() => onSave(text)}>Save</Button>
      </div>
    </div>
  )
}

function VersionCard({ current, onSave, saving }: { current: string; onSave: (v: string) => void; saving: boolean }) {
  const [version, setVersion] = useState(current)
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">Minimum app version</h2>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="max-w-md text-xs text-muted-foreground">Apps older than this are asked to update before they can be used. Use a version like 1.4.0.</p>
        <div className="flex items-center gap-2">
          <Input value={version} onChange={(e) => setVersion(e.target.value)} className="w-32" aria-label="Minimum app version" />
          <Button size="sm" disabled={version === current || !/^\d+(\.\d+){0,2}$/.test(version) || saving} onClick={() => onSave(version)}>Save</Button>
        </div>
      </Card>
    </div>
  )
}

export default function FlagsPage() {
  const cfg = useQuery({ queryKey: ['app-config'], queryFn: async () => (await api.get<Config>('/admin/app-config')).data })
  const save = useAction((v: { key: string; value: boolean | string }) => api.put(`/admin/app-config/${v.key}`, { value: v.value }), { success: 'Saved — the app picks it up within 30 seconds', invalidate: [['app-config']] })

  if (cfg.isPending) return <div className="grid min-h-[40vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  const c = cfg.data
  if (!c) return <p className="text-sm text-destructive">Couldn’t load the settings.</p>
  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader title="Feature flags & pricing" description="Switches and prices the apps read. Every change is written to the audit log." />
      <Card className="divide-y px-5">
        {SWITCHES.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-4 py-4">
            <div className="max-w-md"><p className="text-sm font-medium">{f.label}</p><p className="text-xs text-muted-foreground">{f.hint}</p></div>
            <Switch label={f.label} checked={c[f.key] === true} disabled={save.isPending} onChange={(v) => save.mutate({ key: f.key, value: v })} />
          </div>
        ))}
      </Card>
      <div>
        <h2 className="mb-2 text-sm font-semibold">Prices</h2>
        <Card className="divide-y px-5">
          {NUMBERS.map((f) => <NumberRow key={`${f.key}:${c[f.key]}`} field={f} value={Number(c[f.key])} saving={save.isPending} onSave={(v) => save.mutate({ key: f.key, value: v })} />)}
        </Card>
      </div>
      <VersionCard key={String(c.min_app_version)} current={String(c.min_app_version)} onSave={(v) => save.mutate({ key: 'min_app_version', value: v })} saving={save.isPending} />
    </div>
  )
}
