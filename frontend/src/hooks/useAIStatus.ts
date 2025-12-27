import { useQuery } from '@tanstack/react-query'
import { checkAIStatus } from '../api/ai'

/**
 * Hook to check if AI features are enabled.
 * Uses React Query for caching and automatic refetching.
 */
export function useAIStatus() {
  return useQuery({
    queryKey: ['ai-status'],
    queryFn: checkAIStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
