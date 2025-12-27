import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { File, Search, AlertTriangle, Trash2 } from 'lucide-react'
import { getFiles, deleteFile, getFileUrl } from '../api/files'
import { Pagination, Modal } from '../components/common'
import { FileViewerModal } from '../components/files/FileViewerModal'
import FileCard from '../components/files/FileCard'
import type { FileResponse } from '../api/types'

export default function FilesListPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<FileResponse | null>(null)
  const pageSize = 20

  // Fetch files
  const { data, isLoading } = useQuery({
    queryKey: ['files', { page, pageSize, search }],
    queryFn: () =>
      getFiles({
        page,
        page_size: pageSize,
        search: search || undefined,
      }),
  })

  const files = data?.items || []
  const total = data?.total || 0
  const totalPages = data?.total_pages || 0

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (fileId: number) => deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      setDeleteConfirmId(null)
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handlePreview = (file: FileResponse) => {
    setPreviewFile(file)
  }

  const handleDownload = (file: FileResponse) => {
    window.open(getFileUrl(file.id), '_blank')
  }

  const handleDelete = (file: FileResponse) => {
    setDeleteConfirmId(file.id)
  }

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId)
    }
  }

  return (
    <div className="files-page">
      <header className="page-header">
        <h1>
          <File size={24} />
          Files
        </h1>
        <p className="page-description">Uploaded files</p>
      </header>

      <div className="files-toolbar">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>
      </div>

      <div className="files-content">
        {isLoading ? (
          <div className="loading-placeholder">
            <div className="spinner" />
            <span>Loading...</span>
          </div>
        ) : files.length > 0 ? (
          <>
            <div className="files-info">
              <span>{total} files</span>
            </div>
            <div className="files-grid">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            )}
          </>
        ) : (
          <div className="empty-state">
            <File size={48} className="empty-icon" />
            <h2>No files</h2>
            <p>Uploaded files will appear here</p>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      <FileViewerModal
        isOpen={previewFile !== null}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        files={files}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete file"
      >
        <div className="delete-confirm-content">
          <div className="warning-icon">
            <AlertTriangle size={48} />
          </div>
          <p>
            Are you sure you want to delete this file?
            <br />
            <strong>This action cannot be undone.</strong>
          </p>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
