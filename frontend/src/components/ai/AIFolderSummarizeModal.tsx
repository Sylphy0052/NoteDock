import { useState, useCallback, useEffect } from 'react'
import { FolderOpen, Copy, Check, X } from 'lucide-react'
import Modal from '../common/Modal'
import { AIStreamingText } from './AIStreamingText'
import { useAskAI } from '../../hooks/useAskAI'

interface AIFolderSummarizeModalProps {
  isOpen: boolean
  onClose: () => void
  folderId: number
  folderName: string
}

type SummaryLength = 'short' | 'medium' | 'long'
type SummaryStyle = 'paragraph' | 'bullet'

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
  { value: 'short', label: '短め', description: '1-2段落' },
  { value: 'medium', label: '標準', description: '3-5段落' },
  { value: 'long', label: '詳細', description: 'セクション分け' },
]

const styleOptions: StyleOption[] = [
  { value: 'paragraph', label: '段落', description: '文章形式' },
  { value: 'bullet', label: '箇条書き', description: 'ポイント形式' },
]

/**
 * Modal for AI folder summarization.
 * Summarizes all notes in a folder including subfolders.
 */
export function AIFolderSummarizeModal({
  isOpen,
  onClose,
  folderId,
  folderName,
}: AIFolderSummarizeModalProps) {
  const [length, setLength] = useState<SummaryLength>('medium')
  const [style, setStyle] = useState<SummaryStyle>('paragraph')
  const [copied, setCopied] = useState(false)
  const { isLoading, content, error, summarizeFolderFn, cancel, reset } =
    useAskAI()

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
    await summarizeFolderFn(folderId, { length, style })
  }, [folderId, length, style, summarizeFolderFn])

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
    <Modal isOpen={isOpen} onClose={handleClose} title="フォルダを要約" size="lg">
      <div className="ai-summarize-modal">
        {/* Folder Info */}
        <div className="ai-summarize-note-info">
          <FolderOpen size={18} />
          <span className="ai-summarize-note-title">{folderName}</span>
          <span className="ai-summarize-note-hint">（サブフォルダ含む）</span>
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
                <span className="ai-summarize-option-desc">
                  {option.description}
                </span>
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
                <span className="ai-summarize-option-desc">
                  {option.description}
                </span>
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
            <button className="btn btn-primary" onClick={handleSummarize}>
              <FolderOpen size={16} />
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
      </div>
    </Modal>
  )
}
