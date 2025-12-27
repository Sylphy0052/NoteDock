import apiClient from './client'
import type { AppSettings, AvailableModelsResponse, SettingsUpdate } from './types'

// Get all settings
export async function getSettings(): Promise<AppSettings> {
  const response = await apiClient.get<AppSettings>('/v1/settings')
  return response.data
}

// Update settings
export async function updateSettings(data: SettingsUpdate): Promise<AppSettings> {
  const response = await apiClient.put<AppSettings>('/v1/settings', data)
  return response.data
}

// Get available AI models
export async function getAvailableModels(): Promise<AvailableModelsResponse> {
  const response = await apiClient.get<AvailableModelsResponse>('/v1/settings/models')
  return response.data
}
