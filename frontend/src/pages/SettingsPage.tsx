import { useState, useEffect } from 'react'
import { Save, Bell, BellOff, User, Bot, Zap, Clock, Turtle } from 'lucide-react'
import {
  getSettings,
  updateSettings,
  getAvailableModels,
  AppSettings,
  ModelInfo,
} from '../api'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('notedock_display_name') || ''
  )
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const [settingsData, modelsData] = await Promise.all([getSettings(), getAvailableModels()])
      setSettings(settingsData)
      setModels(modelsData.models)
    } catch (error) {
      console.error('Failed to load settings:', error)
      setMessage({ type: 'error', text: '設定の読み込みに失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  const handleDiscordToggle = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const newValue = !settings.discord_notification_enabled
      const updated = await updateSettings({
        discord_notification_enabled: newValue,
      })
      setSettings(updated)
      setMessage({
        type: 'success',
        text: newValue ? 'Discord通知を有効にしました' : 'Discord通知を無効にしました',
      })
    } catch (error) {
      console.error('Failed to update settings:', error)
      setMessage({ type: 'error', text: '設定の更新に失敗しました' })
    } finally {
      setSaving(false)
    }
  }

  const handleNotifyOptionChange = async (
    key: 'discord_notify_on_create' | 'discord_notify_on_update' | 'discord_notify_on_comment',
    value: boolean
  ) => {
    if (!settings) return

    setSaving(true)
    try {
      const updated = await updateSettings({ [key]: value })
      setSettings(updated)
    } catch (error) {
      console.error('Failed to update notification setting:', error)
      setMessage({ type: 'error', text: '設定の更新に失敗しました' })
    } finally {
      setSaving(false)
    }
  }

  const handleDisplayNameSave = () => {
    localStorage.setItem('notedock_display_name', displayName)
    setMessage({ type: 'success', text: '表示名を保存しました' })
  }

  const handleModelChange = async (modelId: string) => {
    if (!settings) return

    setSaving(true)
    try {
      const updated = await updateSettings({ ai_model: modelId })
      setSettings(updated)
      const selectedModel = models.find((m) => m.id === modelId)
      setMessage({
        type: 'success',
        text: `AIモデルを「${selectedModel?.name || modelId}」に変更しました`,
      })
    } catch (error) {
      console.error('Failed to update AI model:', error)
      setMessage({ type: 'error', text: 'AIモデルの変更に失敗しました' })
    } finally {
      setSaving(false)
    }
  }

  // Group models by speed
  const groupedModels = {
    fast: models.filter((m) => m.speed === 'fast'),
    medium: models.filter((m) => m.speed === 'medium'),
    slow: models.filter((m) => m.speed === 'slow'),
  }

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>設定</h1>
      </div>

      {message && <div className={`settings-message ${message.type}`}>{message.text}</div>}

      <div className="settings-content">
        <section className="settings-section">
          <h2>
            <User size={20} />
            ユーザー設定
          </h2>
          <div className="settings-item">
            <div className="settings-item-info">
              <label htmlFor="displayName">表示名</label>
              <p className="settings-item-description">
                ノートの作成・更新やコメント投稿時に表示される名前です。
                表示名を設定しないと、ノートの編集やコメント投稿ができません。
              </p>
            </div>
            <div className="settings-item-control">
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="表示名を入力"
                className="settings-input"
              />
              <button onClick={handleDisplayNameSave} className="settings-save-button">
                <Save size={16} />
                保存
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>
            <Bell size={20} />
            通知設定
          </h2>
          <div className="settings-item">
            <div className="settings-item-info">
              <label>Discord通知</label>
              <p className="settings-item-description">
                ノートの作成・更新、コメント投稿時にDiscordへ通知を送信します。 環境変数でWebhook
                URLが設定されている必要があります。
              </p>
            </div>
            <div className="settings-item-control">
              <button
                onClick={handleDiscordToggle}
                disabled={saving}
                className={`settings-toggle ${settings?.discord_notification_enabled ? 'active' : ''}`}
              >
                {settings?.discord_notification_enabled ? (
                  <>
                    <Bell size={16} />
                    有効
                  </>
                ) : (
                  <>
                    <BellOff size={16} />
                    無効
                  </>
                )}
              </button>
            </div>
          </div>
          {settings?.discord_notification_enabled && (
            <div className="settings-item settings-sub-item">
              <div className="settings-item-info">
                <label>通知タイミング</label>
                <p className="settings-item-description">
                  どのタイミングでDiscord通知を送信するか選択します。
                </p>
              </div>
              <div className="settings-checkbox-group">
                <label className="settings-checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.discord_notify_on_create}
                    onChange={(e) =>
                      handleNotifyOptionChange('discord_notify_on_create', e.target.checked)
                    }
                    disabled={saving}
                  />
                  ノート作成時
                </label>
                <label className="settings-checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.discord_notify_on_update}
                    onChange={(e) =>
                      handleNotifyOptionChange('discord_notify_on_update', e.target.checked)
                    }
                    disabled={saving}
                  />
                  ノート更新時
                </label>
                <label className="settings-checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.discord_notify_on_comment}
                    onChange={(e) =>
                      handleNotifyOptionChange('discord_notify_on_comment', e.target.checked)
                    }
                    disabled={saving}
                  />
                  コメント投稿時
                </label>
              </div>
            </div>
          )}
        </section>

        <section className="settings-section">
          <h2>
            <Bot size={20} />
            AI設定
          </h2>
          <div className="settings-item">
            <div className="settings-item-info">
              <label htmlFor="aiModel">使用モデル</label>
              <p className="settings-item-description">
                AI機能（要約、質問応答など）で使用するモデルを選択します。
                <br />
                <span className="speed-legend">
                  <span className="speed-label">
                    <Zap size={12} className="speed-icon fast" /> 高速
                  </span>
                  <span className="speed-label">
                    <Clock size={12} className="speed-icon medium" /> 標準
                  </span>
                  <span className="speed-label">
                    <Turtle size={12} className="speed-icon slow" /> 低速
                  </span>
                </span>
              </p>
            </div>
            <div className="settings-item-control">
              <select
                id="aiModel"
                value={settings?.ai_model || ''}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={saving || models.length === 0}
                className="settings-select"
              >
                {groupedModels.fast.length > 0 && (
                  <optgroup label="⚡ 高速">
                    {groupedModels.fast.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </option>
                    ))}
                  </optgroup>
                )}
                {groupedModels.medium.length > 0 && (
                  <optgroup label="🔶 標準">
                    {groupedModels.medium.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </option>
                    ))}
                  </optgroup>
                )}
                {groupedModels.slow.length > 0 && (
                  <optgroup label="🐢 低速">
                    {groupedModels.slow.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
