import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Activity, Bell, ClipboardList, Flag, LayoutDashboard, LogOut, MapPin, Menu, Monitor, Moon, ScrollText,
  Settings, Shield, Sun, Trophy, UserCog, Users, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/auth/auth-context'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import type { Permission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

interface NavItem { to: string; label: string; icon: LucideIcon; permission: Permission }
interface NavGroup { title: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  { title: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' }] },
  {
    title: 'People',
    items: [
      { to: '/users', label: 'Users', icon: Users, permission: 'users.view' },
      { to: '/profiles', label: 'Sports profiles', icon: Trophy, permission: 'profiles.view' },
    ],
  },
  {
    title: 'Moderation',
    items: [
      { to: '/requests', label: 'Requests', icon: ClipboardList, permission: 'requests.view' },
      { to: '/reports', label: 'Reports', icon: Flag, permission: 'reports.view' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { to: '/config/sports', label: 'Sports & positions', icon: Activity, permission: 'config.sports' },
      { to: '/config/locations', label: 'Locations', icon: MapPin, permission: 'config.locations' },
      { to: '/config/flags', label: 'Feature flags', icon: Settings, permission: 'config.flags' },
      { to: '/notifications', label: 'Announcements', icon: Bell, permission: 'notifications.send' },
      { to: '/audit', label: 'Audit log', icon: ScrollText, permission: 'audit.view' },
    ],
  },
]

export default function AppLayout() {
  const { user, can, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const nextTheme = { light: 'dark', dark: 'system', system: 'light' } as const
  const ThemeIcon = { light: Sun, dark: Moon, system: Monitor }[theme]

  return (
    <div className="flex min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/40"><Shield className="h-5 w-5" /></div>
          <div className="leading-tight">
            <p className="font-semibold text-white">PlayerHaat</p>
            <p className="text-[11px] uppercase tracking-widest text-sidebar-foreground/60">Admin</p>
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3" aria-label="Main">
          {NAV.map((g) => {
            const items = g.items.filter((i) => can(i.permission))
            if (!items.length) return null
            return (
              <div key={g.title}>
                <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50">{g.title}</p>
                {items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive ? 'bg-primary/20 font-medium text-white' : 'hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <NavLink to="/account" onClick={() => setOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5 hover:text-white', isActive && 'bg-primary/20 text-white')}>
            <UserCog className="h-4 w-4" /> My account
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="flex-1" />
          <Button id="theme-toggle" variant="ghost" size="icon" aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`} onClick={() => setTheme(nextTheme[theme])}>
            <ThemeIcon className="h-4 w-4" />
          </Button>
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button id="sign-out" variant="outline" size="sm" onClick={() => void signOut()}><LogOut className="h-3.5 w-3.5" /> Sign out</Button>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
