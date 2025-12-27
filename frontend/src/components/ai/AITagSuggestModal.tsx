import { useState, useCallback, useEffect } from 'react'
import { Loader2, X, Sparkles, Tag, Check, AlertCircle } from 'lucide-react'
import Modal from '../common/Modal'
import { suggestTags } from '../../api/ai'
import type { TagSuggestion } from '../../api/types'

interface AITagSuggestModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (tags: string[]) => void
  title: string
  content: string
  currentTags: string[]
}

/**
 * Modal for AI-powered tag suggestions.
 * Analyzes note content and suggests relevant tags.
 */
export function AITagSuggestModal({
  isOpen,
  onClose,
  onApply,
  title,
  content,
  currentTags,
}: AITagSuggestModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  // Fetch suggestions when modal opens
  useEffect(() => {
    if (isOpen && title.trim() && content.trim()) {
      fetchSuggestions()
    } else if (isOpen) {
      setError('タイトルと本文を入力してからタグ提案を取得してください')
    }
  }, [isOpen])

  const fetchSuggestions = async () => {
    setIsLoading(true)
    setError(null)
    setSuggestions([])
    setSelectedTags(new Set())

    try {
      const response = await suggestTags({
        title,
        content,
        maxSuggestions: 5,
      })

      // Filter out tags that are already applied
      const filteredSuggestions = response.suggestions.filter(
        (s) => !currentTags.includes(s.name)
      )

      if (filteredSuggestions.length === 0) {
        setError('新しいタグの提案がありませんでした')
      } else {
        setSuggestions(filteredSuggestions)
        // Pre-select all suggestions
        setSelectedTags(new Set(filteredSuggestions.map((s) => s.name)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タグ提案の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleTag = useCallback((tagName: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tagName)) {
        next.delete(tagName)
      } else {
        next.add(tagName)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedTags(new Set(suggestions.map((s) => s.name)))
  }, [suggestions])

  const handleDeselectAll = useCallback(() => {
    setSelectedTags(new Set())
  }, [])

  const handleApply = useCallback(() => {
    if (selectedTags.size > 0) {
      onApply(Array.from(selectedTags))
    }
    onClose()
  }, [selectedTags, onApply, onClose])

  const handleClose = useCallback(() => {
    setSuggestions([])
    setSelectedTags(new Set())
    setError(null)
    onClose()
  }, [onClose])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="AIタグ提案" size="md">
      <div className="ai-tag-suggest-modal">
        {isLoading && (
          <div className="ai-tag-suggest-loading">
            <Loader2 size={24} className="animate-spin" />
            <span>タグを分析中...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="ai-tag-suggest-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && suggestions.length > 0 && (
          <>
            <div className="ai-tag-suggest-header">
              <p className="ai-tag-suggest-description">
                ノート内容に基づいて以下のタグが提案されました。追加するタグを選択してください。
              </p>
              <div className="ai-tag-suggest-actions-top">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={handleSelectAll}
                >
                  すべて選択
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={handleDeselectAll}
                >
                  選択解除
                </button>
              </div>
            </div>

            <div className="ai-tag-suggest-list">
              {suggestions.map((suggestion) => (
                <label
                  key={suggestion.name}
                  className={`ai-tag-suggest-item ${selectedTags.has(suggestion.name) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.has(suggestion.name)}
                    onChange={() => handleToggleTag(suggestion.name)}
                  />
                  <div className="ai-tag-suggest-item-content">
                    <div className="ai-tag-suggest-item-header">
                      <Tag size={14} />
                      <span className="ai-tag-suggest-name">{suggestion.name}</span>
                      {suggestion.isExisting ? (
                        <span className="ai-tag-badge existing">既存</span>
                      ) : (
                        <span className="ai-tag-badge new">新規</span>
                      )}
                    </div>
                    <p className="ai-tag-suggest-reason">{suggestion.reason}</p>
                  </div>
                  {selectedTags.has(suggestion.name) && (
                    <Check size={18} className="ai-tag-suggest-check" />
                  )}
                </label>
              ))}
            </div>
          </>
        )}

        <div className="ai-tag-suggest-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            <X size={16} />
            キャンセル
          </button>
          {!isLoading && suggestions.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleApply}
              disabled={selectedTags.size === 0}
            >
              <Sparkles size={16} />
              {selectedTags.size}件のタグを追加
            </button>
          )}
          {!isLoading && error && (
            <button className="btn btn-primary" onClick={fetchSuggestions}>
              <Sparkles size={16} />
              再試行
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
