import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  searchCompanies,
} from '../api/companies'
import type { CompanyCreate, CompanyUpdate } from '../api/types'

// Query keys
const COMPANIES_KEY = 'companies'

/**
 * Hook to fetch companies list with pagination.
 */
export function useCompanies(params?: {
  page?: number
  page_size?: number
  q?: string
}) {
  return useQuery({
    queryKey: [COMPANIES_KEY, 'list', params],
    queryFn: () => getCompanies(params),
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch a single company by ID.
 */
export function useCompany(companyId: number | undefined) {
  return useQuery({
    queryKey: [COMPANIES_KEY, 'detail', companyId],
    queryFn: () => getCompany(companyId!),
    enabled: companyId !== undefined,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to search companies.
 */
export function useSearchCompanies(query: string) {
  return useQuery({
    queryKey: [COMPANIES_KEY, 'search', query],
    queryFn: () => searchCompanies(query),
    enabled: query.length > 0,
    staleTime: 10 * 1000,
  })
}

/**
 * Hook to create a new company.
 */
export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CompanyCreate) => createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] })
    },
  })
}

/**
 * Hook to update a company.
 */
export function useUpdateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CompanyUpdate }) => updateCompany(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] })
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY, 'detail', variables.id] })
    },
  })
}

/**
 * Hook to delete a company.
 */
export function useDeleteCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (companyId: number) => deleteCompany(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] })
    },
  })
}
