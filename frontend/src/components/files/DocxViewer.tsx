import { useState, useEffect } from 'react'
import mammoth from 'mammoth'

interface DocxViewerProps {
  fileUrl: string
}

export function DocxViewer({ fileUrl }: DocxViewerProps) {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDocx = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error('Failed to fetch document')
        }

        const arrayBuffer = await response.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })

        setHtml(result.value)

        if (result.messages.length > 0) {
          console.warn('Mammoth warnings:', result.messages)
        }
      } catch (err) {
        console.error('Error loading docx:', err)
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    loadDocx()
  }, [fileUrl])

  if (loading) {
    return (
      <div className="docx-viewer-loading">
        <div className="spinner" />
        <span>ドキュメントを読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="docx-viewer-error">
        <p>ドキュメントの読み込みに失敗しました</p>
        <p className="error-detail">{error}</p>
      </div>
    )
  }

  return (
    <div className="docx-viewer">
      <div className="docx-content" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
