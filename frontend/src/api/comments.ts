import apiClient from "./client";
import type {
  Comment,
  CommentCreate,
  CommentUpdate,
  MessageResponse,
} from "./types";

// Get comments for a note
export async function getComments(noteId: number): Promise<Comment[]> {
  const { data } = await apiClient.get<Comment[]>(
    `/notes/${noteId}/comments`
  );
  return data;
}

// Create comment
export async function createComment(
  noteId: number,
  comment: CommentCreate
): Promise<Comment> {
  const { data } = await apiClient.post<Comment>(
    `/notes/${noteId}/comments`,
    comment
  );
  return data;
}

// Update comment
export async function updateComment(
  commentId: number,
  comment: CommentUpdate
): Promise<Comment> {
  const { data } = await apiClient.put<Comment>(
    `/comments/${commentId}`,
    comment
  );
  return data;
}

// Delete comment
export async function deleteComment(
  commentId: number
): Promise<MessageResponse> {
  const { data } = await apiClient.delete<MessageResponse>(
    `/comments/${commentId}`
  );
  return data;
}
