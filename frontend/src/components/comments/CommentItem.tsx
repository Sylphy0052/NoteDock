import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Edit2,
  Trash2,
  Check,
  X,
  CornerDownRight,
} from "lucide-react";
import { updateComment, deleteComment } from "../../api/comments";
import type { Comment } from "../../api/types";
import { formatDate } from "../../utils/date";

interface CommentItemProps {
  comment: Comment;
  noteId: number;
  currentDisplayName: string;
  onReply: (parentId: number) => void;
  depth?: number;
}

export function CommentItem({
  comment,
  noteId,
  currentDisplayName,
  onReply,
  depth = 0,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const isOwner = comment.display_name === currentDisplayName;
  const maxDepth = 3;

  const updateMutation = useMutation({
    mutationFn: () => updateComment(comment.id, { content: editContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", noteId] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", noteId] });
      setShowDeleteConfirm(false);
    },
  });

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      updateMutation.mutate();
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div className={`comment-item depth-${Math.min(depth, maxDepth)}`}>
      <div className="comment-header">
        <span className="comment-author">{comment.display_name}</span>
        <span className="comment-date">{formatDate(comment.created_at)}</span>
        {comment.updated_at !== comment.created_at && (
          <span className="comment-edited">(編集済み)</span>
        )}
      </div>

      {isEditing ? (
        <div className="comment-edit-form">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="comment-edit-textarea"
            rows={3}
          />
          <div className="comment-edit-actions">
            <button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending || !editContent.trim()}
              className="btn btn-sm btn-primary"
            >
              <Check size={14} />
              保存
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={updateMutation.isPending}
              className="btn btn-sm btn-secondary"
            >
              <X size={14} />
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="comment-content">{comment.content}</div>
      )}

      <div className="comment-actions">
        {depth < maxDepth && (
          <button
            onClick={() => onReply(comment.id)}
            className="comment-action-btn"
            title="返信"
          >
            <CornerDownRight size={14} />
            返信
          </button>
        )}
        {isOwner && !isEditing && (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="comment-action-btn"
              title="編集"
            >
              <Edit2 size={14} />
              編集
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="comment-action-btn comment-action-delete"
              title="削除"
            >
              <Trash2 size={14} />
              削除
            </button>
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="comment-delete-confirm">
          <span>このコメントを削除しますか？</span>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="btn btn-sm btn-danger"
          >
            削除
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            disabled={deleteMutation.isPending}
            className="btn btn-sm btn-secondary"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* Render replies recursively */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              noteId={noteId}
              currentDisplayName={currentDisplayName}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
