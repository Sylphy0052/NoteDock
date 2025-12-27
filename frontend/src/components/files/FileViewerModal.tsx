import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { Modal } from '../common'
import { getFileDownloadUrl, getFilePreviewUrl } from '../../api/files'
import { PptxViewer } from './PptxViewer'
import { DocxViewer } from './DocxViewer'
import { XlsxViewer } from './XlsxViewer'
import { CsvViewer } from './CsvViewer'
import { MarkdownFileViewer } from './MarkdownFileViewer'

// PPTX MIME types
const PPTX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt (legacy)
]

// DOCX MIME types
const DOCX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc (legacy)
]

// XLSX MIME types
const XLSX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls (legacy)
]

// Markdown MIME types
const MARKDOWN_MIME_TYPES = ['text/markdown', 'text/x-markdown']

// CSV MIME types
const CSV_MIME_TYPES = ['text/csv', 'text/comma-separated-values']

interface FileViewerModalProps {
  isOpen: boolean
  onClose: () => void
  file: {
    id: number
    original_name: string
    mime_type: string
  } | null
  files?: Array<{
    id: number
    original_name: string
    mime_type: string
  }>
}

export function FileViewerModal({ isOpen, onClose, file, files = [] }: FileViewerModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const pdfContainerRef = useRef<HTMLDivElement>(null)

  const currentFile = files.length > 0 ? files[currentIndex] : file

  // Check if file can be previewed inline (basic types)
  const isPreviewable = (mimeType: string) => {
    return (
      mimeType.startsWith('image/') ||
      mimeType === 'application/pdf' ||
      mimeType.startsWith('text/') ||
      mimeType === 'application/json'
    )
  }

  // Check if file is PPTX
  const isPptx = (mimeType: string, fileName: string) => {
    const ext = fileName.toLowerCase()
    return PPTX_MIME_TYPES.includes(mimeType) || ext.endsWith('.pptx') || ext.endsWith('.ppt')
  }

  // Check if file is DOCX
  const isDocx = (mimeType: string, fileName: string) => {
    const ext = fileName.toLowerCase()
    return DOCX_MIME_TYPES.includes(mimeType) || ext.endsWith('.docx') || ext.endsWith('.doc')
  }

  // Check if file is XLSX
  const isXlsx = (mimeType: string, fileName: string) => {
    const ext = fileName.toLowerCase()
    return XLSX_MIME_TYPES.includes(mimeType) || ext.endsWith('.xlsx') || ext.endsWith('.xls')
  }

  // Check if file is CSV
  const isCsv = (mimeType: string, fileName: string) => {
    return CSV_MIME_TYPES.includes(mimeType) || fileName.toLowerCase().endsWith('.csv')
  }

  // Check if file is Markdown
  const isMarkdown = (mimeType: string, fileName: string) => {
    return MARKDOWN_MIME_TYPES.includes(mimeType) || fileName.toLowerCase().endsWith('.md')
  }

  // Check if file needs binary download (not text preview)
  const needsBinaryDownload = (mimeType: string, fileName: string) => {
    return isPptx(mimeType, fileName) || isDocx(mimeType, fileName) || isXlsx(mimeType, fileName)
  }

  useEffect(() => {
    if (isOpen && currentFile) {
      setLoading(true)
      // Use download URL for binary files (pptx, docx, xlsx), preview URL for others
      const url = needsBinaryDownload(currentFile.mime_type, currentFile.original_name)
        ? getFileDownloadUrl(currentFile.id)
        : isPreviewable(currentFile.mime_type)
          ? getFilePreviewUrl(currentFile.id)
          : getFileDownloadUrl(currentFile.id)
      Promise.resolve(url)
        .then((resolvedUrl) => {
          setFileUrl(resolvedUrl)
          setLoading(false)
        })
        .catch(() => {
          setFileUrl(null)
          setLoading(false)
        })

      // Reset view settings
      setZoom(1)
      setRotation(0)
    }
  }, [isOpen, currentFile])

  useEffect(() => {
    if (file && files.length > 0) {
      const index = files.findIndex((f) => f.id === file.id)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [file, files])

  const handleDownload = async () => {
    if (!currentFile) return
    const url = await getFileDownloadUrl(currentFile.id)
    const a = document.createElement('a')
    a.href = url
    a.download = currentFile.original_name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.25, 4))
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.25))
  const handleRotate = () => setRotation((r) => (r + 90) % 360)

  const toggleFullscreen = useCallback(async () => {
    if (!pdfContainerRef.current) return

    if (!document.fullscreenElement) {
      await pdfContainerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Listen for fullscreen changes (e.g., user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handlePrev = () => {
    if (files.length > 1) {
      setCurrentIndex((i) => (i - 1 + files.length) % files.length)
    }
  }

  const handleNext = () => {
    if (files.length > 1) {
      setCurrentIndex((i) => (i + 1) % files.length)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        handlePrev()
        break
      case 'ArrowRight':
        handleNext()
        break
      case 'Escape':
        if (!isFullscreen) {
          onClose()
        }
        break
      case '+':
      case '=':
        handleZoomIn()
        break
      case '-':
        handleZoomOut()
        break
      case 'f':
      case 'F':
        if (currentFile?.mime_type === 'application/pdf') {
          toggleFullscreen()
        }
        break
    }
  }

  // Ref for wheel event listener with passive: false
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !isOpen) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          setZoom((z) => Math.min(z * 1.25, 4))
        } else {
          setZoom((z) => Math.max(z / 1.25, 0.25))
        }
      }
    }

    viewer.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewer.removeEventListener('wheel', handleWheel)
  }, [isOpen])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="viewer-loading">
          <div className="spinner" />
          <span>読み込み中...</span>
        </div>
      )
    }

    if (!currentFile || !fileUrl) {
      return <div className="viewer-error">ファイルを読み込めませんでした</div>
    }

    const mimeType = currentFile.mime_type
    const fileName = currentFile.original_name

    // Image viewer
    if (mimeType.startsWith('image/')) {
      return (
        <div className="viewer-image-container">
          <img
            src={fileUrl}
            alt={currentFile.original_name}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s',
            }}
          />
        </div>
      )
    }

    // PDF viewer with zoom support
    if (mimeType === 'application/pdf') {
      return (
        <div className="pdf-viewer pdf-viewer-fullscreen" ref={pdfContainerRef}>
          <div className="pdf-controls">
            <div className="pdf-controls-group">
              <button
                className="btn btn-icon btn-sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                title="縮小 (-)"
              >
                <ZoomOut size={18} />
              </button>
              <span className="pdf-zoom-info">{Math.round(zoom * 100)}%</span>
              <button
                className="btn btn-icon btn-sm"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                title="拡大 (+)"
              >
                <ZoomIn size={18} />
              </button>
              <button className="btn btn-icon btn-sm" onClick={() => setZoom(1)} title="リセット">
                100%
              </button>
            </div>
            <div className="pdf-controls-group">
              <button
                className="btn btn-icon btn-sm"
                onClick={toggleFullscreen}
                title={isFullscreen ? '全画面解除 (Esc)' : '全画面表示 (F)'}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          </div>
          <div className="pdf-document-container">
            <iframe
              src={`${fileUrl}#toolbar=0&view=FitH`}
              title={currentFile.original_name}
              className="viewer-pdf-iframe"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                width: `${100 / zoom}%`,
                height: `${100 / zoom}%`,
              }}
            />
          </div>
        </div>
      )
    }

    // PPTX viewer
    if (isPptx(mimeType, fileName)) {
      return <PptxViewer fileUrl={fileUrl} />
    }

    // DOCX viewer
    if (isDocx(mimeType, fileName)) {
      return <DocxViewer fileUrl={fileUrl} />
    }

    // XLSX viewer
    if (isXlsx(mimeType, fileName)) {
      return <XlsxViewer fileUrl={fileUrl} />
    }

    // CSV viewer
    if (isCsv(mimeType, fileName)) {
      return <CsvViewer fileUrl={fileUrl} />
    }

    // Markdown viewer
    if (isMarkdown(mimeType, fileName)) {
      return <MarkdownFileViewer fileUrl={fileUrl} />
    }

    // Text viewer (excluding markdown which has its own viewer)
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      return <iframe src={fileUrl} title={currentFile.original_name} className="viewer-text" />
    }

    // Unsupported file - download only
    return (
      <div className="viewer-unsupported">
        <p>このファイル形式はプレビューできません</p>
        <button className="btn btn-primary" onClick={handleDownload}>
          <Download size={16} />
          ダウンロード
        </button>
      </div>
    )
  }

  const isImage = currentFile?.mime_type.startsWith('image/')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="full">
      <div className="file-viewer" ref={viewerRef} onKeyDown={handleKeyDown} tabIndex={0}>
        {/* Header */}
        <div className="viewer-header">
          <span className="viewer-filename">
            {currentFile?.original_name}
            {files.length > 1 && (
              <span className="viewer-count">
                {currentIndex + 1} / {files.length}
              </span>
            )}
          </span>
          <div className="viewer-actions">
            {isImage && (
              <>
                <button className="btn btn-icon" onClick={handleZoomOut} title="縮小">
                  <ZoomOut size={18} />
                </button>
                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                <button className="btn btn-icon" onClick={handleZoomIn} title="拡大">
                  <ZoomIn size={18} />
                </button>
                <button className="btn btn-icon" onClick={handleRotate} title="回転">
                  <RotateCw size={18} />
                </button>
              </>
            )}
            <button className="btn btn-icon" onClick={handleDownload} title="ダウンロード">
              <Download size={18} />
            </button>
            <button className="btn btn-icon" onClick={onClose} title="閉じる">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="viewer-content">
          {files.length > 1 && (
            <button className="viewer-nav viewer-nav-prev" onClick={handlePrev}>
              <ChevronLeft size={32} />
            </button>
          )}

          {renderContent()}

          {files.length > 1 && (
            <button className="viewer-nav viewer-nav-next" onClick={handleNext}>
              <ChevronRight size={32} />
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
