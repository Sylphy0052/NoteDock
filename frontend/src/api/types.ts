// Common types
export interface Tag {
  id: number
  name: string
}

export interface Folder {
  id: number
  name: string
  parent_id: number | null
  children?: Folder[]
}

export interface FileInfo {
  id: number
  original_name: string
  mime_type: string
  size_bytes: number
}

// Company types
export interface Company {
  id: number
  name: string
  created_at: string
  updated_at: string
  project_count: number
}

export interface CompanyCreate {
  name: string
}

export interface CompanyUpdate {
  name?: string
}

export interface CompanyListResponse {
  items: Company[]
  total: number
  page: number
  page_size: number
}

// Project types
export interface Project {
  id: number
  name: string
  company_id: number | null
  company: Company | null
  created_at: string
  updated_at: string
  note_count: number
}

export interface ProjectCreate {
  name: string
  company_id?: number | null
}

export interface ProjectUpdate {
  name?: string
  company_id?: number | null
}

export interface ProjectListResponse {
  items: Project[]
  total: number
  page: number
  page_size: number
}

export interface ProjectSummary {
  id: number
  name: string
  company_name: string | null
}

// Note types
export interface NoteSummary {
  id: number
  title: string
  updated_at: string
  tags: Tag[]
  folder_id: number | null
  folder_name: string | null
  project_id: number | null
  project_name: string | null
  is_pinned: boolean
  is_readonly: boolean
  is_hidden_from_home: boolean
  cover_file_url: string | null
  created_by: string | null
  view_count: number
}

export interface NoteResponse {
  id: number
  title: string
  content_md: string
  folder_id: number | null
  folder: Folder | null
  project_id: number | null
  project: Project | null
  is_pinned: boolean
  is_readonly: boolean
  is_hidden_from_home: boolean
  cover_file_id: number | null
  cover_file_url: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  created_by: string | null
  updated_by: string | null
  view_count: number
  tags: Tag[]
  files: FileInfo[]
}

export interface NoteListResponse {
  items: NoteSummary[]
  total: number
  page: number
  page_size: number
}

export interface NoteCreate {
  title: string
  content_md: string
  folder_id?: number | null
  project_id?: number | null
  is_pinned?: boolean
  is_readonly?: boolean
  is_hidden_from_home?: boolean
  cover_file_id?: number | null
  tag_names?: string[]
  created_by?: string
}

export interface NoteUpdate {
  title?: string
  content_md?: string
  folder_id?: number | null
  project_id?: number | null
  is_pinned?: boolean
  is_readonly?: boolean
  is_hidden_from_home?: boolean
  cover_file_id?: number | null
  tag_names?: string[]
  updated_by?: string
}

// Settings types
export interface AppSettings {
  discord_notification_enabled: boolean
  discord_notify_on_create: boolean
  discord_notify_on_update: boolean
  discord_notify_on_comment: boolean
  ai_model: string
}

export interface SettingsUpdate {
  discord_notification_enabled?: boolean
  discord_notify_on_create?: boolean
  discord_notify_on_update?: boolean
  discord_notify_on_comment?: boolean
  ai_model?: string
}

// Model speed category
export type ModelSpeed = 'fast' | 'medium' | 'slow'

// Model information
export interface ModelInfo {
  id: string
  name: string
  speed: ModelSpeed
  provider: string
}

// Available models response
export interface AvailableModelsResponse {
  models: ModelInfo[]
  current_model: string
}

export interface NoteSummaryHover {
  id: number
  title: string
  summary: string
  updated_at: string
}

export interface TocItem {
  id: string
  text: string
}

// Version types
export interface NoteVersionBrief {
  id: number
  version_no: number
  title: string
  created_at: string
}

export interface NoteVersionFull {
  id: number
  version_no: number
  title: string
  content_md: string
  created_at: string
}

// Comment types
export interface Comment {
  id: number
  note_id: number
  parent_id: number | null
  display_name: string
  content: string
  created_at: string
  updated_at: string
  replies: Comment[]
}

export interface CommentCreate {
  content: string
  display_name: string
  parent_id?: number | null
}

export interface CommentUpdate {
  content: string
}

// Search types
export interface SearchParams {
  q?: string
  tag?: string
  folder_id?: number
  page?: number
  page_size?: number
}

export interface SearchResult {
  items: NoteSummary[]
  total: number
  page: number
  page_size: number
}

