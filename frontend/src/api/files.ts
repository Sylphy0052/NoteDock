import apiClient from "./client";
import type { FileUploadResponse, MessageResponse } from "./types";

// Upload file
export async function uploadFile(
  file: File,
  noteId?: number
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (noteId) {
    formData.append("note_id", noteId.toString());
  }

  const { data } = await apiClient.post<FileUploadResponse>("/files", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

// Get file download URL
export function getFileUrl(fileId: number): string {
  return `${apiClient.defaults.baseURL}/files/${fileId}`;
}

// Alias for backward compatibility
export async function getFileDownloadUrl(fileId: number): Promise<string> {
  return getFileUrl(fileId);
}

// Get file preview URL
export function getFilePreviewUrl(fileId: number): string {
  return `${apiClient.defaults.baseURL}/files/${fileId}/preview`;
}

// Download file
export async function downloadFile(fileId: number): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/files/${fileId}`, {
    responseType: "blob",
  });
  return data;
}

// Delete file
export async function deleteFile(fileId: number): Promise<MessageResponse> {
  const { data } = await apiClient.delete<MessageResponse>(`/files/${fileId}`);
  return data;
}

// Attach file to note
export async function attachFileToNote(
  fileId: number,
  noteId: number
): Promise<MessageResponse> {
  const { data } = await apiClient.post<MessageResponse>(
    `/notes/${noteId}/files/${fileId}`
  );
  return data;
}

// Detach file from note
export async function detachFileFromNote(
  fileId: number,
  noteId: number
): Promise<MessageResponse> {
  const { data } = await apiClient.delete<MessageResponse>(
    `/notes/${noteId}/files/${fileId}`
  );
  return data;
}
