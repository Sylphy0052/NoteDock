import { useState } from 'react'
import { X, FileText, Save, Loader2 } from 'lucide-react'
import { createTemplate } from '../../api/templates'

interface SaveAsTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  content: string
  defaultName?: string
  onSave?: () => void
}

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  content,
  defaultName = '',
  onSave,
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState(defaultName)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      setError('テンプレート名を入力してください')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await createTemplate({
        name: name.trim(),
        description: description.trim(),
        content: content,
      })
      onSave?.()
      handleClose()
    } catch (err) {
      console.error('Failed to save template:', err)
      setError('テンプレートの保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setName(defaultName)
    setDescription('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal save-template-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>
            <FileText size={20} />
            テンプレートとして保存
          </h2>
          <button className="btn btn-icon" onClick={handleClose}>
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="template-name">テンプレート名 *</label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: プロジェクト計画書"
              className="form-input"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="template-description">説明</label>
            <input
              id="template-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: プロジェクトの計画書テンプレート"
              className="form-input"
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label>プレビュー</label>
            <div className="template-content-preview">
              <pre>
                {content.slice(0, 500)}
                {content.length > 500 ? '...' : ''}
              </pre>
            </div>
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
            保存
          </button>
        </footer>
      </div>
    </div>
  )
}
