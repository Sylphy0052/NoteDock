import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Star,
  User,
  Eye,
  Edit3,
} from 'lucide-react'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type Template,
  type TemplateCreate,
  type TemplateUpdate,
} from '../api/templates'
import { useToast } from '../components/common'

type FilterType = 'all' | 'system' | 'user'

interface TemplateItemProps {
  template: Template
  isSelected: boolean
  onSelect: (id: number) => void
  onEdit: (template: Template) => void
  onDelete: (template: Template) => void
}

function TemplateItem({
  template,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: TemplateItemProps) {
  return (
    <li className="template-page-list-item">
      <div className={`template-page-list-button ${isSelected ? 'active' : ''}`}>
        <button className="template-select" onClick={() => onSelect(template.id)}>
          {template.is_system ? <Star size={16} /> : <User size={16} />}
          <div className="template-info">
            <span className="template-name">{template.name}</span>
            {template.description && (
              <span className="template-description">{template.description}</span>
            )}
          </div>
        </button>
        <div className="template-actions">
          <button
            className="btn btn-icon btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(template)
            }}
            title="編集"
          >
            <Pencil size={14} />
          </button>
          <button
            className="btn btn-icon btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(template)
            }}
            title="削除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </li>
  )
}

export default function TemplatesPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null)

  // フォーム状態
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formContent, setFormContent] = useState('')

  // 編集フォーム状態
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editContent, setEditContent] = useState('')

  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // テンプレート一覧取得
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  })

  // 作成
  const createMutation = useMutation({
    mutationFn: (data: TemplateCreate) => createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      showToast('テンプレートを作成しました', 'success')
      closeCreateModal()
    },
    onError: () => {
      showToast('テンプレートの作成に失敗しました', 'error')
    },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TemplateUpdate }) =>
      updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      showToast('テンプレートを更新しました', 'success')
      setIsEditMode(false)
    },
    onError: () => {
      showToast('テンプレートの更新に失敗しました', 'error')
    },
  })

  // 削除
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      showToast('テンプレートを削除しました', 'success')
      if (selectedTemplateId === deletingTemplate?.id) {
        setSelectedTemplateId(null)
      }
      setDeletingTemplate(null)
    },
    onError: () => {
      showToast('テンプレートの削除に失敗しました', 'error')
    },
  })

  const templates = templatesData?.items || []
  const filteredTemplates = templates.filter((t) => {
    if (filter === 'all') return true
    if (filter === 'system') return t.is_system
    return !t.is_system
  })

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  const handleSelectTemplate = (id: number) => {
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null)
      setIsEditMode(false)
    } else {
      setSelectedTemplateId(id)
      setIsEditMode(false)
      const template = templates.find((t) => t.id === id)
      if (template) {
        setEditName(template.name)
        setEditDescription(template.description || '')
        setEditContent(template.content || '')
      }
    }
  }

  const openCreateModal = () => {
    setFormName('')
    setFormDescription('')
    setFormContent('')
    setIsCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    setIsCreateModalOpen(false)
    setFormName('')
    setFormDescription('')
    setFormContent('')
  }

  const handleCreate = () => {
    if (!formName.trim()) return
    createMutation.mutate({
      name: formName,
      description: formDescription,
      content: formContent,
    })
  }

  const handleUpdate = () => {
    if (!selectedTemplate || !editName.trim()) return
    updateMutation.mutate({
      id: selectedTemplate.id,
      data: {
        name: editName,
        description: editDescription,
        content: editContent,
      },
    })
  }

  const handleDelete = () => {
    if (!deletingTemplate) return
    deleteMutation.mutate(deletingTemplate.id)
  }

  const startEdit = () => {
    if (selectedTemplate) {
      setEditName(selectedTemplate.name)
      setEditDescription(selectedTemplate.description || '')
      setEditContent(selectedTemplate.content || '')
      setIsEditMode(true)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  return (
    <div className="templates-page">
      <header className="page-header">
        <h1>
          <FileText size={24} />
          テンプレート
        </h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} />
          新規テンプレート
        </button>
      </header>

      <div className="templates-layout">
        {/* 左パネル: テンプレート一覧 */}
        <aside className="templates-sidebar">
          <div className="template-filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              すべて
            </button>
            <button
              className={`filter-tab ${filter === 'system' ? 'active' : ''}`}
              onClick={() => setFilter('system')}
            >
              システム
            </button>
            <button
              className={`filter-tab ${filter === 'user' ? 'active' : ''}`}
              onClick={() => setFilter('user')}
            >
              マイテンプレート
            </button>
          </div>

          {isLoading ? (
            <div className="loading-placeholder">
              <div className="spinner" />
            </div>
          ) : filteredTemplates.length > 0 ? (
            <ul className="template-page-list">
              {filteredTemplates.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplateId === template.id}
                  onSelect={handleSelectTemplate}
                  onEdit={(t) => {
                    handleSelectTemplate(t.id)
                    setTimeout(() => startEdit(), 0)
                  }}
                  onDelete={setDeletingTemplate}
                />
              ))}
            </ul>
          ) : (
            <div className="no-templates">
              <FileText size={32} />
              <p>テンプレートがありません</p>
              <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                <Plus size={16} />
                作成する
              </button>
            </div>
          )}
        </aside>

        {/* 右パネル: プレビュー/編集 */}
        <main className="templates-content">
          {selectedTemplate ? (
            <>
              <div className="templates-content-header">
                <h2>
                  {selectedTemplate.is_system ? <Star size={20} /> : <User size={20} />}
                  {selectedTemplate.name}
                  {selectedTemplate.is_system && (
                    <span className="template-badge system">システム</span>
                  )}
                </h2>
                <div className="templates-content-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => (isEditMode ? setIsEditMode(false) : startEdit())}
                  >
                    {isEditMode ? <Eye size={16} /> : <Edit3 size={16} />}
                    {isEditMode ? 'プレビュー' : '編集'}
                  </button>
                </div>
              </div>

              {isEditMode ? (
                <div className="template-edit-form">
                  <div className="form-group">
                    <label htmlFor="edit-name">テンプレート名</label>
                    <input
                      id="edit-name"
                      type="text"
                      className="form-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="テンプレート名"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-description">説明</label>
                    <input
                      id="edit-description"
                      type="text"
                      className="form-input"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="説明（任意）"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-content">内容</label>
                    <textarea
                      id="edit-content"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="テンプレートの内容（Markdown）"
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setIsEditMode(false)}
                    >
                      キャンセル
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleUpdate}
                      disabled={!editName.trim() || updateMutation.isPending}
                    >
                      {updateMutation.isPending ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="template-preview">
                  <div className="template-preview-meta">
                    {selectedTemplate.description && (
                      <p className="template-preview-description">
                        {selectedTemplate.description}
                      </p>
                    )}
                    <p className="template-preview-date">
                      更新日時: {formatDate(selectedTemplate.updated_at)}
                    </p>
                  </div>
                  <pre className="template-preview-content">
                    {selectedTemplate.content || '（内容がありません）'}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="templates-intro">
              <FileText size={48} />
              <h2>テンプレートを選択してください</h2>
              <p>左のリストからテンプレートを選択すると、内容をプレビュー・編集できます</p>
            </div>
          )}
        </main>
      </div>

      {/* 作成モーダル */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新規テンプレート</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="create-name">テンプレート名</label>
                <input
                  id="create-name"
                  type="text"
                  className="input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="テンプレート名を入力"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="create-description">説明（任意）</label>
                <input
                  id="create-description"
                  type="text"
                  className="input"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="テンプレートの説明"
                />
              </div>
              <div className="form-group">
                <label htmlFor="create-content">内容（任意）</label>
                <textarea
                  id="create-content"
                  className="input"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="テンプレートの内容（Markdown）"
                  rows={10}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeCreateModal}>
                キャンセル
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!formName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deletingTemplate && (
        <div className="modal-overlay" onClick={() => setDeletingTemplate(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>テンプレートを削除</h3>
            </div>
            <div className="modal-body">
              <p>
                テンプレート「<strong>{deletingTemplate.name}</strong>」を削除しますか？
              </p>
              {deletingTemplate.is_system && (
                <p className="text-warning">
                  これはシステムテンプレートです。削除すると復元できません。
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeletingTemplate(null)}>
                キャンセル
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
