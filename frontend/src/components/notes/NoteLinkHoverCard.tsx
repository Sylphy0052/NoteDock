import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock, ExternalLink } from 'lucide-react'
import { getNoteSummary } from '../../api/notes'

interface NoteLinkHoverCardProps {
  noteId: number
  children: React.ReactNode
}

export function NoteLinkHoverCard({ noteId, children }: NoteLinkHoverCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number>()

  const { data: summary, isLoading } = useQuery({
    queryKey: ['note-summary', noteId],
    queryFn: () => getNoteSummary(noteId),
    enabled: isHovered,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  useEffect(() => {
    if (isHovered) {
      timeoutRef.current = window.setTimeout(() => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect()
          const cardWidth = 320
          const cardHeight = 160

          let left = rect.left + rect.width / 2 - cardWidth / 2
          let top = rect.bottom + 8

          // Keep within viewport
          if (left < 8) left = 8
          if (left + cardWidth > window.innerWidth - 8) {
            left = window.innerWidth - cardWidth - 8
          }
          if (top + cardHeight > window.innerHeight - 8) {
            top = rect.top - cardHeight - 8
          }

          setPosition({ top, left })
          setShowCard(true)
        }
      }, 300) // 300ms delay before showing
    } else {
      clearTimeout(timeoutRef.current)
      setShowCard(false)
    }

    return () => {
      clearTimeout(timeoutRef.current)
    }
  }, [isHovered])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="note-link-trigger"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </span>

      {showCard && (
        <div
          ref={cardRef}
          className="note-hover-card"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isLoading ? (
            <div className="hover-card-loading">
              <div className="spinner" />
            </div>
          ) : summary ? (
            <>
              <div className="hover-card-header">
                <h4 className="hover-card-title">{summary.title}</h4>
                <Link to={`/notes/${noteId}`} className="hover-card-link" title="ノートを開く">
                  <ExternalLink size={14} />
                </Link>
              </div>
              <p className="hover-card-summary">{summary.summary}</p>
              <div className="hover-card-meta">
                <Clock size={12} />
                <span>{formatDate(summary.updated_at)}</span>
              </div>
            </>
          ) : (
            <div className="hover-card-error">ノートが見つかりません</div>
          )}
        </div>
      )}
    </>
  )
}

// Custom markdown component for parsing #ID links
interface MarkdownWithLinksProps {
  content: string
}

export function parseNoteLinks(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /#(\d+)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    // Add the link
    const noteId = parseInt(match[1], 10)
    parts.push(
      <NoteLinkHoverCard key={`link-${match.index}`} noteId={noteId}>
        <Link to={`/notes/${noteId}`} className="note-link">
          #{noteId}
        </Link>
      </NoteLinkHoverCard>
    )

    lastIndex = regex.lastIndex
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts
}
