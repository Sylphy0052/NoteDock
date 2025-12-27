import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownFileViewerProps {
  fileUrl: string
}

export function MarkdownFileViewer({ fileUrl }: MarkdownFileViewerProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error('Failed to fetch markdown file')
        }

        const text = await response.text()
        setContent(text)
      } catch (err) {
        console.error('Error loading markdown:', err)
        setError(err instanceof Error ? err.message : 'Failed to load markdown')
      } finally {
        setLoading(false)
      }
    }

    loadMarkdown()
  }, [fileUrl])

  if (loading) {
    return (
      <div className="markdown-file-viewer-loading">
        <div className="spinner" />
        <span>Markdownを読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="markdown-file-viewer-error">
        <p>Markdownの読み込みに失敗しました</p>
        <p className="error-detail">{error}</p>
      </div>
    )
  }

  return (
    <div className="markdown-file-viewer">
      <div className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  )
}
