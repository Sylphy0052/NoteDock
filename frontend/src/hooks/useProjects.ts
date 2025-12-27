import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  searchProjects,
  getProjectNotes,
  getProjectSummary,
} from '../api/projects'
import type { ProjectCreate, ProjectUpdate } from '../api/types'

// Query keys
const PROJECTS_KEY = 'projects'

/**
 * Hook to fetch projects list with pagination.
 */
export function useProjects(params?: {
  page?: number
  page_size?: number
  q?: string
  company_id?: number
}) {
  return useQuery({
    queryKey: [PROJECTS_KEY, 'list', params],
    queryFn: () => getProjects(params),
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch a single project by ID.
 */
export function useProject(projectId: number | undefined) {
  return useQuery({
    queryKey: [PROJECTS_KEY, 'detail', projectId],
    queryFn: () => getProject(projectId!),
    enabled: projectId !== undefined,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to search projects.
 */
export function useSearchProjects(query: string) {
  return useQuery({
    queryKey: [PROJECTS_KEY, 'search', query],
    queryFn: () => searchProjects(query),
    enabled: query.length > 0,
    staleTime: 10 * 1000,
  })
}

/**
 * Hook to fetch notes for a project.
 */
export function useProjectNotes(
  projectId: number | undefined,
  params?: {
    page?: number
    page_size?: number
  }
) {
  return useQuery({
    queryKey: [PROJECTS_KEY, 'notes', projectId, params],
    queryFn: () => getProjectNotes(projectId!, params),
    enabled: projectId !== undefined,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to fetch project summary (for hover preview).
 */
export function useProjectSummary(projectId: number | undefined) {
  return useQuery({
    queryKey: [PROJECTS_KEY, 'summary', projectId],
    queryFn: () => getProjectSummary(projectId!),
    enabled: projectId !== undefined,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to create a new project.
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProjectCreate) => createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_KEY] })
    },
  })
}

/**
 * Hook to update a project.
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProjectUpdate }) => updateProject(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_KEY] })
      queryClient.invalidateQueries({ queryKey: [PROJECTS_KEY, 'detail', variables.id] })
    },
  })
}

/**
 * Hook to delete a project.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: number) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_KEY] })
    },
  })
}
