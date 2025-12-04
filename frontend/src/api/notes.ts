import apiClient from "./client";
import type {
  NoteResponse,
  NoteListResponse,
  NoteCreate,
  NoteUpdate,
  NoteSummaryHover,
  TocItem,
  NoteVersionBrief,
  NoteVersionFull,
  MessageResponse,
} from "./types";

// Get notes list with pagination and filters
export async function getNotes(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  tag?: string;
  folder_id?: number;
  is_pinned?: boolean;
}): Promise<NoteListResponse> {
  const { data } = await apiClient.get<NoteListResponse>("/notes", { params });
  return data;
}

// Get single note by ID
export async function getNote(noteId: number): Promise<NoteResponse> {
  const { data } = await apiClient.get<NoteResponse>(`/notes/${noteId}`);
  return data;
}

// Create new note
export async function createNote(note: NoteCreate): Promise<NoteResponse> {
  const { data } = await apiClient.post<NoteResponse>("/notes", note);
  return data;
}

// Update note
export async function updateNote(
  noteId: number,
  note: NoteUpdate
): Promise<NoteResponse> {
  const { data } = await apiClient.put<NoteResponse>(`/notes/${noteId}`, note);
  return data;
}

// Delete note (soft delete)
export async function deleteNote(noteId: number): Promise<MessageResponse> {
  const { data } = await apiClient.delete<MessageResponse>(`/notes/${noteId}`);
  return data;
}

// Permanently delete note
export async function permanentDeleteNote(
  noteId: number
): Promise<MessageResponse> {
  const { data } = await apiClient.delete<MessageResponse>(
    `/notes/${noteId}/permanent`
  );
  return data;
}

// Restore note from trash
export async function restoreNote(noteId: number): Promise<NoteResponse> {
  const { data } = await apiClient.post<NoteResponse>(
    `/notes/${noteId}/restore`
  );
  return data;
}

// Duplicate note
export async function duplicateNote(noteId: number): Promise<NoteResponse> {
  const { data } = await apiClient.post<NoteResponse>(
    `/notes/${noteId}/duplicate`
  );
  return data;
}

// Toggle pin status
export async function toggleNotePin(
  noteId: number,
  is_pinned: boolean
): Promise<NoteResponse> {
  const { data } = await apiClient.patch<NoteResponse>(`/notes/${noteId}/pin`, {
    is_pinned,
  });
  return data;
}

// Toggle readonly status
export async function toggleNoteReadonly(
  noteId: number,
  is_readonly: boolean
): Promise<NoteResponse> {
  const { data } = await apiClient.patch<NoteResponse>(
    `/notes/${noteId}/readonly`,
    { is_readonly }
  );
  return data;
}

// Get trash
export async function getTrash(params?: {
  page?: number;
  page_size?: number;
}): Promise<NoteListResponse> {
  const { data } = await apiClient.get<NoteListResponse>("/trash", { params });
  return data;
}

// Get note TOC (table of contents)
export async function getNoteToc(noteId: number): Promise<TocItem[]> {
  const { data } = await apiClient.get<TocItem[]>(`/notes/${noteId}/toc`);
  return data;
}

// Get note summary (for hover preview)
export async function getNoteSummary(
  noteId: number
): Promise<NoteSummaryHover> {
  const { data } = await apiClient.get<NoteSummaryHover>(
    `/notes/${noteId}/summary`
  );
  return data;
}

// Get note versions
export async function getNoteVersions(
  noteId: number
): Promise<NoteVersionBrief[]> {
  const { data } = await apiClient.get<NoteVersionBrief[]>(
    `/notes/${noteId}/versions`
  );
  return data;
}

// Get specific version
export async function getNoteVersion(
  noteId: number,
  versionNo: number
): Promise<NoteVersionFull> {
  const { data } = await apiClient.get<NoteVersionFull>(
    `/notes/${noteId}/versions/${versionNo}`
  );
  return data;
}

// Restore to specific version
export async function restoreNoteVersion(
  noteId: number,
  versionNo: number
): Promise<NoteResponse> {
  const { data } = await apiClient.post<NoteResponse>(
    `/notes/${noteId}/versions/${versionNo}/restore`
  );
  return data;
}

// ============================================
// Edit Lock APIs
// ============================================

export interface EditLockStatus {
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
}

export interface EditLockResponse {
  success: boolean;
  message: string;
  locked_by?: string;
}

// Check edit lock status
export async function checkEditLock(noteId: number): Promise<EditLockStatus> {
  const { data } = await apiClient.get<EditLockStatus>(`/notes/${noteId}/lock`);
  return data;
}

// Acquire edit lock
export async function acquireEditLock(
  noteId: number,
  lockedBy: string,
  force: boolean = false
): Promise<EditLockResponse> {
  const { data } = await apiClient.post<EditLockResponse>(
    `/notes/${noteId}/lock`,
    { locked_by: lockedBy, force }
  );
  return data;
}

// Release edit lock
export async function releaseEditLock(
  noteId: number,
  lockedBy: string
): Promise<EditLockResponse> {
  const { data } = await apiClient.delete<EditLockResponse>(
    `/notes/${noteId}/lock`,
    { params: { locked_by: lockedBy } }
  );
  return data;
}

// Refresh edit lock (extend timeout)
export async function refreshEditLock(
  noteId: number,
  lockedBy: string
): Promise<EditLockResponse> {
  const { data } = await apiClient.patch<EditLockResponse>(
    `/notes/${noteId}/lock/refresh`,
    { locked_by: lockedBy }
  );
  return data;
}
