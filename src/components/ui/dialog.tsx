import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/form'

/** A modal: Escape and the backdrop close it, focus moves inside, and the page behind stops scrolling. */
export function Dialog({ open, onClose, title, description, children, wide }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 animate-fade-up bg-black/50" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`animate-fade-up relative max-h-[90vh] w-full overflow-y-auto rounded-xl border bg-card p-6 shadow-xl outline-none ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        <h2 id={titleId} className="pr-8 text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

/**
 * Confirm an action, with a reason when one is needed. The reason goes into the audit log, so it's required (3+ chars)
 * for anything that hurts someone and optional for undoing it.
 */
export function ReasonDialog({
  open, onClose, title, description, confirmLabel = 'Confirm', destructive, required = true, label = 'Reason', extra, onConfirm,
}: {
  open: boolean; onClose: () => void; title: string; description?: string; confirmLabel?: string; destructive?: boolean; required?: boolean; label?: string
  extra?: ReactNode
  onConfirm: (reason: string) => Promise<unknown> | unknown
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const close = () => { setReason(''); onClose() }
  const tooShort = required && reason.trim().length < 3
  return (
    <Dialog open={open} onClose={close} title={title} description={description}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (tooShort || busy) return
          setBusy(true)
          try { await onConfirm(reason.trim()); close() } catch { /* the action already toasted the error; keep the dialog open to retry */ } finally { setBusy(false) }
        }}
        className="space-y-3"
      >
        {extra}
        <div>
          <Label htmlFor="reason">{label}{required ? '' : ' (optional)'}</Label>
          <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} autoFocus className="mt-1 w-full rounded-lg border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" placeholder={required ? 'Kept in the audit log (at least 3 characters)' : ''} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>Cancel</Button>
          <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={tooShort || busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{confirmLabel}</Button>
        </div>
      </form>
    </Dialog>
  )
}
