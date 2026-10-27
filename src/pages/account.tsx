import { useAuth } from '@/auth/auth-context'
import { Card } from '@/components/ui/form'
import { PageHeader } from './shared'

export default function AccountPage() {
  const { user } = useAuth()
  return (
    <div className="animate-fade-up max-w-2xl">
      <PageHeader title="My account" description="Profile, password, two-factor and active sessions." />
      <Card className="divide-y">
        <Row label="Name" value={user?.name} />
        <Row label="Email" value={user?.email} />
        <Row label="Role" value={user?.role} mono />
        <Row label="Password, 2FA & sessions" value="Management UI lands after the backend endpoints exist (see README)." muted />
      </Card>
    </div>
  )
}

function Row({ label, value, mono, muted }: { label: string; value?: string; mono?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${mono ? 'font-mono text-xs' : ''} ${muted ? 'text-xs text-muted-foreground' : 'font-medium'} text-right`}>{value}</span>
    </div>
  )
}
