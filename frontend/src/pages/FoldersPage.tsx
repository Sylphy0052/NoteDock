import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  FolderTree,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  MessageCircle,
} from 'lucide-react'
import { getFolders, createFolder, updateFolder, deleteFolder } from '../api/folders'
import { getNotes } from '../api/notes'
import { checkAIStatus } from '../api/ai'
import type { Folder as FolderType } from '../api/types'
import { NoteCard } from '../components/notes'
import { Pagination, useToast } from '../components/common'
import { AIFolderSummarizeModal } from '../components/ai/AIFolderSummarizeModal'
import { AIFolderAskPanel } from '../components/ai/AIFolderAskPanel'

interface FolderItemProps {
  folder: FolderType
  level: number
  selectedFolderId: number | null
  onSelect: (folderId: number) => void
  onEdit: (folder: FolderType) => void
  onDelete: (folder: FolderType) => void
}

function FolderItem({
  folder,
  level,
  selectedFolderId,
  onSelect,
  onEdit,
  onDelete,
}: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = folder.children && folder.children.length > 0
  const isSelected = selectedFolderId === folder.id

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <li className="folder-list-item">
      <div
        className={`folder-list-button ${isSelected ? 'active' : ''}`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        <button className="folder-select" onClick={() => onSelect(folder.id)}>
          {hasChildren && (
            <span className="folder-expand" onClick={toggleExpand}>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          {!hasChildren && <span className="folder-expand-placeholder" />}
          {isExpanded || isSelected ? <FolderOpen size={18} /> : <Folder size={18} />}
          <span className="folder-name">{folder.name}</span>
        </button>
        <div className="folder-actions">
          <button
            className="btn btn-icon btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(folder)
            }}
            title="編集"
          >
            <Pencil size={14} />
          </button>
          <button
            className="btn btn-icon btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(folder)
            }}
            title="削除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <ul className="folder-list-children">
          {folder.children!.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function FoldersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedFolderId = searchParams.get('folder_id')
    ? parseInt(searchParams.get('folder_id')!, 10)
    : null
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = 12

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<FolderType | null>(null)
  const [folderName, setFolderName] = useState('')
  const [parentFolderId, setParentFolderId] = useState<number | null>(null)

  // AI panel states
  const [isSummarizeModalOpen, setIsSummarizeModalOpen] = useState(false)
  const [isAskPanelOpen, setIsAskPanelOpen] = useState(false)

  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // Check AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: checkAIStatus,
  })

  // Fetch all folders
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: getFolders,
  })

  // Fetch notes for selected folder
  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['notes', { folder_id: selectedFolderId, page, pageSize }],
    queryFn: () => getNotes({ folder_id: selectedFolderId!, page, page_size: pageSize }),
    enabled: !!selectedFolderId,
  })

  // Create folder mutation
  const createMutation = useMutation({
    mutationFn: () => createFolder(folderName, parentFolderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      showToast('フォルダを作成しました', 'success')
      setIsCreateModalOpen(false)
      setFolderName('')
      setParentFolderId(null)
    },
    onError: () => {
      showToast('フォルダの作成に失敗しました', 'error')
    },
  })

  // Update folder mutation
  const updateMutation = useMutation({
    mutationFn: () => updateFolder(editingFolder!.id, folderName, parentFolderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      showToast('フォルダを更新しました', 'success')
      setEditingFolder(null)
      setFolderName('')
      setParentFolderId(null)
    },
    onError: () => {
      showToast('フォルダの更新に失敗しました', 'error')
    },
  })

  // Delete folder mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteFolder(deletingFolder!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      showToast('フォルダを削除しました', 'success')
      setDeletingFolder(null)
      if (selectedFolderId === deletingFolder?.id) {
        setSearchParams({})
      }
    },
    onError: () => {
      showToast('フォルダの削除に失敗しました', 'error')
    },
  })

  const handleFolderSelect = (folderId: number) => {
    const newParams = new URLSearchParams()
    if (selectedFolderId === folderId) {
      // Deselect
      setSearchParams({})
    } else {
      newParams.set('folder_id', folderId.toString())
      newParams.set('page', '1')
      setSearchParams(newParams)
    }
  }

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', newPage.toString())
    setSearchParams(newParams)
  }

  const handleClearFolder = () => {
    setSearchParams({})
  }

  const openCreateModal = () => {
    setFolderName('')
    setParentFolderId(null)
    setIsCreateModalOpen(true)
  }

  const openEditModal = (folder: FolderType) => {
    setFolderName(folder.name)
    setParentFolderId(folder.parent_id)
    setEditingFolder(folder)
  }

  const openDeleteModal = (folder: FolderType) => {
    setDeletingFolder(folder)
  }

  const notes = notesData?.items || []
  const total = notesData?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  // Get flat list of folders for parent selection
  const flatFolders: FolderType[] = []
  const flattenFolders = (items: FolderType[]) => {
    items.forEach((item) => {
      flatFolders.push(item)
      if (item.children) {
        flattenFolders(item.children)
      }
    })
  }
  if (folders) {
    flattenFolders(folders)
  }

  // Get selected folder name
  const selectedFolder = flatFolders.find((f) => f.id === selectedFolderId)

  // Build tree structure (only show root level, children are nested)
  const rootFolders = folders?.filter((f) => f.parent_id === null) || []

  return (
    <div className="folders-page">
      <header className="page-header">
        <h1>
          <FolderTree size={24} />
          フォルダ
        </h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <FolderPlus size={18} />
          新規フォルダ
        </button>
      </header>

      <div className="folders-layout">
        {/* Folder list sidebar */}
        <aside className="folders-sidebar">
          <h2>すべてのフォルダ</h2>
          {foldersLoading ? (
            <div className="loading-placeholder">
              <div className="spinner" />
            </div>
          ) : rootFolders.length > 0 ? (
            <ul className="folder-list">
              {rootFolders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  level={0}
                  selectedFolderId={selectedFolderId}
                  onSelect={handleFolderSelect}
                  onEdit={openEditModal}
                  onDelete={openDeleteModal}
                />
              ))}
            </ul>
          ) : (
            <div className="no-folders">
              <Folder size={32} />
              <p>フォルダがありません</p>
              <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                <FolderPlus size={16} />
                作成する
              </button>
            </div>
          )}
        </aside>

        {/* Notes content */}
        <main className="folders-content">
          {selectedFolderId ? (
            <>
              <div className="folders-content-header">
                <h2>
                  <Folder size={20} />
                  {selectedFolder?.name}
                </h2>
                <div className="folders-content-actions">
                  {aiStatus?.enabled && (
                    <>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setIsSummarizeModalOpen(true)}
                        title="フォルダを要約"
                      >
                        <Sparkles size={16} />
                        要約
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setIsAskPanelOpen(true)}
                        title="フォルダについて質問"
                      >
                        <MessageCircle size={16} />
                        質問
                      </button>
                    </>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={handleClearFolder}>
                    クリア
                  </button>
                </div>
              </div>

              {notesLoading ? (
                <div className="loading-placeholder">
                  <div className="spinner" />
                  <span>読み込み中...</span>
                </div>
              ) : notes.length > 0 ? (
                <>
                  <p className="notes-count">{total}件のノート</p>
                  <div className="note-grid">
                    {notes.map((note) => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <p>このフォルダにノートはありません</p>
                </div>
              )}
            </>
          ) : (
            <div className="folders-intro">
              <FolderTree size={48} />
              <h2>フォルダを選択してください</h2>
              <p>左のリストからフォルダを選択すると、関連するノートが表示されます</p>
            </div>
          )}
        </main>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新規フォルダ</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="folder-name">フォルダ名</label>
                <input
                  id="folder-name"
                  type="text"
                  className="input"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="フォルダ名を入力"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="parent-folder">親フォルダ（任意）</label>
                <select
                  id="parent-folder"
                  className="input"
                  value={parentFolderId ?? ''}
                  onChange={(e) =>
                    setParentFolderId(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                >
                  <option value="">なし（ルート）</option>
                  {flatFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setIsCreateModalOpen(false)}>
                キャンセル
              </button>
              <button
                className="btn btn-primary"
                onClick={() => createMutation.mutate()}
                disabled={!folderName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingFolder && (
        <div className="modal-overlay" onClick={() => setEditingFolder(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>フォルダを編集</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-folder-name">フォルダ名</label>
                <input
                  id="edit-folder-name"
                  type="text"
                  className="input"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="フォルダ名を入力"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-parent-folder">親フォルダ（任意）</label>
                <select
                  id="edit-parent-folder"
                  className="input"
                  value={parentFolderId ?? ''}
                  onChange={(e) =>
                    setParentFolderId(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                >
                  <option value="">なし（ルート）</option>
                  {flatFolders
                    .filter((f) => f.id !== editingFolder.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditingFolder(null)}>
                キャンセル
              </button>
              <button
                className="btn btn-primary"
                onClick={() => updateMutation.mutate()}
                disabled={!folderName.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? '更新中...' : '更新'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingFolder && (
        <div className="modal-overlay" onClick={() => setDeletingFolder(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>フォルダを削除</h3>
            </div>
            <div className="modal-body">
              <p>
                フォルダ「<strong>{deletingFolder.name}</strong>」を削除しますか？
              </p>
              <p className="text-muted">
                このフォルダ内のノートはフォルダから外れますが、削除されません。
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeletingFolder(null)}>
                キャンセル
              </button>
              <button
                className="btn btn-danger"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Summarize Modal */}
      {selectedFolderId && selectedFolder && (
        <AIFolderSummarizeModal
          isOpen={isSummarizeModalOpen}
          onClose={() => setIsSummarizeModalOpen(false)}
          folderId={selectedFolderId}
          folderName={selectedFolder.name}
        />
      )}

      {/* AI Ask Panel */}
      {selectedFolderId && selectedFolder && (
        <AIFolderAskPanel
          folderId={selectedFolderId}
          folderName={selectedFolder.name}
          isOpen={isAskPanelOpen}
          onClose={() => setIsAskPanelOpen(false)}
        />
      )}
    </div>
  )
}
