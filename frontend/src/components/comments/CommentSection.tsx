import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, User, X } from 'lucide-react'
import { getComments, createComment } from '../../api/comments'
import { useDisplayName } from '../../hooks/useDisplayName'
import { CommentItem } from './CommentItem'
import type { Comment } from '../../api/types'

interface CommentSectionProps {
  noteId: number
}

export function CommentSection({ noteId }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('')
  const [replyToId, setReplyToId] = useState<number | null>(null)
  const [showNameInput, setShowNameInput] = useState(false)
  const [tempName, setTempName] = useState('')
  const queryClient = useQueryClient()
  const { displayName, setDisplayName, isDefault } = useDisplayName()

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', noteId],
    queryFn: () => getComments(noteId),
  })

  const createMutation = useMutation({
    mutationFn: (data: { content: string; parentId: number | null }) =>
      createComment(noteId, {
        content: data.content,
        display_name: displayName,
        parent_id: data.parentId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', noteId] })
      setNewComment('')
      setReplyToId(null)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      createMutation.mutate({
        content: newComment.trim(),
        parentId: replyToId,
      })
    }
  }

  const handleSaveName = () => {
    if (tempName.trim()) {
      setDisplayName(tempName.trim())
    }
    setShowNameInput(false)
    setTempName('')
  }

  const handleReply = (parentId: number) => {
    setReplyToId(parentId)
    // Scroll to comment form
    document.querySelector('.comment-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const getReplyToComment = (): Comment | null => {
    if (!replyToId) return null

    const findComment = (comments: Comment[]): Comment | null => {
      for (const comment of comments) {
        if (comment.id === replyToId) return comment
        if (comment.replies) {
          const found = findComment(comment.replies)
          if (found) return found
        }
      }
      return null
    }

    return findComment(comments)
  }

  const replyToComment = getReplyToComment()

  return (
    <div className="comment-section">
      <div className="comment-section-header">
        <h3>
          <MessageSquare size={20} />
          コメント ({comments.length})
        </h3>
        <button
          onClick={() => {
            setTempName(displayName)
            setShowNameInput(true)
          }}
          className="display-name-btn"
          title="表示名を変更"
        >
          <User size={16} />
          {displayName}
        </button>
      </div>

      {showNameInput && (
        <div className="display-name-modal-overlay">
          <div className="display-name-modal">
            <h4>表示名の設定</h4>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="表示名を入力"
              className="display-name-input"
              maxLength={50}
              autoFocus
            />
            <div className="display-name-actions">
              <button onClick={handleSaveName} className="btn btn-primary">
                保存
              </button>
              <button onClick={() => setShowNameInput(false)} className="btn btn-secondary">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="comment-form">
        {replyToComment && (
          <div className="reply-indicator">
            <span>返信先: {replyToComment.display_name}</span>
            <button type="button" onClick={() => setReplyToId(null)} className="cancel-reply-btn">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="comment-input-wrapper">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyToId ? '返信を入力...' : 'コメントを入力...'}
            className="comment-textarea"
            rows={3}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || createMutation.isPending}
            className="comment-submit-btn"
          >
            <Send size={18} />
          </button>
        </div>
      </form>

      <div className="comment-list">
        {isLoading ? (
          <div className="comment-loading">読み込み中...</div>
        ) : comments.length === 0 ? (
          <div className="comment-empty">
            まだコメントはありません。最初のコメントを投稿してみましょう。
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              noteId={noteId}
              currentDisplayName={displayName}
              onReply={handleReply}
            />
          ))
        )}
      </div>
    </div>
  )
}
