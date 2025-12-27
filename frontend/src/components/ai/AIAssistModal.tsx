import { useState, useCallback, useEffect } from 'react'
import {
  Wand2,
  Loader2,
  Copy,
  Check,
  X,
  Languages,
  Sparkles,
  FileEdit,
  ArrowRight,
  CalendarDays,
} from 'lucide-react'
import Modal from '../common/Modal'
import { AIStreamingText } from './AIStreamingText'
import { useAskAI } from '../../hooks/useAskAI'
import { getNote } from '../../api/notes'
import { getProject } from '../../api/projects'
import type { AssistMode } from '../../api/types'

interface AIAssistModalProps {
  isOpen: boolean
  onClose: () => void
  onReplace: (content: string) => void
  selectedText: string
}

interface AssistOption {
  mode: AssistMode
  label: string
  icon: React.ReactNode
  description: string
}

const assistOptions: AssistOption[] = [
  {
    mode: 'improve',
    label: '文章を改善',
    icon: <Sparkles size={18} />,
    description: '文章をより読みやすく、わかりやすく改善します',
  },
  {
    mode: 'simplify',
    label: 'シンプルに',
    icon: <ArrowRight size={18} />,
    description: '複雑な文章をシンプルにします',
  },
  {
    mode: 'expand',
    label: '詳しく展開',
    icon: <Wand2 size={18} />,
    description: '内容を詳しく展開・補足します',
  },
  {
    mode: 'translate',
    label: '翻訳',
    icon: <Languages size={18} />,
    description: '他の言語に翻訳します',
  },
  {
    mode: 'custom',
    label: 'カスタム',
    icon: <FileEdit size={18} />,
    description: '追加指示で自由にカスタマイズ',
  },
  {
    mode: 'weekly_report',
    label: '週報にまとめる',
    icon: <CalendarDays size={18} />,
    description: '@Pや[#]リンクを参照して週報形式に要約',
  },
]

// Helper functions to extract link IDs from text
function extractNoteLinkIds(text: string): number[] {
  const pattern = /\[#(\d+)\]/g
  const ids: number[] = []
  let match
  while ((match = pattern.exec(text)) !== null) {
    ids.push(parseInt(match[1], 10))
  }
  return [...new Set(ids)]
}

function extractProjectLinkIds(text: string): number[] {
  const pattern = /@P(\d+)/g
  const ids: number[] = []
  let match
  while ((match = pattern.exec(text)) !== null) {
    ids.push(parseInt(match[1], 10))
  }
  return [...new Set(ids)]
}

const languageOptions = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: '英語' },
  { value: 'zh', label: '中国語' },
  { value: 'ko', label: '韓国語' },
  { value: 'fr', label: 'フランス語' },
  { value: 'de', label: 'ドイツ語' },
  { value: 'es', label: 'スペイン語' },
]

/**
 * Modal for AI content assistance.
 * User selects text and chooses how to modify it with AI.
 */
