import { useState, useRef, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Upload, X, File, Image, FileText, Loader } from 'lucide-react'
import { uploadFile } from '../../api/files'
import { useToast } from '../common'
import type { FileUploadResponse } from '../../api/types'

interface FileUploaderProps {
  onUploadComplete?: (file: FileUploadResponse) => void
  accept?: string
  maxSizeMB?: number
  multiple?: boolean
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  error?: string
}

export function FileUploader({
  onUploadComplete,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.json,.csv',
  maxSizeMB = 10,
  multiple = true,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const uploadMutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: (data, variables) => {
      setUploadingFiles((prev) => prev.filter((f) => f.file !== variables))
      onUploadComplete?.(data)
      showToast('ファイルをアップロードしました', 'success')
    },
    onError: (error, variables) => {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.file === variables ? { ...f, error: 'アップロードに失敗しました' } : f))
      )
      showToast('アップロードに失敗しました', 'error')
    },
  })

  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `ファイルサイズは${maxSizeMB}MB以下にしてください`
    }
    return null
  }

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return

      const fileArray = Array.from(files)
      const filesToUpload = multiple ? fileArray : [fileArray[0]]

      filesToUpload.forEach((file) => {
        const error = validateFile(file)
        if (error) {
          showToast(error, 'error')
          return
        }

        const uploadingFile: UploadingFile = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          progress: 0,
        }

        setUploadingFiles((prev) => [...prev, uploadingFile])
        uploadMutation.mutate(file)
      })
    },
    [multiple, uploadMutation, showToast, maxSizeMB]
  )

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeUploadingFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image size={20} />
    }
    if (mimeType === 'application/pdf') {
      return <FileText size={20} />
    }
    return <File size={20} />
  }

  return (
    <div className="file-uploader">
      <div
        className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <Upload size={32} className="drop-icon" />
        <p className="drop-text">ドラッグ＆ドロップ または クリックしてファイルを選択</p>
        <p className="drop-hint">
          最大{maxSizeMB}MB / {accept.split(',').slice(0, 3).join(', ')}...
        </p>
      </div>

      {uploadingFiles.length > 0 && (
        <ul className="uploading-list">
          {uploadingFiles.map((item) => (
            <li key={item.id} className={`uploading-item ${item.error ? 'error' : ''}`}>
              {getFileIcon(item.file.type)}
              <span className="uploading-name">{item.file.name}</span>
              {item.error ? (
                <>
                  <span className="uploading-error">{item.error}</span>
                  <button
                    className="btn btn-icon btn-sm"
                    onClick={() => removeUploadingFile(item.id)}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <Loader size={16} className="uploading-spinner" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
