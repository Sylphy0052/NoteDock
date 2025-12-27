import apiClient from './client'
import type { SearchResult, NoteSummary } from './types'

// Search notes
export async function searchNotes(params: {
  q?: string
  tag?: string
  folder_id?: number
  page?: number
  page_size?: number
}): Promise<SearchResult> {
  const { data } = await apiClient.get<SearchResult>('/search', { params })
  return data
}

// Quick search (for quick open modal)
export async function quickSearch(q: string): Promise<NoteSummary[]> {
  const { data } = await apiClient.get<NoteSummary[]>('/search/quick', {
    params: { q },
  })
  return data
}
