import { useState, useCallback, useRef, useEffect } from 'react'
import { Sparkles, Loader2, Copy, Check, X, Search, Send, MessageSquare } from 'lucide-react'
import Modal from '../common/Modal'
import { AIStreamingText } from './AIStreamingText'
import { useAskAI } from '../../hooks/useAskAI'

type TabType = 'generate' | 'deepResearch'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Format DeepResearch output for article insertion.
 * - Removes planning/feedback request sections
 * - Cleans up conversational artifacts
 * - Ensures proper Markdown structure
 */
function formatDeepResearchForArticle(content: string): string {
  if (!content) return ''

  let formatted = content

  // Remove common feedback request patterns (Japanese)
  const feedbackPatterns = [
    /^.*フィードバックをお願いします.*$/gm,
    /^.*ご確認ください.*$/gm,
    /^.*いかがでしょうか.*$/gm,
    /^.*ご意見をお聞かせください.*$/gm,
    /^.*修正や追加.*ありましたら.*$/gm,
  ]

  for (const pattern of feedbackPatterns) {
    formatted = formatted.replace(pattern, '')
  }

  // Remove planning sections (lines starting with セクション: that look like plans)
  // Only remove if the content looks like a planning format
  const planningPattern = /^セクション:\s*.+\n概要:\s*.+\n調査要否:\s*.+$/gm
  if (planningPattern.test(formatted)) {
    // This looks like a planning response, try to extract just the content
    // If the entire content is planning, keep it as is (user might want it)
    const nonPlanningContent = formatted.replace(planningPattern, '').trim()
    if (nonPlanningContent.length > 100) {
      formatted = nonPlanningContent
    }
  }

  // Clean up excessive whitespace
  formatted = formatted
    .replace(/\n{4,}/g, '\n\n\n') // Max 3 newlines
    .replace(/^\s+|\s+$/g, '') // Trim start/end

  // Ensure content starts with a heading if it doesn't have one
  if (formatted && !formatted.startsWith('#')) {
    // Check if there's content that should have a title
    const lines = formatted.split('\n')
    const firstNonEmptyLine = lines.find((line) => line.trim().length > 0)
    if (firstNonEmptyLine && firstNonEmptyLine.length < 100 && !firstNonEmptyLine.includes('.')) {
      // First line looks like it could be a title
      formatted = `# ${firstNonEmptyLine}\n\n${lines.slice(1).join('\n')}`
    }
  }

  return formatted
}

interface AIGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (content: string) => void
}

/**
 * Modal for AI content generation.
 * User provides a prompt and AI generates content that can be inserted.
 * DeepResearch mode supports multi-turn conversation.
 */
