import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Eye, RotateCcw, X, ChevronLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Modal, useToast } from '../common'
import { getNoteVersions, getNoteVersion, restoreNoteVersion } from '../../api/notes'
import type { NoteVersionBrief, NoteVersionFull } from '../../api/types'

interface VersionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  noteId: number
  currentTitle: string
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  noteId,
  currentTitle,
}: VersionHistoryModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<NoteVersionFull | null>(null)
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // Fetch version list
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['note', noteId, 'versions'],
    queryFn: () => getNoteVersions(noteId),
    enabled: isOpen,
  })

  // Fetch specific version content
  const versionQuery = useQuery({
    queryKey: ['note', noteId, 'version', selectedVersion?.version_no],
    queryFn: () => getNoteVersion(noteId, selectedVersion!.version_no),
    enabled: !!selectedVersion,
  })

  // Restore version mutation
  const restoreMutation = useMutation({
    mutationFn: (versionNo: number) => restoreNoteVersion(noteId, versionNo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] })
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      showToast('バージョンを復元しました', 'success')
      onClose()
    },
    onError: () => {
      showToast('復元に失敗しました', 'error')
    },
  })

  const handleViewVersion = (version: NoteVersionBrief) => {
    setSelectedVersion(version as NoteVersionFull)
  }

  const handleRestore = () => {
    if (selectedVersion) {
      restoreMutation.mutate(selectedVersion.version_no)
    }
  }

  const handleBack = () => {
    setSelectedVersion(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderVersionList = () => {
    if (versionsLoading) {
      return (
        <div className="version-loading">
          <div className="spinner" />
          <span>読み込み中...</span>
        </div>
      )
    }

    if (!versions || versions.length === 0) {
      return (
        <div className="version-empty">
          <Clock size={48} />
          <p>バージョン履歴がありません</p>
          <span>ノートを保存すると履歴が記録されます</span>
        </div>
      )
    }

    return (
      <ul className="version-list-modal">
        {versions.map((version) => (
          <li key={version.id} className="version-item">
            <div className="version-info">
              <span className="version-badge">v{version.version_no}</span>
              <div className="version-details">
                <span className="version-title-text">{version.title}</span>
                <span className="version-date-text">{formatDate(version.created_at)}</span>
              </div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => handleViewVersion(version)}>
              <Eye size={14} />
              表示
            </button>
          </li>
        ))}
      </ul>
    )
  }

  const renderVersionDetail = () => {
    const versionData = versionQuery.data

    if (versionQuery.isLoading) {
      return (
        <div className="version-loading">
          <div className="spinner" />
          <span>読み込み中...</span>
        </div>
      )
    }

    if (!versionData) {
      return <div className="version-error">バージョンの読み込みに失敗しました</div>
    }

    return (
      <div className="version-detail">
        <div className="version-detail-header">
          <button className="btn btn-ghost btn-sm" onClick={handleBack}>
            <ChevronLeft size={16} />
            一覧に戻る
          </button>
          <div className="version-detail-meta">
            <span className="version-badge">v{versionData.version_no}</span>
            <span className="version-date-text">{formatDate(versionData.created_at)}</span>
          </div>
        </div>

        <div className="version-detail-content">
          <h3 className="version-detail-title">{versionData.title}</h3>
          <div className="version-detail-body markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{versionData.content_md}</ReactMarkdown>
          </div>
        </div>

        <div className="version-detail-actions">
          <button
            className="btn btn-primary"
            onClick={handleRestore}
            disabled={restoreMutation.isPending}
          >
            <RotateCcw size={16} />
            このバージョンに復元
          </button>
        </div>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="version-modal-title">
          <Clock size={20} />
          <span>バージョン履歴</span>
          <span className="version-modal-note-title">{currentTitle}</span>
        </div>
      }
      size="lg"
    >
      <div className="version-history-content">
        {selectedVersion ? renderVersionDetail() : renderVersionList()}
      </div>
    </Modal>
  )
}
