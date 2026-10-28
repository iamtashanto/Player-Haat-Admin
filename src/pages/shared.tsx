export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
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
