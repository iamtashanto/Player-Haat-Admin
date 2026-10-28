import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import type { ApiError } from '@/lib/api'

export interface Column<T> { header: string; cell: (row: T) => ReactNode; className?: string }

/** A table over a cursor-paginated list, with loading, empty and error states and "load more". */
export function PagedTable<T extends { id: string }>({
  columns, items, loading, fetching, error, hasMore, loadingMore, onLoadMore, onRetry, empty = 'Nothing here.', onRowClick,
}: {
  columns: Column<T>[]; items: T[]; loading: boolean; fetching?: boolean; error: ApiError | null; hasMore: boolean; loadingMore: boolean
  onLoadMore: () => void; onRetry: () => void; empty?: string; onRowClick?: (row: T) => void
}) {
  return (
    <Card className="overflow-hidden">
      <div className={cn('overflow-x-auto transition-opacity', fetching && !loading && 'opacity-60')}>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>{columns.map((c) => <th key={c.header} className={cn('px-4 py-3 font-medium', c.className)}>{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {items.map((row) => (
              <tr key={row.id} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('align-top', onRowClick && 'cursor-pointer hover:bg-muted/40')}>
                {columns.map((c) => <td key={c.header} className={cn('px-4 py-3', c.className)}>{c.cell(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div className="grid place-items-center p-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
      {error && !loading && (
        <div className="p-8 text-center">
          <p className="text-sm text-destructive">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>
        </div>
      )}
      {!loading && !error && items.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">{empty}</p>}
      {hasMore && (
        <div className="border-t p-3 text-center">
          <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loadingMore}>{loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}Load more</Button>
        </div>
      )}
    </Card>
  )
}
