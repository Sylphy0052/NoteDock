import apiClient from './client'
import type { Company, CompanyCreate, CompanyUpdate, CompanyListResponse, MessageResponse } from './types'

// Get companies list with pagination
export async function getCompanies(params?: {
  page?: number
  page_size?: number
  q?: string
}): Promise<CompanyListResponse> {
  const { data } = await apiClient.get<Company[]>('/companies', { params })
  // APIは配列を直接返すので、フロントエンドの期待する形式に変換
  return {
    items: data,
    total: data.length,
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 100,
  }
}

// Get single company by ID
export async function getCompany(companyId: number): Promise<Company> {
  const { data } = await apiClient.get<Company>(`/companies/${companyId}`)
  return data
}

// Create new company
export async function createCompany(company: CompanyCreate): Promise<Company> {
  const { data } = await apiClient.post<Company>('/companies', company)
  return data
}

// Update company
export async function updateCompany(companyId: number, company: CompanyUpdate): Promise<Company> {
  const { data } = await apiClient.put<Company>(`/companies/${companyId}`, company)
  return data
}

// Delete company
export async function deleteCompany(companyId: number): Promise<MessageResponse> {
  const { data } = await apiClient.delete<MessageResponse>(`/companies/${companyId}`)
  return data
}

// Search companies
export async function searchCompanies(q: string): Promise<Company[]> {
  const { data } = await apiClient.get<Company[]>('/companies/search', { params: { q } })
  return data
}
