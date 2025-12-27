import apiClient from './client'
import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectListResponse,
  ProjectSummary,
  MessageResponse,
  NoteSummary,
} from './types'

// Get projects list with pagination
export async function getProjects(params?: {
  page?: number
  page_size?: number
  q?: string
  company_id?: number
}): Promise<ProjectListResponse> {
  const { data } = await apiClient.get<Project[]>('/projects', { params })
  // APIは配列を直接返すので、フロントエンドの期待する形式に変換
  return {
    items: data,
    total: data.length,
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 100,
  }
}

// Get single project by ID
export async function getProject(projectId: number): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/projects/${projectId}`)
  return data
}

// Create new project
export async function createProject(project: ProjectCreate): Promise<Project> {
  const { data } = await apiClient.post<Project>('/projects', project)
  return data
}

// Update project
export async function updateProject(projectId: number, project: ProjectUpdate): Promise<Project> {
  const { data } = await apiClient.put<Project>(`/projects/${projectId}`, project)
  return data
}

// Delete project
export async function deleteProject(projectId: number): Promise<MessageResponse> {
  const { data } = await apiClient.delete<MessageResponse>(`/projects/${projectId}`)
  return data
}

// Search projects
export async function searchProjects(q: string): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>('/projects/search', { params: { q } })
  return data
}

// Get notes for a specific project
export async function getProjectNotes(
  projectId: number,
  params?: {
    page?: number
    page_size?: number
  }
): Promise<{ items: NoteSummary[]; total: number; page: number; page_size: number }> {
  const { data } = await apiClient.get('/notes', {
    params: { ...params, project_id: projectId },
  })
  return data
}

// Get project summary (for hover preview)
export async function getProjectSummary(projectId: number): Promise<ProjectSummary> {
  const { data } = await apiClient.get<ProjectSummary>(`/projects/${projectId}/summary`)
  return data
}
