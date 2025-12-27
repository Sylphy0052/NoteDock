import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, Tag } from 'lucide-react'
import { quickSearch } from '../../api/search'
import type { NoteSummary } from '../../api/types'

interface QuickOpenModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function QuickOpenModal({ isOpen, onClose }: QuickOpenModalProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NoteSummary[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Search debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const data = await quickSearch(query)
        setResults(data)
        setSelectedIndex(0)
      } catch (error) {
        console.error('Search failed:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            navigate(`/notes/${results[selectedIndex].id}`)
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [results, selectedIndex, navigate, onClose]
  )

  if (!isOpen) return null

  return (
    <div className="quick-open-overlay" onClick={onClose}>
      <div
        className="quick-open-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="quick-open-input-wrapper">
          <Search size={20} className="quick-open-icon" />
          <input
            type="text"
            className="quick-open-input"
            placeholder="ノートを検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {results.length > 0 && (
          <div className="quick-open-results">
            {results.map((note, index) => (
              <button
                key={note.id}
                className={`quick-open-result ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  navigate(`/notes/${note.id}`)
                  onClose()
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <FileText size={16} className="result-icon" />
                <div className="result-content">
                  <span className="result-title">{note.title}</span>
                  {note.tags.length > 0 && (
                    <div className="result-tags">
                      <Tag size={12} />
                      {note.tags.slice(0, 3).map((tag) => (
                        <span key={tag.id} className="result-tag">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && !isLoading && (
          <div className="quick-open-empty">検索結果がありません</div>
        )}

        <div className="quick-open-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> 移動
          </span>
          <span>
            <kbd>Enter</kbd> 開く
          </span>
          <span>
            <kbd>Esc</kbd> 閉じる
          </span>
        </div>
      </div>
    </div>
  )
}
