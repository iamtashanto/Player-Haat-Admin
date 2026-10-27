import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '@/auth/auth-context'
import AppLayout, { NAV } from '@/layout/app-layout'
import LoginPage from '@/pages/login'
import AccountPage from '@/pages/account'
import { ComingSoon, DashboardHome, NotFound } from '@/pages/shared'
import type { Permission } from '@/lib/permissions'

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuth()
  return can(permission) ? children : (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <p className="text-lg font-semibold">Access denied</p>
        <p className="text-sm text-muted-foreground">You don’t have permission to view this page.</p>
      </div>
    </div>
  )
}

const PHASE: Record<string, number> = { '/users': 2, '/profiles': 3, '/requests': 3, '/reports': 3 }

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<RequirePermission permission="dashboard.view"><DashboardHome /></RequirePermission>} />
        {NAV.flatMap((g) => g.items).filter((i) => i.to !== '/').map((i) => (
          <Route
            key={i.to}
            path={i.to}
            element={<RequirePermission permission={i.permission}><ComingSoon title={i.label} phase={PHASE[i.to] ?? 4} /></RequirePermission>}
          />
        ))}
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
