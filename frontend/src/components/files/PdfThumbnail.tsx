import { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

// Set worker source for pdfjs-dist v5+
// Use dynamic import for Vite compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface PdfThumbnailProps {
  fileUrl: string
  width?: number
  height?: number
}

export function PdfThumbnail({ fileUrl, width = 220, height = 140 }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const renderThumbnail = async () => {
      if (!canvasRef.current) return

      try {
        setLoading(true)
        setError(false)

        const loadingTask = pdfjsLib.getDocument(fileUrl)
        const pdf = await loadingTask.promise

        if (cancelled) return

        const page = await pdf.getPage(1)

        if (cancelled) return

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        // Calculate scale to fit within the thumbnail area
        const viewport = page.getViewport({ scale: 1 })
        const scaleX = width / viewport.width
        const scaleY = height / viewport.height
        const scale = Math.min(scaleX, scaleY)

        const scaledViewport = page.getViewport({ scale })

        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise

        setLoading(false)
      } catch (err) {
        console.error('Error rendering PDF thumbnail:', err)
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    renderThumbnail()

    return () => {
      cancelled = true
    }
  }, [fileUrl, width, height])

  if (error) {
    return null // Will fall back to icon in FileCard
  }

  return (
    <div className="pdf-thumbnail">
      {loading && <div className="pdf-thumbnail-loading" />}
      <canvas
        ref={canvasRef}
        style={{
          display: loading ? 'none' : 'block',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      />
    </div>
  )
}
