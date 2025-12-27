import { useState, useEffect, useRef, useCallback } from 'react'
import { FolderKanban, Building2 } from 'lucide-react'
import { searchProjects, getProjects } from '../../api/projects'
import type { Project } from '../../api/types'

interface ProjectLinkSuggesterProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  content: string
  onInsertLink: (projectId: number, projectName: string) => void
}

interface SuggesterState {
  isOpen: boolean
  query: string
  startPosition: number
  position: { top: number; left: number }
}

export function ProjectLinkSuggester({
  textareaRef,
  content,
  onInsertLink,
}: ProjectLinkSuggesterProps) {
  const [state, setState] = useState<SuggesterState>({
    isOpen: false,
    query: '',
    startPosition: 0,
    position: { top: 0, left: 0 },
  })
  const [suggestions, setSuggestions] = useState<Project[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const suggesterRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Fetch suggestions based on query
  const fetchSuggestions = useCallback(async (query: string) => {
    setIsLoading(true)
    try {
      if (query.trim()) {
        // Use search for non-empty queries
        const results = await searchProjects(query)
        setSuggestions(results)
      } else {
        // Show recent projects when query is empty
        const { items } = await getProjects({ page_size: 50 })
        setSuggestions(items)
      }
    } catch (error) {
      console.error('Failed to fetch project suggestions:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (!state.isOpen) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(state.query)
    }, 150)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [state.query, state.isOpen, fetchSuggestions])

  // Calculate popup position based on cursor in textarea
  const calculatePosition = useCallback((textarea: HTMLTextAreaElement, cursorPos: number) => {
    const style = window.getComputedStyle(textarea)
    const lineHeight = parseFloat(style.lineHeight) || 24
    const paddingTop = parseFloat(style.paddingTop) || 16
    const paddingLeft = parseFloat(style.paddingLeft) || 16

    // Get text before cursor to calculate position
    const textBeforeCursor = textarea.value.substring(0, cursorPos)
    const lines = textBeforeCursor.split('\n')
    const currentLineIndex = lines.length - 1
    const currentLineText = lines[currentLineIndex]

    // Estimate character width (monospace font)
    const charWidth = 9.6 // Approximate for monospace at 0.9375rem

    // Calculate position relative to textarea
    const top = paddingTop + currentLineIndex * lineHeight - textarea.scrollTop + lineHeight
    const left = Math.min(
      paddingLeft + currentLineText.length * charWidth,
      textarea.clientWidth - 320
    )

    return {
      top: Math.max(top, lineHeight + paddingTop),
      left: Math.max(left, paddingLeft),
    }
  }, [])

  // Handle textarea input to detect @P trigger
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleInput = () => {
      const cursorPos = textarea.selectionStart
      const textBeforeCursor = content.substring(0, cursorPos)

      // Check for @P pattern (not followed by a digit, to allow partial typing)
      const triggerMatch = textBeforeCursor.match(/@P([^\s@]*)$/)

      if (triggerMatch) {
        const query = triggerMatch[1]
        // Only open suggester if query is not a pure number (i.e., user is searching)
        // or if it's empty (just @P)
        const isPureNumber = /^\d+$/.test(query)

        if (!isPureNumber || query === '') {
          const startPos = cursorPos - triggerMatch[0].length
          const position = calculatePosition(textarea, cursorPos)

          setState({
            isOpen: true,
            query: query,
            startPosition: startPos,
            position,
          })
          setSelectedIndex(0)
        } else if (state.isOpen) {
          setState((prev) => ({ ...prev, isOpen: false }))
        }
      } else if (state.isOpen) {
        setState((prev) => ({ ...prev, isOpen: false }))
      }
    }

    // Attach to textarea's input event via content change
    handleInput()
  }, [content, textareaRef, calculatePosition, state.isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || !state.isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (suggestions[selectedIndex]) {
            handleSelect(suggestions[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setState((prev) => ({ ...prev, isOpen: false }))
          break
      }
    }

    textarea.addEventListener('keydown', handleKeyDown)
    return () => textarea.removeEventListener('keydown', handleKeyDown)
  }, [state.isOpen, suggestions, selectedIndex, textareaRef])

  // Handle selection
  const handleSelect = useCallback(
    (project: Project) => {
      onInsertLink(project.id, project.name)
      setState((prev) => ({ ...prev, isOpen: false }))
    },
    [onInsertLink]
  )

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggesterRef.current &&
        !suggesterRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setState((prev) => ({ ...prev, isOpen: false }))
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [textareaRef])

  // Scroll selected item into view
  useEffect(() => {
    if (!suggesterRef.current) return
    const selectedItem = suggesterRef.current.querySelector('.selected')
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!state.isOpen) return null

  return (
    <div
      ref={suggesterRef}
      className="note-link-suggester project-link-suggester"
      style={{
        top: state.position.top,
        left: state.position.left,
      }}
    >
      <div className="suggester-header">
        <FolderKanban size={14} />
        <span>プロジェクトをリンク</span>
        {state.query && <span className="suggester-query">"{state.query}"</span>}
      </div>

      <div className="suggester-list">
        {isLoading ? (
          <div className="suggester-loading">
            <div className="spinner-small" />
            <span>検索中...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="suggester-empty">
            <span>プロジェクトが見つかりません</span>
          </div>
        ) : (
          suggestions.map((project, index) => (
            <button
              key={project.id}
              className={`suggester-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(project)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <FolderKanban size={14} />
              <span className="suggester-item-title">
                {project.company && (
                  <span className="suggester-item-company">
                    <Building2 size={10} />
                    {project.company.name} /
                  </span>
                )}
                {project.name}
              </span>
              <span className="suggester-item-id">@P{project.id}</span>
            </button>
          ))
        )}
      </div>

      <div className="suggester-footer">
        <span>↑↓ 移動</span>
        <span>Enter 選択</span>
        <span>Esc 閉じる</span>
      </div>
    </div>
  )
}