export function AIAssistModal({
  isOpen,
  onClose,
  onReplace,
  selectedText,
}: AIAssistModalProps) {
  const [selectedMode, setSelectedMode] = useState<AssistMode | null>(null)
  const [targetLanguage, setTargetLanguage] = useState('en')
  const [customInstructions, setCustomInstructions] = useState('')
  const [copied, setCopied] = useState(false)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [contextError, setContextError] = useState<string | null>(null)
  const { isLoading, content, error, assist, cancel, reset } = useAskAI()

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMode(null)
      setCustomInstructions('')
      setCopied(false)
      setContextError(null)
      reset()
    }
  }, [isOpen, reset])

  // Build context for weekly_report mode by fetching linked notes and projects
  const buildWeeklyReportContext = useCallback(async (text: string): Promise<string> => {
    const noteIds = extractNoteLinkIds(text)
    const projectIds = extractProjectLinkIds(text)

    const contextParts: string[] = []

    // Fetch project information
    if (projectIds.length > 0) {
      contextParts.push('### プロジェクト情報')
      for (const projectId of projectIds) {
        try {
          const project = await getProject(projectId)
          const displayName = project.company
            ? `${project.company.name}/${project.name}`
            : project.name
          contextParts.push(`- @P${projectId}: ${displayName}`)
        } catch (err) {
          console.warn(`Failed to fetch project ${projectId}:`, err)
          contextParts.push(`- @P${projectId}: (取得エラー)`)
        }
      }
      contextParts.push('')
    }

    // Fetch note contents
    if (noteIds.length > 0) {
      contextParts.push('### 参照ノート内容')
      for (const noteId of noteIds) {
        try {
          const note = await getNote(noteId)
          contextParts.push(`#### [#${noteId}] ${note.title}`)
          contextParts.push(note.content_md)
          contextParts.push('')
        } catch (err) {
          console.warn(`Failed to fetch note ${noteId}:`, err)
          contextParts.push(`#### [#${noteId}] (取得エラー)`)
          contextParts.push('')
        }
      }
    }

    return contextParts.join('\n')
  }, [])

  const handleAssist = useCallback(async () => {
    if (!selectedMode || !selectedText) return

    const options: { targetLanguage?: string; customInstructions?: string; context?: string } = {}
    if (selectedMode === 'translate') {
      options.targetLanguage = targetLanguage
    }
    if (customInstructions.trim()) {
      options.customInstructions = customInstructions.trim()
    }

    // For weekly_report mode, fetch context first
    if (selectedMode === 'weekly_report') {
      setIsLoadingContext(true)
      setContextError(null)
      try {
        const context = await buildWeeklyReportContext(selectedText)
        if (context) {
          options.context = context
        }
      } catch (err) {
        setContextError('参照情報の取得に失敗しました')
        setIsLoadingContext(false)
        return
      }
      setIsLoadingContext(false)
    }

    await assist(selectedText, selectedMode, options)
  }, [selectedMode, selectedText, targetLanguage, customInstructions, assist, buildWeeklyReportContext])

  const handleReplace = useCallback(() => {
    if (content) {
      // For weekly_report mode, prepend the original text
      if (selectedMode === 'weekly_report') {
        const combinedContent = `${selectedText}\n\n${content}`
        onReplace(combinedContent)
      } else {
        onReplace(content)
      }
      handleClose()
    }
  }, [content, onReplace, selectedMode, selectedText])

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
    setSelectedMode(null)
    setCustomInstructions('')
    setCopied(false)
    setContextError(null)
    onClose()
  }, [cancel, reset, onClose])

  const handleModeSelect = (mode: AssistMode) => {
    setSelectedMode(mode)
    reset()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="AI アシスト"
      size="lg"
    >
      <div className="ai-assist-modal">
        {/* Selected Text Preview */}
        <div className="ai-assist-original">
          <label className="ai-assist-label">選択テキスト</label>
          <div className="ai-assist-original-text">
            {selectedText || '(テキストが選択されていません)'}
          </div>
        </div>

        {/* Mode Selection */}
        <div className="ai-assist-modes">
          <label className="ai-assist-label">アシストモード</label>
          <div className="ai-assist-mode-grid">
            {assistOptions.map((option) => (
              <button
                key={option.mode}
                className={`ai-assist-mode-btn ${selectedMode === option.mode ? 'active' : ''}`}
                onClick={() => handleModeSelect(option.mode)}
                disabled={isLoading}
              >
                {option.icon}
                <span className="ai-assist-mode-label">{option.label}</span>
                <span className="ai-assist-mode-desc">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language Selection (for translate mode) */}
        {selectedMode === 'translate' && (
          <div className="ai-assist-language">
            <label className="ai-assist-label">翻訳先言語</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              disabled={isLoading}
              className="ai-assist-select"
            >
              {languageOptions.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Instructions */}
        <div className="ai-assist-custom">
          <label className="ai-assist-label">追加指示（オプション）</label>
          <input
            type="text"
            className="ai-assist-input"
            placeholder="例: もっとカジュアルに、技術者向けに..."
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {(error || contextError) && (
          <div className="ai-assist-error">
            <X size={16} />
            <span>{error || contextError}</span>
          </div>
        )}

        {(content || isLoading || isLoadingContext) && (
          <div className="ai-assist-result-section">
            <label className="ai-assist-label">
              {selectedMode === 'weekly_report' ? '週報要約' : '変換結果'}
            </label>
            <AIStreamingText
              content={content}
              isLoading={isLoading || isLoadingContext}
              className="ai-assist-result"
            />
          </div>
        )}

        <div className="ai-assist-actions">
          {(isLoading || isLoadingContext) ? (
            <button className="btn btn-secondary" onClick={cancel}>
              <X size={16} />
              キャンセル
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleAssist}
              disabled={!selectedMode || !selectedText}
            >
              <Wand2 size={16} />
              {selectedMode === 'weekly_report' ? '週報を生成' : '変換'}
            </button>
          )}

          {content && !isLoading && !isLoadingContext && (
            <>
              <button className="btn btn-secondary" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'コピー完了' : 'コピー'}
              </button>
              <button className="btn btn-primary" onClick={handleReplace}>
                {selectedMode === 'weekly_report' ? '追記' : '置換'}
              </button>
            </>
          )}
        </div>

        {(isLoading || isLoadingContext) && (
          <div className="ai-assist-loading">
            <Loader2 size={16} className="animate-spin" />
            <span>
              {isLoadingContext ? '参照情報を取得中...' : '生成中...'}
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}
