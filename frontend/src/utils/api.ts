/**
 * API URL utilities
 */

import apiClient from '../api/client'

/**
 * Convert a relative file URL from the API to an absolute URL
 * e.g., "/api/files/1/preview" -> "http://localhost:8000/api/files/1/preview"
 */
export function getFileUrl(relativeUrl: string | null | undefined): string | null {
  if (!relativeUrl) {
    return null
  }

  // If already absolute URL, return as is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl
  }

  // Get API host from client baseURL (remove /api suffix)
  const apiHost = apiClient.defaults.baseURL?.replace(/\/api$/, '') || 'http://localhost:8000'

  // Convert relative URL to absolute
  return `${apiHost}${relativeUrl}`
}
