import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Card, Input, Label } from '@/components/ui/form'
import { api } from '@/lib/api'
import { useAction } from '@/lib/queries'
import { ago } from '@/lib/format'
import { PageHeader } from '@/pages/shared'

interface Session { id: string; device: string | null; userAgent: string | null; signedInAt: string }

/** "Chrome on macOS" from a user-agent string, good enough to recognise your own devices. */
const describe = (ua: string | null) => {
  if (!ua) return 'Unknown device'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${browser} on ${os}` : browser
}

function Password() {
  const [f, setF] = useState({ current: '', next: '', again: '' })
  const strong = f.next.length >= 8 && /[A-Za-z]/.test(f.next) && /\d/.test(f.next)
  const save = useAction(() => api.put('/admin/me/password', { currentPassword: f.current, newPassword: f.next }), { success: 'Password changed' })
  const mismatch = f.again.length > 0 && f.again !== f.next
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Change password</h2>
      <form className="mt-3 grid max-w-sm gap-3" onSubmit={async (e) => { e.preventDefault(); if (!strong || mismatch) return; await save.mutateAsync(undefined).then(() => setF({ current: '', next: '', again: '' })).catch(() => undefined) }}>
        <div><Label htmlFor="cur">Current password</Label><Input id="cur" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} className="mt-1" /></div>
        <div><Label htmlFor="new">New password</Label><Input id="new" type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} className="mt-1" /><p className="mt-1 text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p></div>
        <div><Label htmlFor="again">Repeat new password</Label><Input id="again" type="password" autoComplete="new-password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} className="mt-1" />{mismatch && <p role="alert" className="mt-1 text-xs text-destructive">The two don’t match.</p>}</div>
        <Button type="submit" className="justify-self-start" disabled={!f.current || !strong || f.again !== f.next || save.isPending}>Change password</Button>
      </form>
    </Card>
  )
}

function Sessions() {
  const sessions = useQuery({ queryKey: ['my-sessions'], queryFn: async () => (await api.get<Session[]>('/admin/me/sessions')).data })
  const revoke = useAction((id: string) => api.delete(`/admin/me/sessions/${id}`), { success: 'Signed out', invalidate: [['my-sessions']] })
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Where you’re signed in</h2>
      <p className="mb-3 text-xs text-muted-foreground">Sign out any you don’t recognise. This device’s session ends when you sign out or after 15 idle minutes.</p>
      {sessions.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <ul className="divide-y text-sm">
          {sessions.data?.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5"><span>{describe(s.userAgent)}<span className="block text-xs text-muted-foreground">signed in {ago(s.signedInAt)}</span></span><Button variant="outline" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate(s.id)}>Sign out</Button></li>
          ))}
          {sessions.data?.length === 0 && <li className="py-2 text-muted-foreground">No other sessions.</li>}
        </ul>
      )}
    </Card>
  )
}

function BackupCodes() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const regen = useAction(async () => api.post<{ backupCodes: string[] }>('/admin/me/2fa/backup-codes', { code }), { success: 'New backup codes made — the old ones no longer work' })
  const close = () => { setOpen(false); setCode(''); setCodes(null) }
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4" />Backup codes</h2>
      <p className="mt-1 max-w-lg text-xs text-muted-foreground">One-time codes for when you don’t have your authenticator app. Making new ones cancels the old set, and needs a current code from the app.</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>Make new backup codes</Button>
      <Dialog open={open} onClose={close} title={codes ? 'Your new backup codes' : 'Confirm it’s you'}>
        {codes ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Save these somewhere safe. Each works once, and they won’t be shown again.</p>
            <ul className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 font-mono text-sm">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
            <div className="flex justify-between"><Button variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(codes.join('\n')).then(() => toast.success('Copied'))}><Copy className="h-4 w-4" />Copy</Button><Button onClick={close}>I’ve saved them</Button></div>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (!/^\d{6}$/.test(code)) return; const r = await regen.mutateAsync(undefined).catch(() => null); if (r) setCodes((r as { data: { backupCodes: string[] } }).data.backupCodes) }}>
            <div><Label htmlFor="otp">Code from your authenticator app</Label><Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="mt-1 text-center font-mono text-lg tracking-widest" autoFocus /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={code.length !== 6 || regen.isPending}>Make new codes</Button></div>
          </form>
        )}
      </Dialog>
    </Card>
  )
}

export default function AccountPage() {
  const { user } = useAuth()
  return (
    <div className="animate-fade-up max-w-3xl space-y-4">
      <PageHeader title="My account" />
      <Card className="flex flex-wrap items-center gap-3 p-5">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-accent text-lg font-semibold text-primary">{user?.name.charAt(0).toUpperCase()}</div>
        <div><p className="font-semibold">{user?.name}</p><p className="text-sm text-muted-foreground">{user?.email}</p></div>
        <Badge tone="primary" className="ml-auto">Super admin</Badge>
        <Badge tone="success">Two-factor on</Badge>
      </Card>
      <Password />
      <Sessions />
      <BackupCodes />
    </div>
  )
}
