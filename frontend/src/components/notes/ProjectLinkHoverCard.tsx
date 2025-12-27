import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Building2, ExternalLink, FolderKanban } from 'lucide-react'
import { getProjectSummary } from '../../api/projects'

interface ProjectLinkHoverCardProps {
  projectId: number
  children: React.ReactNode
}

export function ProjectLinkHoverCard({ projectId, children }: ProjectLinkHoverCardProps) {
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
    queryKey: ['project-summary', projectId],
    queryFn: () => getProjectSummary(projectId),
    enabled: isHovered,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  useEffect(() => {
    if (isHovered) {
      timeoutRef.current = window.setTimeout(() => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect()
          const cardWidth = 280
          const cardHeight = 100

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

  return (
    <>
      <span
        ref={triggerRef}
        className="project-link-trigger"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </span>

      {showCard && (
        <div
          ref={cardRef}
          className="project-hover-card"
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
                <div className="project-hover-card-icon">
                  <FolderKanban size={16} />
                </div>
                <h4 className="hover-card-title">{summary.name}</h4>
                <Link to={`/projects/${projectId}`} className="hover-card-link" title="プロジェクトを開く">
                  <ExternalLink size={14} />
                </Link>
              </div>
              {summary.company_name && (
                <div className="project-hover-card-company">
                  <Building2 size={12} />
                  <span>{summary.company_name}</span>
                </div>
              )}
            </>
          ) : (
            <div className="hover-card-error">プロジェクトが見つかりません</div>
          )}
        </div>
      )}
    </>
  )
}

// Utility function for parsing @P<ID> links in markdown
export function parseProjectLinks(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /@P(\d+)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    // Add the link
    const projectId = parseInt(match[1], 10)
    parts.push(
      <ProjectLinkHoverCard key={`project-link-${match.index}`} projectId={projectId}>
        <Link to={`/projects/${projectId}`} className="project-link">
          @P{projectId}
        </Link>
      </ProjectLinkHoverCard>
    )

    lastIndex = regex.lastIndex
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts
}
