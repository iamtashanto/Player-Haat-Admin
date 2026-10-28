import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'

type Query = Record<string, string | number | boolean | undefined | null>

/** A cursor-paginated admin list: pages accumulate and "load more" asks for the next cursor. */
export function usePaged<T>(path: string, query: Query = {}, limit = 25) {
  const q = useInfiniteQuery({
    queryKey: ['paged', path, query, limit],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => api.get<T[]>(path, { ...query, limit, cursor: pageParam }, signal),
    getNextPageParam: (last) => (last.meta.nextCursor as string | null | undefined) ?? undefined,
    placeholderData: keepPreviousData,
  })
  return {
    items: q.data?.pages.flatMap((p) => p.data) ?? [],
    loading: q.isPending,
    fetching: q.isFetching,
    error: q.error as ApiError | null,
    hasMore: q.hasNextPage,
    loadingMore: q.isFetchingNextPage,
    loadMore: () => void q.fetchNextPage(),
    reload: () => void q.refetch(),
  }
}

export const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.')

/** An action against the API: toasts the outcome and refreshes whatever lists it may have changed. */
export function useAction<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  opts: { success: string | ((r: TResult) => string); invalidate?: QueryKey[] } = { success: 'Done' },
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      toast.success(typeof opts.success === 'function' ? opts.success(r) : opts.success)
      for (const key of opts.invalidate ?? [['paged']]) void qc.invalidateQueries({ queryKey: key })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
}
