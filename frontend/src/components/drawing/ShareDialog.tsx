/**
 * ShareDialog - 描画の共有ダイアログ
 */

import { useState, useCallback } from 'react'
import { Copy, Trash2, Link, Lock, Clock, Users, Eye, Edit } from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { useDrawingShares, useShareMutations } from '../../hooks/useDrawings'
import { generateShareUrl, type ShareResponse } from '../../api/drawings'

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  drawingId: string
  drawingName: string
}

export function ShareDialog({ isOpen, onClose, drawingId, drawingName }: ShareDialogProps) {
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const { data: shares, isLoading } = useDrawingShares(drawingId)
  const { createShare, deleteShare, isCreating, isDeleting } = useShareMutations(drawingId)

  const handleCreateShare = useCallback(async () => {
    try {
      await createShare({
        permission,
        password: usePassword ? password : undefined,
        expires_in_days: expiresInDays,
      })
      // フォームをリセット
      setPassword('')
      setUsePassword(false)
      setExpiresInDays(undefined)
    } catch (error) {
      console.error('Failed to create share:', error)
      alert('共有リンクの作成に失敗しました')
    }
  }, [createShare, permission, usePassword, password, expiresInDays])

  const handleDeleteShare = useCallback(
    async (shareId: string) => {
      if (!confirm('この共有リンクを削除しますか？')) return
      try {
        await deleteShare(shareId)
      } catch (error) {
        console.error('Failed to delete share:', error)
        alert('共有リンクの削除に失敗しました')
      }
    },
    [deleteShare]
  )

  const copyToClipboard = useCallback(async (token: string) => {
    const url = generateShareUrl(token)
    try {
      await navigator.clipboard.writeText(url)
      setCopySuccess(token)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch {
      alert('クリップボードへのコピーに失敗しました')
    }
  }, [])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '無期限'
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`「${drawingName}」を共有`}>
      <div className="share-dialog">
        {/* 新規共有リンク作成セクション */}
        <div className="share-create-section">
          <h4 className="share-section-title">
            <Link size={16} />
            新しい共有リンクを作成
          </h4>

          <div className="share-form">
            {/* 権限選択 */}
            <div className="share-form-group">
              <label>権限</label>
              <div className="share-permission-buttons">
                <button
                  type="button"
                  className={`share-permission-btn ${permission === 'view' ? 'active' : ''}`}
                  onClick={() => setPermission('view')}
                >
                  <Eye size={16} />
                  閲覧のみ
                </button>
                <button
                  type="button"
                  className={`share-permission-btn ${permission === 'edit' ? 'active' : ''}`}
                  onClick={() => setPermission('edit')}
                >
                  <Edit size={16} />
                  編集可能
                </button>
              </div>
            </div>

            {/* パスワード保護 */}
            <div className="share-form-group">
              <label className="share-checkbox-label">
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                />
                <Lock size={14} />
                パスワード保護
              </label>
              {usePassword && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを入力"
                  className="share-password-input"
                />
              )}
            </div>

            {/* 有効期限 */}
            <div className="share-form-group">
              <label>
                <Clock size={14} />
                有効期限
              </label>
              <select
                value={expiresInDays ?? ''}
                onChange={(e) =>
                  setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)
                }
                className="share-expires-select"
              >
                <option value="">無期限</option>
                <option value="1">1日</option>
                <option value="7">1週間</option>
                <option value="30">30日</option>
                <option value="90">90日</option>
              </select>
            </div>

            <Button
              variant="primary"
              onClick={handleCreateShare}
              disabled={isCreating || (usePassword && !password)}
            >
              {isCreating ? '作成中...' : '共有リンクを作成'}
            </Button>
          </div>
        </div>

        {/* 既存の共有リンク一覧 */}
        <div className="share-list-section">
          <h4 className="share-section-title">
            <Users size={16} />
            共有リンク一覧
          </h4>

          {isLoading ? (
            <div className="share-loading">読み込み中...</div>
          ) : shares && shares.length > 0 ? (
            <ul className="share-list">
              {shares.map((share: ShareResponse) => (
                <li key={share.id} className="share-item">
                  <div className="share-item-info">
                    <div className="share-item-permission">
                      {share.permission === 'edit' ? (
                        <Edit size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                      {share.permission === 'edit' ? '編集可能' : '閲覧のみ'}
                    </div>
                    <div className="share-item-meta">
                      {share.has_password && (
                        <span className="share-badge">
                          <Lock size={12} />
                          パスワード保護
                        </span>
                      )}
                      <span className="share-item-expires">
                        期限: {formatDate(share.expires_at)}
                      </span>
                      <span className="share-item-access">
                        アクセス: {share.access_count}回
                      </span>
                    </div>
                  </div>
                  <div className="share-item-actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(share.share_token)}
                      leftIcon={<Copy size={14} />}
                    >
                      {copySuccess === share.share_token ? 'コピーしました!' : 'コピー'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteShare(share.id)}
                      disabled={isDeleting}
                      leftIcon={<Trash2 size={14} />}
                    >
                      削除
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="share-empty">
              <p>共有リンクはまだありません</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
