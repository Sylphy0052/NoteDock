import { useState, useEffect } from 'react'
import { X, Building2, Save, Loader2 } from 'lucide-react'
import { useCreateCompany, useUpdateCompany } from '../../hooks'
import type { Company } from '../../api/types'

interface CompanyFormModalProps {
  isOpen: boolean
  onClose: () => void
  company?: Company | null
  onSuccess?: () => void
}

export function CompanyFormModal({
  isOpen,
  onClose,
  company,
  onSuccess,
}: CompanyFormModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany()

  const isEditing = !!company
  const isSaving = createCompany.isPending || updateCompany.isPending

  useEffect(() => {
    if (company) {
      setName(company.name)
    } else {
      setName('')
    }
    setError(null)
  }, [company, isOpen])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('会社名を入力してください')
      return
    }

    setError(null)

    try {
      if (isEditing && company) {
        await updateCompany.mutateAsync({
          id: company.id,
          data: { name: name.trim() },
        })
      } else {
        await createCompany.mutateAsync({ name: name.trim() })
      }
      onSuccess?.()
      handleClose()
    } catch (err) {
      console.error('Failed to save company:', err)
      setError(isEditing ? '会社の更新に失敗しました' : '会社の作成に失敗しました')
    }
  }

  const handleClose = () => {
    setName('')
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
      <div className="modal company-form-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>
            <Building2 size={20} />
            {isEditing ? '会社を編集' : '会社を作成'}
          </h2>
          <button className="btn btn-icon" onClick={handleClose}>
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="company-name">会社名 *</label>
            <input
              id="company-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例: 株式会社サンプル"
              className="form-input"
              maxLength={255}
              autoFocus
            />
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
