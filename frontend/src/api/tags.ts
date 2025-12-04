import apiClient from "./client";
import type { Tag } from "./types";

// Get all tags
export async function getTags(): Promise<Tag[]> {
  const { data } = await apiClient.get<Tag[]>("/tags");
  return data;
}

// Get tag suggestions
export async function getTagSuggestions(query: string): Promise<Tag[]> {
  const { data } = await apiClient.get<Tag[]>("/tags/suggest", {
    params: { q: query },
  });
  return data;
}

// Alias for backward compatibility
export const getSuggestedTags = getTagSuggestions;
