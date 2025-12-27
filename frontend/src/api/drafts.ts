/**
 * Drafts API
 */

import apiClient from './client'

// Types
export interface Draft {
  id: number
  note_id: number | null
  session_id: string
  title: string
  content_md: string
  folder_id: number | null
  tags: string[]
  saved_at: string
}

export interface DraftCheckResponse {
  has_draft: boolean
  draft: Draft | null
}

export interface DraftSave {
  session_id: string
  note_id?: number | null
  title: string
  content_md: string
  folder_id?: number | null
  tags: string[]
}

// API functions

/**
 * Check if a draft exists
 */
export async function checkDraft(
  sessionId: string,
  noteId?: number | null
): Promise<DraftCheckResponse> {
  const params: Record<string, string | number> = { session_id: sessionId }
  if (noteId != null) {
    params.note_id = noteId
  }
  const response = await apiClient.get<DraftCheckResponse>('/drafts', {
    params,
  })
  return response.data
}

/**
 * Check if a draft exists by note ID
 */
export async function checkDraftByNoteId(noteId: number): Promise<DraftCheckResponse> {
  const response = await apiClient.get<DraftCheckResponse>(`/drafts/note/${noteId}`)
  return response.data
}

/**
 * Save a draft
 */
export async function saveDraft(data: DraftSave): Promise<Draft> {
  const response = await apiClient.post<Draft>('/drafts', data)
  return response.data
}

/**
 * Delete a draft
 */
export async function deleteDraft(
  sessionId: string,
  noteId?: number | null
): Promise<{ message: string }> {
  const params: Record<string, string | number> = { session_id: sessionId }
  if (noteId != null) {
    params.note_id = noteId
  }
  const response = await apiClient.delete<{ message: string }>('/drafts', {
    params,
  })
  return response.data
}

/**
 * Delete a draft by note ID
 */
export async function deleteDraftByNoteId(noteId: number): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(`/drafts/note/${noteId}`)
  return response.data
}
