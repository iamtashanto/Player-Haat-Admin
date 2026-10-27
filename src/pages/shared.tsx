import { Hammer } from 'lucide-react'
import { useAuth } from '@/auth/auth-context'
import { Card } from '@/components/ui/form'
import { PERMISSIONS } from '@/lib/permissions'

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

/** Stand-in for modules scheduled in later phases. */
export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="animate-fade-up">
      <PageHeader title={title} />
      <Card className="grid place-items-center gap-2 p-16 text-center">
        <Hammer className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Planned for Phase {phase}</p>
        <p className="text-sm text-muted-foreground">This module isn’t built yet.</p>
      </Card>
    </div>
  )
}

export function DashboardHome() {
  const { user, can } = useAuth()
  const granted = PERMISSIONS.filter((p) => can(p))
  return (
    <div className="animate-fade-up">
      <PageHeader title={`Welcome back, ${user?.name.split(' ')[0] ?? 'admin'}`} description="Overview metrics and charts arrive in Phase 2." />
      <Card className="max-w-2xl p-6">
        <h2 className="text-sm font-semibold">Your permissions</h2>
        <p className="mb-3 text-xs text-muted-foreground">{granted.length} of {PERMISSIONS.length} actions granted</p>
        <div className="flex flex-wrap gap-1.5">
          {granted.map((p) => <span key={p} className="rounded-md bg-accent px-2 py-1 font-mono text-[11px]">{p}</span>)}
        </div>
      </Card>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <p className="text-5xl font-bold text-primary">404</p>
        <p className="mt-2 text-muted-foreground">That page doesn’t exist.</p>
      </div>
    </div>
  )
}
