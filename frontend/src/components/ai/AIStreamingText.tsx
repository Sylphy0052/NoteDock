import { useEffect, useRef } from 'react'
import clsx from 'clsx'

interface AIStreamingTextProps {
  content: string
  isLoading: boolean
  showCursor?: boolean
  className?: string
}

/**
 * Component to display streaming AI text with a typing cursor.
 */
export function AIStreamingText({
  content,
  isLoading,
  showCursor = true,
  className,
}: AIStreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [content])

  return (
    <div ref={containerRef} className={clsx('ai-streaming-text', className)}>
      <div className="ai-streaming-content">
        {content || (isLoading && 'AI が応答を生成中...')}
        {isLoading && showCursor && <span className="ai-cursor">|</span>}
      </div>
    </div>
  )
}