// Linkmap types
export interface LinkmapNode {
  id: number
  title: string
  tag_ids: number[]
  folder_id: number | null
}

export interface LinkmapEdge {
  from_note_id: number
  to_note_id: number
}

export interface LinkmapResponse {
  nodes: LinkmapNode[]
  edges: LinkmapEdge[]
}

// File upload types
export interface FileUploadResponse {
  id: number
  original_name: string
  stored_key: string
  mime_type: string
  size_bytes: number
}

// File response with full info
export interface FileResponse {
  id: number
  original_name: string
  mime_type: string
  size_bytes: number
  created_at: string
  url: string
  preview_url: string | null
}

// File list response
export interface FileListResponse {
  items: FileResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// File list params
export interface FileListParams {
  search?: string
  mime_type?: string
  page?: number
  page_size?: number
}

// Import/Export types
export interface ImportResult {
  imported_notes: number
  imported_files: number
  errors: string[]
}

// Message response
export interface MessageResponse {
  message: string
}

// === AI Types ===

// Model variants available (verified with ASK API)
export type ModelVariant =
  // OpenAI GPT models
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4.1'
  | 'gpt-5'
  | 'gpt-5-thinking'
  | 'gpt-5.1'
  | 'gpt-5.1-thinking'
  | 'gpt-5.2'
  | 'gpt-5.2-thinking'
  // OpenAI o-series
  | 'o3-mini'
  | 'o3-mini-high'
  | 'o4-mini'
  | 'o4-mini-high'
  // Anthropic Claude models
  | 'claude-4-sonnet'
  | 'claude-4-sonnet-thinking'
  | 'claude-45-sonnet'
  | 'claude-45-sonnet-thinking'
  // Google Gemini models
  | 'gemini-2.0-flash-001'
  | 'gemini-2.0-flash-001-web-search'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-flash-web-search'

// Stream event types
export type StreamEventType =
  | 'add_progress_message'
  | 'add_message_token'
  | 'add_used_sources'
  | 'add_citation_markers'
  | 'replace_message'
  | 'add_bot_message_id'
  | 'add_output'
  | 'error'

// Source metadata
export interface SourceMetadata {
  source: string
  sourceType?: string
  line?: number
  fileId?: number
  fileUrl?: string
}

// Bot response source
export interface BotResponseSource {
  contentID?: string
  pageContent: string
  metadata: SourceMetadata
}

// Citation marker
export interface CitationMarker {
  start: number
  end: number
  contentIDs: string[]
}

// Stream event from AI
export interface StreamEvent {
  type: StreamEventType
  message?: string
  token?: string
  sources?: BotResponseSource[]
  citationMarkers?: CitationMarker[]
  id?: string
}

// AI Status response
export interface AIStatusResponse {
  enabled: boolean
  defaultModel: string
}

// Generate options
export interface GenerateOptions {
  template?: string
  fileIds?: string[]
  modelVariant?: ModelVariant
  chatId?: string
  parentId?: string
}

// Summarize options
export interface SummarizeOptions {
  length?: 'short' | 'medium' | 'long'
  style?: 'bullet' | 'paragraph'
  focus?: string
  additionalFileIds?: string[]
}

// Ask options
export interface AskOptions {
  fileIds?: string[]
  chatId?: string
  parentId?: string
}

// Folder summarize options
export interface FolderSummarizeOptions {
  length?: 'short' | 'medium' | 'long'
  style?: 'bullet' | 'paragraph'
  focus?: string
  additionalFileIds?: string[]
}

// Folder ask options
export interface FolderAskOptions {
  fileIds?: string[]
  chatId?: string
  parentId?: string
}

// Project ask options
export interface ProjectAskOptions {
  fileIds?: string[]
  chatId?: string
  parentId?: string
}

// Assist modes
export type AssistMode = 'improve' | 'simplify' | 'expand' | 'translate' | 'custom' | 'weekly_report'

// Assist options
export interface AssistOptions {
  customInstructions?: string
  targetLanguage?: string
  fileIds?: string[]
  context?: string // Additional context for weekly_report mode (project/note information)
}

// File upload response for AI
export interface AIFileUploadResponse {
  fileId: string
}

// Tag suggestion types
export interface TagSuggestion {
  name: string
  reason: string
  isExisting: boolean
}

export interface SuggestTagsRequest {
  title: string
  content: string
  maxSuggestions?: number
}

export interface SuggestTagsResponse {
  suggestions: TagSuggestion[]
}
