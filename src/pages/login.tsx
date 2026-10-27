import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, KeyRound, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/auth/auth-context'
import { enableTotp, login, startTotpSetup, verifyTotp, type TotpSetup } from '@/auth/auth-api'
import { Button } from '@/components/ui/button'
import { Card, FieldError, Input, Label } from '@/components/ui/form'

type Step =
  | { name: 'credentials' }
  | { name: 'totp'; challengeToken: string }
  | { name: 'setup'; challengeToken: string; setup: TotpSetup }
  | { name: 'backup'; accessToken: string; codes: string[] }

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.')

export default function LoginPage() {
  const { status, signedOutReason } = useAuth()
  const [step, setStep] = useState<Step>({ name: 'credentials' })
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  // Don't bounce away while the user is still looking at their backup codes.
  if (status === 'authenticated' && step.name !== 'backup') return <Navigate to={from} replace />

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-sidebar p-4">
      <div className="pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 -bottom-40 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/20 blur-[120px]" />
      <div className="animate-fade-up relative w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary shadow-lg shadow-primary/40">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PlayerHaat Admin</h1>
          <p className="mt-1 text-sm text-white/60">Restricted access · authorized staff only</p>
        </div>
        <Card className="border-white/10 bg-card/95 p-6 backdrop-blur">
          {signedOutReason === 'idle' && step.name === 'credentials' && (
            <p className="mb-4 rounded-lg bg-accent px-3 py-2 text-xs">You were signed out after a period of inactivity.</p>
          )}
          {step.name === 'credentials' && <Credentials onStep={setStep} />}
          {step.name === 'totp' && <Totp challengeToken={step.challengeToken} onBack={() => setStep({ name: 'credentials' })} />}
          {step.name === 'setup' && <Setup step={step} onDone={(accessToken, codes) => setStep({ name: 'backup', accessToken, codes })} />}
          {step.name === 'backup' && <Backup step={step} />}
        </Card>
      </div>
    </main>
  )
}

// ─────────────────────────── step 1: email + password ───────────────────────────
const credSchema = z.object({ email: z.string().trim().email('Enter a valid email'), password: z.string().min(1, 'Password is required') })

function Credentials({ onStep }: { onStep: (s: Step) => void }) {
  const { completeSignIn } = useAuth()
  const form = useForm<z.infer<typeof credSchema>>({ resolver: zodResolver(credSchema) })
  const [error, setError] = useState<string>()

  const submit = form.handleSubmit(async (v) => {
    setError(undefined)
    try {
      const r = await login(v.email, v.password)
      if (r.status === 'AUTHENTICATED') return await completeSignIn(r.accessToken)
      if (r.status === 'TOTP_REQUIRED') return onStep({ name: 'totp', challengeToken: r.challengeToken })
      onStep({ name: 'setup', challengeToken: r.challengeToken, setup: await startTotpSetup(r.challengeToken) })
    } catch (e) {
      setError(errMsg(e))
    }
  })

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="username" autoFocus className="mt-1.5" {...form.register('email')} />
        <FieldError message={form.formState.errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" className="mt-1.5" {...form.register('password')} />
        <FieldError message={form.formState.errors.password?.message} />
      </div>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button id="login-submit" type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Continue
      </Button>
    </form>
  )
}

