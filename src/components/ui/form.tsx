import type { HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, Ref } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ref, ...props }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border bg-card px-3 text-sm placeholder:text-muted-foreground transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-medium', className)} {...props} />
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p role="alert" className="mt-1 text-xs text-destructive">{message}</p> : null
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border bg-card shadow-sm', className)} {...props} />
}
