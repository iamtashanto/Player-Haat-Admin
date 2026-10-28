import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface SportOption {
  id: number; nameEn: string; code: string; nameBn: string; isActive: boolean
  positions: Array<{ id: number; code: string; nameEn: string; nameBn: string; order: number }>
}

/** The sports catalogue, shared by every filter that offers a sport. Changes rarely, so it's cached for a few minutes. */
export const useSports = () => useQuery({ queryKey: ['sports'], queryFn: async () => (await api.get<SportOption[]>('/admin/sports')).data, staleTime: 5 * 60_000 })
