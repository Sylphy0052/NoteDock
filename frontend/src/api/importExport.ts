import apiClient from './client'
import type { ImportResult } from './types'

// Export notes as ZIP
export async function exportNotes(noteIds?: number[]): Promise<Blob> {
  const params = noteIds ? { note_ids: noteIds.join(',') } : {}
  const { data } = await apiClient.get<Blob>('/export', {
    params,
    responseType: 'blob',
  })
  return data
}

// Import notes from ZIP
export async function importNotes(file: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await apiClient.post<ImportResult>('/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}

// Download helper
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
