import apiClient from './client'
import type { Folder, MessageResponse } from './types'

// Get all folders as tree structure
export async function getFolders(): Promise<Folder[]> {
  const { data } = await apiClient.get<Folder[]>('/folders')
  return data
}

// Create folder
export async function createFolder(name: string, parentId?: number | null): Promise<Folder> {
  const { data } = await apiClient.post<Folder>('/folders', {
    name,
    parent_id: parentId ?? null,
  })
  return data
}

// Update folder
export async function updateFolder(
  folderId: number,
  name: string,
  parentId?: number | null
): Promise<Folder> {
  const { data } = await apiClient.put<Folder>(`/folders/${folderId}`, {
    name,
    parent_id: parentId,
  })
  return data
}

// Delete folder
export async function deleteFolder(folderId: number): Promise<MessageResponse> {
  const { data } = await apiClient.delete<MessageResponse>(`/folders/${folderId}`)
  return data
}
