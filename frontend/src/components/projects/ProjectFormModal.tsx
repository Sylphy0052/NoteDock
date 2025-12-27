import { useState, useEffect } from 'react'
import { X, Briefcase, Save, Loader2 } from 'lucide-react'
import { useCreateProject, useUpdateProject, useCompanies } from '../../hooks'
import type { Project } from '../../api/types'

interface ProjectFormModalProps {
  isOpen: boolean
  onClose: () => void
  project?: Project | null
  defaultCompanyId?: number | null
  onSuccess?: () => void
}

export function ProjectFormModal({
  isOpen,
  onClose,
  project,
  defaultCompanyId,
  onSuccess,
}: ProjectFormModalProps) {
  const [name, setName] = useState('')
  const [companyId, setCompanyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const { data: companiesData } = useCompanies({ page_size: 100 })

  const isEditing = !!project
  const isSaving = createProject.isPending || updateProject.isPending

  useEffect(() => {
    if (project) {
      setName(project.name)
      setCompanyId(project.company_id)
    } else {
      setName('')
      setCompanyId(defaultCompanyId ?? null)
    }
    setError(null)
  }, [project, defaultCompanyId, isOpen])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('プロジェクト名を入力してください')
      return
    }

    setError(null)

    try {
      if (isEditing && project) {
        await updateProject.mutateAsync({
          id: project.id,
          data: {
            name: name.trim(),
            company_id: companyId,
          },
        })
      } else {
        await createProject.mutateAsync({
          name: name.trim(),
          company_id: companyId,
        })
      }
      onSuccess?.()
      handleClose()
    } catch (err) {
      console.error('Failed to save project:', err)
      setError(isEditing ? 'プロジェクトの更新に失敗しました' : 'プロジェクトの作成に失敗しました')
    }
  }

  const handleClose = () => {
    setName('')
    setCompanyId(null)
    setError(null)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal project-form-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>
            <Briefcase size={20} />
            {isEditing ? 'プロジェクトを編集' : 'プロジェクトを作成'}
          </h2>
          <button className="btn btn-icon" onClick={handleClose}>
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="project-name">プロジェクト名 *</label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例: システム開発案件"
              className="form-input"
              maxLength={255}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-company">会社</label>
            <select
              id="project-company"
              value={companyId ?? ''}
              onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : null)}
              className="form-select"
            >
              <option value="">なし</option>
              {companiesData?.items?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <span className="form-hint">プロジェクトを関連付ける会社を選択できます</span>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <footer className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            キャンセル
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isEditing ? '更新' : '作成'}
          </button>
        </footer>
      </div>
    </div>
  )
}
