import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'
const KEY = 'ph-theme'

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null)

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem(KEY) as Theme | null) ?? 'system')

  useEffect(() => {
    apply(theme)
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => apply('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [theme])

  const setTheme = (t: Theme) => {
    localStorage.setItem(KEY, t)
    setThemeState(t)
  }
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTheme must be used inside <ThemeProvider>')
  return v
}
