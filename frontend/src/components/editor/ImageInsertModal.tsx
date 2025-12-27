import { useState, useRef, useCallback } from 'react'
import { X, Upload, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import { uploadFile, getFileDownloadUrl } from '../../api/files'

interface ImageInsertModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (markdown: string) => void
}

export function ImageInsertModal({ isOpen, onClose, onInsert }: ImageInsertModalProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [imageUrl, setImageUrl] = useState('')
  const [altText, setAltText] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const resetState = useCallback(() => {
    setMode('upload')
    setImageUrl('')
    setAltText('')
    setPreviewUrl(null)
    setError(null)
    setIsUploading(false)
    setIsDragging(false)
  }, [])

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください')
      return
    }

    setError(null)
    setIsUploading(true)

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)
    setAltText(file.name.replace(/\.[^.]+$/, ''))

    try {
      const data = await uploadFile(file)
      const url = await getFileDownloadUrl(data.id)
      setImageUrl(url)
      setIsUploading(false)
    } catch (err) {
      setError('画像のアップロードに失敗しました')
      setIsUploading(false)
      setPreviewUrl(null)
      URL.revokeObjectURL(localPreview)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
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

  const handleUrlChange = (url: string) => {
    setImageUrl(url)
    setPreviewUrl(url)
    setError(null)
  }

  const handleInsert = () => {
    if (!imageUrl) {
      setError('画像URLを入力してください')
      return
    }

    const alt = altText || 'image'
    const markdown = `![${alt}](${imageUrl})`
    onInsert(markdown)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal image-insert-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>
            <ImageIcon size={20} />
            画像を挿入
          </h2>
          <button className="btn btn-icon" onClick={handleClose}>
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          {/* Mode tabs */}
          <div className="image-insert-tabs">
            <button
              className={`tab ${mode === 'upload' ? 'active' : ''}`}
              onClick={() => setMode('upload')}
            >
              <Upload size={16} />
              アップロード
            </button>
            <button
              className={`tab ${mode === 'url' ? 'active' : ''}`}
              onClick={() => setMode('url')}
            >
              <LinkIcon size={16} />
              URL
            </button>
          </div>

          {mode === 'upload' ? (
            <div
              ref={dropZoneRef}
              className={`image-drop-zone ${isDragging ? 'dragging' : ''} ${previewUrl ? 'has-preview' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !previewUrl && fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="image-preview-container">
                  <img src={previewUrl} alt="プレビュー" className="image-preview" />
                  {isUploading && (
                    <div className="upload-overlay">
                      <div className="spinner" />
                      <span>アップロード中...</span>
                    </div>
                  )}
                  <button
                    className="change-image-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                  >
                    画像を変更
                  </button>
                </div>
              ) : (
                <div className="drop-zone-content">
                  <Upload size={32} />
                  <p>クリックまたはドラッグ＆ドロップ</p>
                  <p className="drop-zone-hint">PNG, JPG, GIF, WebP対応</p>
                </div>
              )}
            </div>
          ) : (
            <div className="url-input-section">
              <label>画像URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://example.com/image.png"
                className="url-input"
              />
              {previewUrl && (
                <div className="url-preview">
                  <img
                    src={previewUrl}
                    alt="プレビュー"
                    onError={() => {
                      setPreviewUrl(null)
                      setError('画像を読み込めませんでした')
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Alt text input */}
          <div className="alt-text-section">
            <label>代替テキスト（alt）</label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="画像の説明を入力"
              className="alt-input"
            />
            <p className="alt-hint">画像が表示されない場合やスクリーンリーダー用に表示されます</p>
          </div>

          {error && <div className="image-insert-error">{error}</div>}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>

        <footer className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            キャンセル
          </button>
          <button
            className="btn btn-primary"
            onClick={handleInsert}
            disabled={!imageUrl || isUploading}
          >
            挿入
          </button>
        </footer>
      </div>
    </div>
  )
}
