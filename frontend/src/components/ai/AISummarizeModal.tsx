import { useState, useCallback, useEffect } from 'react'
import { FileText, Loader2, Copy, Check, X } from 'lucide-react'
import Modal from '../common/Modal'
import { AIStreamingText } from './AIStreamingText'
import { useAskAI } from '../../hooks/useAskAI'

interface AISummarizeModalProps {
  isOpen: boolean
  onClose: () => void
  noteId: number
  noteTitle: string
}

type SummaryLength = 'short' | 'medium' | 'long'
type SummaryStyle = 'paragraph' | 'bullets' | 'outline'

interface LengthOption {
  value: SummaryLength
  label: string
  description: string
}

interface StyleOption {
  value: SummaryStyle
  label: string
  description: string
}

const lengthOptions: LengthOption[] = [
  { value: 'short', label: '短め', description: '1-2文程度' },
  { value: 'medium', label: '標準', description: '3-5文程度' },
  { value: 'long', label: '詳細', description: '段落単位' },
]

const styleOptions: StyleOption[] = [
  { value: 'paragraph', label: '段落', description: '文章形式' },
  { value: 'bullets', label: '箇条書き', description: 'ポイント形式' },
  { value: 'outline', label: 'アウトライン', description: '階層形式' },
]

/**
 * Modal for AI note summarization.
 * User can choose summary length and style.
 */
export function AISummarizeModal({
  isOpen,
  onClose,
  noteId,
  noteTitle,
}: AISummarizeModalProps) {
  const [length, setLength] = useState<SummaryLength>('medium')
  const [style, setStyle] = useState<SummaryStyle>('paragraph')
  const [copied, setCopied] = useState(false)
  const { isLoading, content, error, summarize, cancel, reset } = useAskAI()

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setLength('medium')
      setStyle('paragraph')
      setCopied(false)
      reset()
    }
  }, [isOpen, reset])

  const handleSummarize = useCallback(async () => {
    await summarize(noteId, { length, style })
  }, [noteId, length, style, summarize])

  const handleCopy = useCallback(async () => {
    if (content) {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [content])

  const handleClose = useCallback(() => {
    cancel()
    reset()
    setCopied(false)
    onClose()
  }, [cancel, reset, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="ノートを要約"
      size="lg"
    >
      <div className="ai-summarize-modal">
        {/* Note Info */}
        <div className="ai-summarize-note-info">
          <FileText size={18} />
          <span className="ai-summarize-note-title">{noteTitle}</span>
        </div>

        {/* Length Selection */}
        <div className="ai-summarize-options">
          <label className="ai-summarize-label">要約の長さ</label>
          <div className="ai-summarize-option-group">
            {lengthOptions.map((option) => (
              <button
                key={option.value}
                className={`ai-summarize-option-btn ${length === option.value ? 'active' : ''}`}
                onClick={() => setLength(option.value)}
                disabled={isLoading}
              >
                <span className="ai-summarize-option-label">{option.label}</span>
                <span className="ai-summarize-option-desc">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Style Selection */}
        <div className="ai-summarize-options">
          <label className="ai-summarize-label">出力形式</label>
          <div className="ai-summarize-option-group">
            {styleOptions.map((option) => (
              <button
                key={option.value}
                className={`ai-summarize-option-btn ${style === option.value ? 'active' : ''}`}
                onClick={() => setStyle(option.value)}
                disabled={isLoading}
              >
                <span className="ai-summarize-option-label">{option.label}</span>
                <span className="ai-summarize-option-desc">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="ai-summarize-error">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        {(content || isLoading) && (
          <div className="ai-summarize-result-section">
            <label className="ai-summarize-label">要約結果</label>
            <AIStreamingText
              content={content}
              isLoading={isLoading}
              className="ai-summarize-result"
            />
          </div>
        )}

        <div className="ai-summarize-actions">
          {isLoading ? (
            <button className="btn btn-secondary" onClick={cancel}>
              <X size={16} />
              キャンセル
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSummarize}
            >
              <FileText size={16} />
              要約を生成
            </button>
          )}

          {content && !isLoading && (
            <button className="btn btn-secondary" onClick={handleCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'コピー完了' : 'コピー'}
            </button>
          )}
        </div>

        {isLoading && (
          <div className="ai-summarize-loading">
            <Loader2 size={16} className="animate-spin" />
            <span>要約中...</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
