// Common types
export interface Tag {
  id: number;
  name: string;
}

export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  children?: Folder[];
}

export interface FileInfo {
  id: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
}

// Note types
export interface NoteSummary {
  id: number;
  title: string;
  updated_at: string;
  tags: Tag[];
  folder_id: number | null;
  is_pinned: boolean;
  is_readonly: boolean;
  cover_file_url: string | null;
}

export interface NoteResponse {
  id: number;
  title: string;
  content_md: string;
  folder_id: number | null;
  folder: Folder | null;
  is_pinned: boolean;
  is_readonly: boolean;
  cover_file_id: number | null;
  cover_file_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tags: Tag[];
  files: FileInfo[];
}

export interface NoteListResponse {
  items: NoteSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface NoteCreate {
  title: string;
  content_md: string;
  folder_id?: number | null;
  is_pinned?: boolean;
  is_readonly?: boolean;
  cover_file_id?: number | null;
  tag_names?: string[];
}

export interface NoteUpdate {
  title?: string;
  content_md?: string;
  folder_id?: number | null;
  is_pinned?: boolean;
  is_readonly?: boolean;
  cover_file_id?: number | null;
  tag_names?: string[];
}

export interface NoteSummaryHover {
  id: number;
  title: string;
  summary: string;
  updated_at: string;
}

export interface TocItem {
  id: string;
  text: string;
}

// Version types
export interface NoteVersionBrief {
  id: number;
  version_no: number;
  title: string;
  created_at: string;
}

export interface NoteVersionFull {
  id: number;
  version_no: number;
  title: string;
  content_md: string;
  created_at: string;
}

// Comment types
export interface Comment {
  id: number;
  note_id: number;
  parent_id: number | null;
  display_name: string;
  content: string;
  created_at: string;
  updated_at: string;
  replies: Comment[];
}

export interface CommentCreate {
  content: string;
  display_name: string;
  parent_id?: number | null;
}

export interface CommentUpdate {
  content: string;
}

// Search types
export interface SearchParams {
  q?: string;
  tag?: string;
  folder_id?: number;
  page?: number;
  page_size?: number;
}

export interface SearchResult {
  items: NoteSummary[];
  total: number;
  page: number;
  page_size: number;
}

// Linkmap types
export interface LinkmapNode {
  id: number;
  title: string;
}

export interface LinkmapEdge {
  from_note_id: number;
  to_note_id: number;
}

export interface LinkmapResponse {
  nodes: LinkmapNode[];
  edges: LinkmapEdge[];
}

// File upload types
export interface FileUploadResponse {
  id: number;
  original_name: string;
  stored_key: string;
  mime_type: string;
  size_bytes: number;
}

// Import/Export types
export interface ImportResult {
  imported_notes: number;
  imported_files: number;
  errors: string[];
}

// Message response
export interface MessageResponse {
  message: string;
}
