import { useState, useCallback, useRef, useEffect } from 'react'
import { MessageCircle, Send, Loader2, X, Trash2, FolderOpen } from 'lucide-react'
import { AIStreamingText } from './AIStreamingText'
import { useAskAI } from '../../hooks/useAskAI'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AIFolderAskPanelProps {
  folderId: number
  folderName: string
  isOpen: boolean
  onClose: () => void
}

/**
 * Panel for asking AI questions about all notes in a folder.
 * Displays as a collapsible side panel with chat history.
 */
export function AIFolderAskPanel({
  folderId,
  folderName,
  isOpen,
  onClose,
}: AIFolderAskPanelProps) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingResponse, setPendingResponse] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { isLoading, content, error, askFolderFn, cancel, reset } = useAskAI()

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, content])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  // Reset messages when folder changes
  useEffect(() => {
    setMessages([])
    setPendingResponse(false)
    reset()
  }, [folderId, reset])

  // Capture completed response when streaming finishes
  useEffect(() => {
    if (pendingResponse && !isLoading && content) {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: content,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setPendingResponse(false)
      reset()
    }
  }, [isLoading, content, pendingResponse, reset])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!question.trim() || isLoading) return

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: question.trim(),
      }
      setMessages((prev) => [...prev, userMessage])
      const currentQuestion = question.trim()
      setQuestion('')
      setPendingResponse(true)

      await askFolderFn(folderId, currentQuestion)
    },
    [question, isLoading, folderId, askFolderFn]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleClearHistory = useCallback(() => {
    setMessages([])
    setPendingResponse(false)
    reset()
  }, [reset])

  const handleClose = useCallback(() => {
    cancel()
    onClose()
  }, [cancel, onClose])

  if (!isOpen) return null

  return (
    <div className="ai-ask-panel">
      <div className="ai-ask-panel-header">
        <div className="ai-ask-panel-title">
          <MessageCircle size={18} />
          <span>AIに質問</span>
        </div>
        <div className="ai-ask-panel-actions">
          {messages.length > 0 && (
            <button
              className="btn btn-icon btn-sm"
              onClick={handleClearHistory}
              title="履歴をクリア"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            className="btn btn-icon btn-sm"
            onClick={handleClose}
            title="閉じる"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="ai-ask-panel-note-info">
        <FolderOpen size={16} />
        <span className="ai-ask-panel-note-label">対象フォルダ:</span>
        <span className="ai-ask-panel-note-title">{folderName}</span>
        <span className="ai-ask-panel-note-hint">（サブフォルダ含む）</span>
      </div>

      <div className="ai-ask-panel-messages">
        {messages.length === 0 && !isLoading && (
          <div className="ai-ask-panel-empty">
            <MessageCircle size={32} />
            <p>このフォルダについて質問してください</p>
            <p className="ai-ask-panel-hint">
              例: 「このフォルダの内容を教えて」「○○に関する情報は？」
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`ai-ask-message ${message.role}`}>
            <div className="ai-ask-message-role">
              {message.role === 'user' ? 'あなた' : 'AI'}
            </div>
            <div className="ai-ask-message-content">{message.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="ai-ask-message assistant">
            <div className="ai-ask-message-role">AI</div>
            <AIStreamingText
              content={content}
              isLoading={isLoading}
              className="ai-ask-message-content"
            />
          </div>
        )}

        {error && (
          <div className="ai-ask-error">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="ai-ask-panel-input" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="質問を入力... (Shift+Enterで改行)"
          disabled={isLoading}
          rows={2}
        />
        <button
          type="submit"
          className="btn btn-primary btn-icon"
          disabled={!question.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>
    </div>
  )
}
