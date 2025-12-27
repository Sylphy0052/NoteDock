import {
  File,
  FileText,
  Image,
  Download,
  Trash2,
  FileSpreadsheet,
  Presentation,
  FileCode,
} from 'lucide-react'
import { getFilePreviewUrl, getFileUrl } from '../../api/files'
import { PdfThumbnail } from './PdfThumbnail'
import type { FileResponse } from '../../api/types'
import clsx from 'clsx'

interface FileCardProps {
  file: FileResponse
  onPreview: (file: FileResponse) => void
  onDownload: (file: FileResponse) => void
  onDelete: (file: FileResponse) => void
  isDeleting?: boolean
  className?: string
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Get file type label
function getFileTypeLabel(mimeType: string, fileName: string): string {
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('document') || mimeType.includes('word')) return 'Doc'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'Excel'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPT'
  if (fileName.toLowerCase().endsWith('.md') || mimeType.includes('markdown')) return 'Markdown'
  if (mimeType.startsWith('text/')) return 'Text'
  if (mimeType === 'application/json') return 'JSON'
  return 'File'
}

// Get file icon based on mime type
function getFileIcon(mimeType: string, size: number = 32) {
  if (mimeType.startsWith('image/')) {
    return <Image size={size} />
  }
  if (mimeType === 'application/pdf') {
    return <FileText size={size} />
  }
  if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet size={size} />
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return <Presentation size={size} />
  }
  if (mimeType.startsWith('text/') || mimeType === 'application/json') {
    return <FileCode size={size} />
  }
  if (mimeType.includes('document') || mimeType.includes('word')) {
    return <FileText size={size} />
  }
  return <File size={size} />
}

// Check thumbnail type
function getThumbnailType(mimeType: string): 'image' | 'pdf' | 'icon' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  return 'icon'
}

export default function FileCard({
  file,
  onPreview,
  onDownload,
  onDelete,
  isDeleting,
  className,
}: FileCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent preview when clicking action buttons
    if ((e.target as HTMLElement).closest('.file-card-actions')) {
      return
    }
    onPreview(file)
  }

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDownload(file)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(file)
  }

  const thumbnailType = getThumbnailType(file.mime_type)

  const renderThumbnail = () => {
    switch (thumbnailType) {
      case 'image':
        return <img src={getFilePreviewUrl(file.id)} alt={file.original_name} loading="lazy" />
      case 'pdf':
        return <PdfThumbnail fileUrl={getFileUrl(file.id)} />
      default:
        return <div className="file-card-icon">{getFileIcon(file.mime_type, 48)}</div>
    }
  }

  return (
    <div className={clsx('file-card', className)} onClick={handleCardClick}>
      <div className="file-card-thumbnail">{renderThumbnail()}</div>

      <div className="file-card-content">
        <div className="file-card-header">
          <h3 className="file-card-title" title={file.original_name}>
            {file.original_name}
          </h3>
        </div>

        <div className="file-card-meta">
          <span className="file-type-badge">
            {getFileTypeLabel(file.mime_type, file.original_name)}
          </span>
          <span className="file-size">{formatFileSize(file.size_bytes)}</span>
        </div>

        <div className="file-card-footer">
          <span className="file-card-date">{formatDate(file.created_at)}</span>
          <div className="file-card-actions">
            <button className="btn btn-icon btn-sm" onClick={handleDownloadClick} title="Download">
              <Download size={14} />
            </button>
            <button
              className="btn btn-icon btn-sm btn-danger-icon"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
