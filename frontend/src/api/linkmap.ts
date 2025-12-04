import apiClient from "./client";
import type { LinkmapResponse } from "./types";

// Get full linkmap
export async function getLinkmap(): Promise<LinkmapResponse> {
  const { data } = await apiClient.get<LinkmapResponse>("/linkmap");
  return data;
}

// Get linkmap for a specific note (neighborhood)
export async function getNoteLinkmap(noteId: number): Promise<LinkmapResponse> {
  const { data } = await apiClient.get<LinkmapResponse>(`/linkmap/${noteId}`);
  return data;
}
