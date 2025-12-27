import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// PDF.js worker setup - use jsdelivr CDN (more reliable than unpkg)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerProps {
  fileUrl: string
}

export function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }, [])

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF load error:', err)
    setError('PDFの読み込みに失敗しました')
    setLoading(false)
  }, [])

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages))
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }

  const resetZoom = () => {
    setScale(1.0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        goToPrevPage()
        break
      case 'ArrowRight':
        goToNextPage()
        break
      case '+':
      case '=':
        zoomIn()
        break
      case '-':
        zoomOut()
        break
      case '0':
        resetZoom()
        break
    }
  }

  if (error) {
    return (
      <div className="pdf-viewer-error">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="pdf-viewer" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* PDF Controls */}
      <div className="pdf-controls">
        {/* Page Navigation */}
        <div className="pdf-controls-group">
          <button
            className="btn btn-icon btn-sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            title="前のページ"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="pdf-page-info">
            {pageNumber} / {numPages || '?'}
          </span>
          <button
            className="btn btn-icon btn-sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            title="次のページ"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="pdf-controls-group">
          <button
            className="btn btn-icon btn-sm"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            title="縮小 (-)"
          >
            <ZoomOut size={18} />
          </button>
          <span className="pdf-zoom-info">{Math.round(scale * 100)}%</span>
          <button
            className="btn btn-icon btn-sm"
            onClick={zoomIn}
            disabled={scale >= 3.0}
            title="拡大 (+)"
          >
            <ZoomIn size={18} />
          </button>
          <button className="btn btn-icon btn-sm" onClick={resetZoom} title="リセット (0)">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="pdf-document-container">
        {loading && (
          <div className="pdf-loading">
            <div className="spinner" />
            <span>PDFを読み込み中...</span>
          </div>
        )}
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  )
}
