/**
 * Templates API
 */

import apiClient from "./client";

// Types
export interface Template {
  id: number;
  name: string;
  description: string;
  content: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateListResponse {
  items: Template[];
  total: number;
}

export interface TemplateCreate {
  name: string;
  description?: string;
  content?: string;
}

export interface TemplateUpdate {
  name?: string;
  description?: string;
  content?: string;
}

// API functions

/**
 * Get all templates (system + user)
 */
export async function getTemplates(): Promise<TemplateListResponse> {
  const response = await apiClient.get<TemplateListResponse>("/templates");
  return response.data;
}

/**
 * Get a template by ID
 */
export async function getTemplate(templateId: number): Promise<Template> {
  const response = await apiClient.get<Template>(`/templates/${templateId}`);
  return response.data;
}

/**
 * Create a new user template
 */
export async function createTemplate(data: TemplateCreate): Promise<Template> {
  const response = await apiClient.post<Template>("/templates", data);
  return response.data;
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: number,
  data: TemplateUpdate
): Promise<Template> {
  const response = await apiClient.put<Template>(
    `/templates/${templateId}`,
    data
  );
  return response.data;
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  templateId: number
): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(
    `/templates/${templateId}`
  );
  return response.data;
}
