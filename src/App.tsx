import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '@/auth/auth-context'
import AppLayout from '@/layout/app-layout'
import LoginPage from '@/pages/login'
import AccountPage from '@/pages/account'
import { NotFound } from '@/pages/shared'
import { DashboardHome } from '@/pages/dashboard'
import UsersPage from '@/pages/users'
import UserDetailPage from '@/pages/user-detail'
import ProfilesPage from '@/pages/profiles'
import RecruitersPage from '@/pages/recruiters'
import VerificationsPage from '@/pages/verifications'
import PaymentsPage from '@/pages/payments'
import RequestsPage from '@/pages/requests'
import ReportsPage from '@/pages/reports'
import SportsPage from '@/pages/sports'
import LocationsPage from '@/pages/locations'
import FlagsPage from '@/pages/flags'
import AnnouncementsPage from '@/pages/announcements'
import AuditPage from '@/pages/audit'
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<RequirePermission permission="dashboard.view"><DashboardHome /></RequirePermission>} />
        <Route path="/users" element={<RequirePermission permission="users.view"><UsersPage /></RequirePermission>} />
        <Route path="/users/:id" element={<RequirePermission permission="users.view"><UserDetailPage /></RequirePermission>} />
        <Route path="/profiles" element={<RequirePermission permission="profiles.view"><ProfilesPage /></RequirePermission>} />
        <Route path="/recruiters" element={<RequirePermission permission="recruiters.view"><RecruitersPage /></RequirePermission>} />
        <Route path="/verifications" element={<RequirePermission permission="verifications.review"><VerificationsPage /></RequirePermission>} />
        <Route path="/payments" element={<RequirePermission permission="payments.review"><PaymentsPage /></RequirePermission>} />
        <Route path="/requests" element={<RequirePermission permission="requests.view"><RequestsPage /></RequirePermission>} />
        <Route path="/reports" element={<RequirePermission permission="reports.view"><ReportsPage /></RequirePermission>} />
        <Route path="/config/sports" element={<RequirePermission permission="config.sports"><SportsPage /></RequirePermission>} />
        <Route path="/config/locations" element={<RequirePermission permission="config.locations"><LocationsPage /></RequirePermission>} />
        <Route path="/config/flags" element={<RequirePermission permission="config.flags"><FlagsPage /></RequirePermission>} />
        <Route path="/notifications" element={<RequirePermission permission="notifications.send"><AnnouncementsPage /></RequirePermission>} />
        <Route path="/audit" element={<RequirePermission permission="audit.view"><AuditPage /></RequirePermission>} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
