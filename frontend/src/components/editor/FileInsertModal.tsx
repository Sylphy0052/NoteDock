import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  Upload,
  Paperclip,
  FileText,
  File as FileIcon,
  Search,
  Check,
} from 'lucide-react'
import { uploadFile, getFileDownloadUrl, getFiles } from '../../api/files'
import type { FileResponse } from '../../api/types'

interface FileInsertModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (markdown: string) => void
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Get file icon based on mime type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('text/') || mimeType.includes('document')) {
    return <FileText size={24} />
  }
  return <FileIcon size={24} />
}

type TabType = 'upload' | 'existing'

export function FileInsertModal({ isOpen, onClose, onInsert }: FileInsertModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Existing files state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExistingFile, setSelectedExistingFile] = useState<FileResponse | null>(null)
  const [existingDisplayName, setExistingDisplayName] = useState('')

  // Fetch existing files
  const { data: filesData, isLoading: isLoadingFiles } = useQuery({
    queryKey: ['files', { search: searchQuery, page_size: 50 }],
    queryFn: () =>
      getFiles({
        search: searchQuery || undefined,
        page_size: 50,
      }),
    enabled: isOpen && activeTab === 'existing',
  })

  const existingFiles = filesData?.items || []

  const resetState = useCallback(() => {
    setActiveTab('upload')
    setSelectedFile(null)
    setDisplayName('')
    setError(null)
    setIsUploading(false)
    setUploadedFileUrl(null)
    setIsDragging(false)
    setSearchQuery('')
    setSelectedExistingFile(null)
    setExistingDisplayName('')
  }, [])

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleFileSelect = async (file: File) => {
    // Exclude image files (use ImageInsertModal for images)
    if (file.type.startsWith('image/')) {
      setError('画像ファイルは「画像を挿入」ボタンから挿入してください')
      return
    }

    // File size limit (50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setError('ファイルサイズは50MB以下にしてください')
      return
    }

    setError(null)
    setSelectedFile(file)
    setDisplayName(file.name)
    setIsUploading(true)

    try {
      const data = await uploadFile(file)
      const url = await getFileDownloadUrl(data.id)
      setUploadedFileUrl(url)
      setIsUploading(false)
    } catch (err) {
      setError('ファイルのアップロードに失敗しました')
      setIsUploading(false)
      setSelectedFile(null)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Reset file input
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleInsert = () => {
    if (activeTab === 'upload') {
      if (!uploadedFileUrl) {
        setError('ファイルをアップロードしてください')
        return
      }
      const name = displayName || selectedFile?.name || 'ファイル'
      const markdown = `[${name}](${uploadedFileUrl})`
      onInsert(markdown)
    } else {
      if (!selectedExistingFile) {
        setError('ファイルを選択してください')
        return
      }
      const name = existingDisplayName || selectedExistingFile.original_name
      const markdown = `[${name}](${selectedExistingFile.url})`
      onInsert(markdown)
    }
    handleClose()
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setDisplayName('')
    setUploadedFileUrl(null)
    setError(null)
  }

  const handleSelectExistingFile = (file: FileResponse) => {
    setSelectedExistingFile(file)
    setExistingDisplayName(file.original_name)
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal file-insert-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>
            <Paperclip size={20} />
            ファイルを挿入
          </h2>
          <button className="btn btn-icon" onClick={handleClose}>
            <X size={20} />
          </button>
        </header>

        {/* Tab buttons */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={16} />
            新規アップロード
          </button>
          <button
            className={`modal-tab ${activeTab === 'existing' ? 'active' : ''}`}
            onClick={() => setActiveTab('existing')}
          >
            <FileIcon size={16} />
            既存ファイルから選択
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'upload' ? (
            <>
              {/* Drop zone */}
              <div
                className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="file-preview-container">
                    <div className="file-preview">
                      {getFileIcon(selectedFile.type)}
                      <div className="file-info">
                        <span className="file-name">{selectedFile.name}</span>
                        <span className="file-size">{formatFileSize(selectedFile.size)}</span>
                      </div>
                      {isUploading && (
                        <div className="upload-status">
                          <div className="spinner" />
                          <span>アップロード中...</span>
                        </div>
                      )}
                      {!isUploading && uploadedFileUrl && (
                        <div className="upload-status upload-complete">
                          アップロード完了
                        </div>
                      )}
                    </div>
                    <button
                      className="change-file-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClearFile()
                      }}
                    >
                      ファイルを変更
                    </button>
                  </div>
                ) : (
                  <div className="drop-zone-content">
                    <Upload size={32} />
                    <p>クリックまたはドラッグ＆ドロップ</p>
                    <p className="drop-zone-hint">PDF, Word, Excel, テキストなど</p>
                  </div>
                )}
              </div>

              {/* Display name input */}
              {selectedFile && (
                <div className="display-name-section">
                  <label>表示名</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="リンクとして表示するテキスト"
                    className="display-name-input"
                  />
                  <p className="display-name-hint">
                    Markdown: [{displayName || selectedFile.name}](url)
                  </p>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.zip,.tar,.gz"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
            </>
          ) : (
            <>
              {/* Search input */}
              <div className="file-search-section">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="ファイル名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              {/* Existing files list */}
              <div className="existing-files-list">
                {isLoadingFiles ? (
                  <div className="loading-placeholder">
                    <div className="spinner" />
                    <span>読み込み中...</span>
                  </div>
                ) : existingFiles.length > 0 ? (
                  existingFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`existing-file-item ${selectedExistingFile?.id === file.id ? 'selected' : ''}`}
                      onClick={() => handleSelectExistingFile(file)}
                    >
                      <div className="existing-file-icon">
                        {getFileIcon(file.mime_type)}
                      </div>
                      <div className="existing-file-info">
                        <span className="existing-file-name">{file.original_name}</span>
                        <span className="existing-file-size">
                          {formatFileSize(file.size_bytes)}
                        </span>
                      </div>
                      {selectedExistingFile?.id === file.id && (
                        <div className="existing-file-check">
                          <Check size={16} />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-state-small">
                    <FileIcon size={32} />
                    <p>ファイルがありません</p>
                  </div>
                )}
              </div>

              {/* Display name input for existing file */}
              {selectedExistingFile && (
                <div className="display-name-section">
                  <label>表示名</label>
                  <input
                    type="text"
                    value={existingDisplayName}
                    onChange={(e) => setExistingDisplayName(e.target.value)}
                    placeholder="リンクとして表示するテキスト"
                    className="display-name-input"
                  />
                  <p className="display-name-hint">
                    Markdown: [{existingDisplayName || selectedExistingFile.original_name}](url)
                  </p>
                </div>
              )}
            </>
          )}

          {error && <div className="file-insert-error">{error}</div>}
        </div>

        <footer className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            キャンセル
          </button>
          <button
            className="btn btn-primary"
            onClick={handleInsert}
            disabled={
              activeTab === 'upload'
                ? !uploadedFileUrl || isUploading
                : !selectedExistingFile
            }
          >
            挿入
          </button>
        </footer>
      </div>
    </div>
  )
}