export function AIGenerateModal({
  isOpen,
  onClose,
  onInsert,
}: AIGenerateModalProps) {
  const [prompt, setPrompt] = useState('')
  const [followUpPrompt, setFollowUpPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('generate')
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { isLoading, content, error, progressMessage, generate, deepResearchFn, cancel, reset } =
    useAskAI()

  // Track when content changes to add assistant message to history
  const prevContentRef = useRef<string>('')
  useEffect(() => {
    if (activeTab === 'deepResearch' && content && !isLoading && content !== prevContentRef.current) {
      setMessages((prev) => {
        // Remove the last assistant message if it's streaming, then add the final one
        const lastMsg = prev[prev.length - 1]
        if (lastMsg?.role === 'assistant') {
          return [...prev.slice(0, -1), { role: 'assistant', content }]
        }
        return [...prev, { role: 'assistant', content }]
      })
      prevContentRef.current = content
    }
  }, [content, isLoading, activeTab])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (activeTab === 'deepResearch' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, content, activeTab])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return
    if (activeTab === 'deepResearch') {
      // Add user message to history
      setMessages((prev) => [...prev, { role: 'user', content: prompt }])
      prevContentRef.current = ''
      const userPrompt = prompt
      setPrompt('')
      await deepResearchFn(userPrompt)
    } else {
      await generate(prompt)
    }
  }, [prompt, activeTab, generate, deepResearchFn])

  const handleFollowUp = useCallback(async () => {
    if (!followUpPrompt.trim() || isLoading) return
    // Add user message to history
    setMessages((prev) => [...prev, { role: 'user', content: followUpPrompt }])
    prevContentRef.current = ''
    const userPrompt = followUpPrompt
    setFollowUpPrompt('')
    await deepResearchFn(userPrompt)
  }, [followUpPrompt, isLoading, deepResearchFn])

  const handleInsert = useCallback(() => {
    if (activeTab === 'deepResearch' && messages.length > 0) {
      // For DeepResearch, only insert the LAST assistant message (final result)
      // Skip planning/feedback messages
      const assistantMessages = messages.filter((m) => m.role === 'assistant')
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]

      if (lastAssistantMessage) {
        // Format the content for article insertion
        const formattedContent = formatDeepResearchForArticle(lastAssistantMessage.content)
        onInsert(formattedContent)
      } else if (content) {
        onInsert(formatDeepResearchForArticle(content))
      }
    } else if (content) {
      onInsert(content)
    }
    handleClose()
  }, [content, onInsert, activeTab, messages])

  const handleCopy = useCallback(async () => {
    let textToCopy = content
    if (activeTab === 'deepResearch' && messages.length > 0) {
      // For DeepResearch, only copy the LAST assistant message (final result)
      const assistantMessages = messages.filter((m) => m.role === 'assistant')
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]
      if (lastAssistantMessage) {
        textToCopy = formatDeepResearchForArticle(lastAssistantMessage.content)
      }
    }
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [content, messages, activeTab])

  const handleClose = useCallback(() => {
    cancel()
    reset()
    setPrompt('')
    setFollowUpPrompt('')
    setMessages([])
    prevContentRef.current = ''
    setCopied(false)
    setActiveTab('generate')
    onClose()
  }, [cancel, reset, onClose])

  const handleTabChange = useCallback(
    (tab: TabType) => {
      if (isLoading) return
      reset()
      setPrompt('')
      setFollowUpPrompt('')
      setMessages([])
      prevContentRef.current = ''
      setActiveTab(tab)
    },
    [isLoading, reset]
  )

  const placeholderText =
    activeTab === 'deepResearch'
      ? '調査したいトピックを入力してください...\n\n例:\n・最新のAI技術トレンド\n・競合他社の製品比較\n・市場動向の分析'
      : '生成したい内容を入力してください...\n\n例:\n・Pythonの基本的なデータ型について解説\n・Docker入門ガイド\n・REST APIの設計ベストプラクティス'

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleGenerate()
      }
    },
    [handleGenerate]
  )

  const handleFollowUpKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleFollowUp()
      }
    },
    [handleFollowUp]
  )

  const hasMessages = messages.length > 0
  const hasAssistantResponse = messages.some((m) => m.role === 'assistant')
  const showFollowUpInput = activeTab === 'deepResearch' && hasAssistantResponse && !isLoading

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="AI 記事生成"
      size="lg"
    >
      <div className="ai-generate-modal">
        <div className="ai-generate-tabs">
          <button
            className={`ai-generate-tab ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => handleTabChange('generate')}
            disabled={isLoading}
          >
            <Sparkles size={16} />
            AI生成
          </button>
          <button
            className={`ai-generate-tab ${activeTab === 'deepResearch' ? 'active' : ''}`}
            onClick={() => handleTabChange('deepResearch')}
            disabled={isLoading}
          >
            <Search size={16} />
            DeepResearch
          </button>
        </div>

        {/* DeepResearch conversation mode */}
        {activeTab === 'deepResearch' && hasMessages ? (
          <div className="ai-conversation-section">
            <div className="ai-conversation-messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`ai-message ai-message-${msg.role}`}>
                  <div className="ai-message-header">
                    {msg.role === 'user' ? (
                      <MessageSquare size={14} />
                    ) : (
                      <Search size={14} />
                    )}
                    <span>{msg.role === 'user' ? 'あなた' : 'DeepResearch'}</span>
                  </div>
                  <div className="ai-message-content">
                    <AIStreamingText
                      content={msg.content}
                      isLoading={false}
                      className="ai-message-text"
                    />
                  </div>
                </div>
              ))}
              {/* Show streaming content if loading */}
              {isLoading && (
                <div className="ai-message ai-message-assistant">
                  <div className="ai-message-header">
                    <Search size={14} />
                    <span>DeepResearch</span>
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                  <div className="ai-message-content">
                    {content ? (
                      <AIStreamingText
                        content={content}
                        isLoading={isLoading}
                        className="ai-message-text"
                      />
                    ) : (
                      <span className="ai-message-loading">
                        {progressMessage || '応答を待っています...'}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Follow-up input */}
            {showFollowUpInput && (
              <div className="ai-followup-section">
                <div className="ai-followup-input-wrapper">
                  <textarea
                    className="ai-followup-textarea"
                    placeholder="返信を入力してください..."
                    value={followUpPrompt}
                    onChange={(e) => setFollowUpPrompt(e.target.value)}
                    onKeyDown={handleFollowUpKeyDown}
                    rows={2}
                    disabled={isLoading}
                  />
                  <button
                    className="btn btn-primary ai-followup-send"
                    onClick={handleFollowUp}
                    disabled={!followUpPrompt.trim() || isLoading}
                    title="送信 (Ctrl+Enter)"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="ai-generate-hint">
                  Ctrl+Enter で送信
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Initial prompt input */}
            <div className="ai-generate-input-section">
              <label htmlFor="ai-prompt" className="ai-generate-label">
                プロンプト
              </label>
              <textarea
                id="ai-prompt"
                className="ai-generate-textarea"
                placeholder={placeholderText}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                disabled={isLoading}
              />
              <p className="ai-generate-hint">
                Ctrl+Enter または Cmd+Enter で生成開始
              </p>
            </div>

            {error && (
              <div className="ai-generate-error">
                <X size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Regular generate mode result */}
            {activeTab === 'generate' && (content || isLoading) && (
              <div className="ai-generate-result-section">
                <label className="ai-generate-label">生成結果</label>
                <AIStreamingText
                  content={content}
                  isLoading={isLoading}
                  className="ai-generate-result"
                />
              </div>
            )}
          </>
        )}

        {error && activeTab === 'deepResearch' && hasMessages && (
          <div className="ai-generate-error">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="ai-generate-actions">
          {isLoading ? (
            <button
              className="btn btn-secondary"
              onClick={cancel}
            >
              <X size={16} />
              キャンセル
            </button>
          ) : !hasMessages ? (
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={!prompt.trim()}
            >
              <Sparkles size={16} />
              生成
            </button>
          ) : null}

          {((activeTab === 'generate' && content && !isLoading) ||
            (activeTab === 'deepResearch' && hasAssistantResponse && !isLoading)) && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleCopy}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'コピー完了' : 'コピー'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleInsert}
              >
                挿入
              </button>
            </>
          )}
        </div>

        {isLoading && !hasMessages && (
          <div className="ai-generate-loading">
            <Loader2 size={16} className="animate-spin" />
            <span>生成中...</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
