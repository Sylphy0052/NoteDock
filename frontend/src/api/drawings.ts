import apiClient from './client'

// === Types ===

export interface DrawingSummary {
  id: string
  name: string
  description: string | null
  canvas_width: number
  canvas_height: number
  is_public: boolean
  owner_name: string | null
  shape_count: number
  created_at: string
  updated_at: string
}

export interface DrawingResponse {
  id: string
  name: string
  description: string | null
  shapes: Shape[]
  canvas_width: number
  canvas_height: number
  is_public: boolean
  owner_id: string | null
  owner_name: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface Shape {
  id: string
  type: string
  x: number
  y: number
  rotation?: number
  stroke?: string
  strokeWidth?: number
  fill?: string
  opacity?: number
  locked?: boolean
  visible?: boolean
  [key: string]: unknown
}

export interface DrawingCreate {
  name: string
  description?: string
  shapes?: Shape[]
  canvas_width?: number
  canvas_height?: number
  is_public?: boolean
  owner_name?: string
}

export interface DrawingUpdate {
  name?: string
  description?: string
  shapes?: Shape[]
  canvas_width?: number
  canvas_height?: number
  is_public?: boolean
}

export interface DrawingListResponse {
  items: DrawingSummary[]
  total: number
  page: number
  per_page: number
  pages: number
}

// Share types
export interface ShareCreate {
  permission?: 'view' | 'edit'
  password?: string
  expires_in_days?: number
}

export interface ShareResponse {
  id: string
  drawing_id: string
  share_token: string
  permission: string
  has_password: boolean
  expires_at: string | null
  access_count: number
  created_at: string
}

export interface SharedDrawingResponse {
  drawing: DrawingResponse
  permission: string
  can_edit: boolean
}

// Comment types
export interface CommentCreate {
  content: string
  author_name: string
  author_color?: string
  shape_id?: string
  position_x?: number
  position_y?: number
}

export interface CommentUpdate {
  content?: string
  resolved?: boolean
}

export interface CommentResponse {
  id: string
  drawing_id: string
  content: string
  shape_id: string | null
  position_x: number | null
  position_y: number | null
  author_name: string
  author_color: string | null
  resolved: boolean
  created_at: string
  updated_at: string
}

// History types
export interface HistoryResponse {
  id: string
  drawing_id: string
  action_type: string
  action_data: Record<string, unknown>
  actor_name: string | null
  actor_color: string | null
  version: number
  created_at: string
}

export interface MessageResponse {
  message: string
}

// === Drawing CRUD ===

export async function getDrawings(params?: {
  page?: number
  per_page?: number
  q?: string
  is_public?: boolean
}): Promise<DrawingListResponse> {
  const { data } = await apiClient.get<DrawingListResponse>(
    '/drawings',
    { params }
  )
  return data
}

export async function getDrawing(drawingId: string): Promise<DrawingResponse> {
  const { data } = await apiClient.get<DrawingResponse>(
    `/drawings/${drawingId}`
  )
  return data
}

export async function createDrawing(
  drawing: DrawingCreate
): Promise<DrawingResponse> {
  const { data } = await apiClient.post<DrawingResponse>('/drawings', drawing)
  return data
}

export async function updateDrawing(
  drawingId: string,
  drawing: DrawingUpdate
): Promise<DrawingResponse> {
  const { data } = await apiClient.put<DrawingResponse>(
    `/drawings/${drawingId}`,
    drawing
  )
  return data
}

export async function deleteDrawing(
  drawingId: string
): Promise<MessageResponse> {
  const { data } = await apiClient.delete<MessageResponse>(
    `/drawings/${drawingId}`
  )
  return data
}

// === Share Operations ===

export async function createShare(
  drawingId: string,
  share: ShareCreate
): Promise<ShareResponse> {
  const { data } = await apiClient.post<ShareResponse>(
    `/drawings/${drawingId}/share`,
    share
  )
  return data
}

export async function getShares(drawingId: string): Promise<ShareResponse[]> {
  const { data } = await apiClient.get<ShareResponse[]>(
    `/drawings/${drawingId}/shares`
  )
  return data
}

export async function getSharedDrawing(
  token: string,
  password?: string
): Promise<SharedDrawingResponse> {
  const params = password ? { password } : undefined
  const { data } = await apiClient.get<SharedDrawingResponse>(
    `/drawings/shared/${token}`,
    { params }
  )
  return data
}

export async function deleteShare(
  drawingId: string,
  shareId: string
): Promise<MessageResponse> {
  const { data } = await apiClient.delete<MessageResponse>(
    `/drawings/${drawingId}/shares/${shareId}`
  )
  return data
}

// === Comment Operations ===

export async function getComments(
  drawingId: string,
  includeResolved = true
): Promise<CommentResponse[]> {
  const { data } = await apiClient.get<CommentResponse[]>(
    `/drawings/${drawingId}/comments`,
    { params: { include_resolved: includeResolved } }
  )
  return data
}

export async function createComment(
  drawingId: string,
  comment: CommentCreate
): Promise<CommentResponse> {
  const { data } = await apiClient.post<CommentResponse>(
    `/drawings/${drawingId}/comments`,
    comment
  )
  return data
}

export async function updateComment(
  drawingId: string,
  commentId: string,
  comment: CommentUpdate
): Promise<CommentResponse> {
  const { data } = await apiClient.put<CommentResponse>(
    `/drawings/${drawingId}/comments/${commentId}`,
    comment
  )
  return data
}

export async function deleteComment(
  drawingId: string,
  commentId: string
): Promise<MessageResponse> {
  const { data } = await apiClient.delete<MessageResponse>(
    `/drawings/${drawingId}/comments/${commentId}`
  )
  return data
}

// === History Operations ===

export async function getHistory(
  drawingId: string,
  limit = 100
): Promise<HistoryResponse[]> {
  const { data } = await apiClient.get<HistoryResponse[]>(
    `/drawings/${drawingId}/history`,
    { params: { limit } }
  )
  return data
}

export async function rollbackDrawing(
  drawingId: string,
  version: number
): Promise<DrawingResponse> {
  const { data } = await apiClient.post<DrawingResponse>(
    `/drawings/${drawingId}/rollback`,
    { version }
  )
  return data
}

// === Utility Functions ===

export function generateShareUrl(token: string): string {
  const baseUrl = window.location.origin
  return `${baseUrl}/drawing/shared/${token}`
}

// === AI Drawing Assistance ===

export interface AIShapeSuggestionRequest {
  prompt: string
  canvas_width?: number
  canvas_height?: number
  existing_shapes?: Shape[]
}

export interface AIShapeSuggestionResponse {
  shapes: Shape[]
  explanation: string
}

export interface AILayoutOptimizeRequest {
  shapes: Shape[]
  canvas_width?: number
  canvas_height?: number
  optimization_type?: 'auto' | 'align' | 'distribute' | 'compact'
}

export interface AILayoutOptimizeResponse {
  shapes: Shape[]
  changes: string[]
}

export async function suggestShapes(
  request: AIShapeSuggestionRequest
): Promise<AIShapeSuggestionResponse> {
  const { data } = await apiClient.post<AIShapeSuggestionResponse>(
    '/drawings/ai/suggest-shapes',
    request
  )
  return data
}

export async function optimizeLayout(
  request: AILayoutOptimizeRequest
): Promise<AILayoutOptimizeResponse> {
  const { data } = await apiClient.post<AILayoutOptimizeResponse>(
    '/drawings/ai/optimize-layout',
    request
  )
  return data
}
