import { Search } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Input } from '@/components/ui/form'
import { Select } from '@/components/ui/select'

/** Text search that waits for a pause in typing (and for at least 2 characters, which is what the API accepts). */
export function SearchBox({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => { if (text !== value && (text.length === 0 || text.trim().length >= 2)) onChange(text.trim()) }, 300)
    return () => clearTimeout(t)
  }, [text, value, onChange])
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </div>
  )
}

export function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: Array<[string, string]>; label: string }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
    </Select>
  )
}

export const Toolbar = ({ children }: { children: ReactNode }) => <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>