// ─────────────────────────── step 2: TOTP / backup code ───────────────────────────
function Totp({ challengeToken, onBack }: { challengeToken: string; onBack: () => void }) {
  const { completeSignIn } = useAuth()
  const [useBackup, setUseBackup] = useState(false)
  const [error, setError] = useState<string>()
  const schema = useBackup ? z.object({ code: z.string().trim().min(8, 'Enter a backup code') }) : z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') })
  const form = useForm<{ code: string }>({ resolver: zodResolver(schema) })

  const submit = form.handleSubmit(async ({ code }) => {
    setError(undefined)
    try {
      const { accessToken } = await verifyTotp(challengeToken, useBackup ? { backupCode: code } : { code })
      await completeSignIn(accessToken)
    } catch (e) {
      setError(errMsg(e))
      form.reset()
    }
  })

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Two-factor authentication</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {useBackup ? 'Enter one of your unused backup codes.' : 'Enter the 6-digit code from your authenticator app.'}
      </p>
      <div>
        <Label htmlFor="code" className="sr-only">Code</Label>
        <Input
          id="code"
          key={String(useBackup)}
          autoFocus
          autoComplete="one-time-code"
          inputMode={useBackup ? 'text' : 'numeric'}
          maxLength={useBackup ? 24 : 6}
          placeholder={useBackup ? 'xxxx-xxxx' : '000000'}
          className="text-center font-mono text-lg tracking-[0.3em]"
          {...form.register('code')}
        />
        <FieldError message={form.formState.errors.code?.message} />
      </div>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button id="totp-submit" type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Verify &amp; sign in
      </Button>
      <div className="flex justify-between text-xs">
        <button type="button" className="text-primary hover:underline" onClick={() => { setUseBackup((v) => !v); form.reset(); setError(undefined) }}>
          {useBackup ? 'Use authenticator app' : 'Use a backup code'}
        </button>
        <button type="button" className="text-muted-foreground hover:underline" onClick={onBack}>Back</button>
      </div>
    </form>
  )
}

// ─────────────────────────── step 2b: first-time TOTP enrolment ───────────────────────────
function Setup({ step, onDone }: { step: Extract<Step, { name: 'setup' }>; onDone: (accessToken: string, codes: string[]) => void }) {
  const [error, setError] = useState<string>()
  const form = useForm<{ code: string }>({ resolver: zodResolver(z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') })) })

  const submit = form.handleSubmit(async ({ code }) => {
    setError(undefined)
    try {
      const r = await enableTotp(step.challengeToken, code)
      onDone(r.accessToken, r.backupCodes)
    } catch (e) {
      setError(errMsg(e))
      form.reset()
    }
  })

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <h2 className="font-semibold">Set up two-factor authentication</h2>
      <p className="text-sm text-muted-foreground">Two-factor is mandatory for admins. Scan this QR code with Google Authenticator, 1Password, Authy or similar.</p>
      <div className="mx-auto w-fit rounded-xl bg-white p-3">
        <QRCodeSVG value={step.setup.otpauthUrl} size={156} />
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-xs">{step.setup.secret}</code>
        <button type="button" aria-label="Copy secret" className="text-muted-foreground hover:text-foreground" onClick={() => { void navigator.clipboard.writeText(step.setup.secret); toast.success('Secret copied') }}>
          <Copy className="h-4 w-4" />
        </button>
      </div>
      <div>
        <Label htmlFor="code">Enter the code to confirm</Label>
        <Input id="code" autoFocus inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="000000" className="mt-1.5 text-center font-mono text-lg tracking-[0.3em]" {...form.register('code')} />
        <FieldError message={form.formState.errors.code?.message} />
      </div>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button id="totp-enable" type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Enable two-factor
      </Button>
    </form>
  )
}

// ─────────────────────────── step 3: backup codes ───────────────────────────
function Backup({ step }: { step: Extract<Step, { name: 'backup' }> }) {
  const { completeSignIn } = useAuth()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const finish = async () => {
    setBusy(true)
    try {
      await completeSignIn(step.accessToken)
      navigate('/', { replace: true })
    } catch (e) {
      toast.error(errMsg(e))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Save your backup codes</h2>
      <p className="flex gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        Each code works once if you lose your authenticator. They won’t be shown again.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 font-mono text-sm">
        {step.codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <Button variant="outline" className="w-full" onClick={() => { void navigator.clipboard.writeText(step.codes.join('\n')); toast.success('Codes copied') }}>
        <Copy className="h-4 w-4" /> Copy all
      </Button>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input id="backup-saved" type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
        I’ve stored these codes somewhere safe
      </label>
      <Button id="backup-continue" className="w-full" disabled={!saved || busy} onClick={finish}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue to dashboard
      </Button>
    </div>
  )
}
