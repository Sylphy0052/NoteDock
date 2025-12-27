import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Moon, Sun, Settings, Command, Ship, Keyboard } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import QuickOpenModal from '../common/QuickOpenModal'
import KeyboardShortcutsModal from '../common/KeyboardShortcutsModal'

interface HeaderProps {
  onSearch?: (query: string) => void
}

export default function Header({ onSearch }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false)
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('notedock_display_name') || ''
  )
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch?.(searchQuery)
  }

  const handleDisplayNameSave = () => {
    localStorage.setItem('notedock_display_name', displayName)
    setIsSettingsOpen(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Ctrl+K: Quick open
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsQuickOpenOpen(true)
      }

      // ?: Keyboard shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setIsShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <header className="header">
        <div className="header-left">
          <Link to="/" className="header-logo">
            <div className="logo-icon-wrapper">
              <Ship size={20} className="logo-icon" />
            </div>
            <span className="logo-text">
              Note<span className="logo-text-accent">Dock</span>
            </span>
          </Link>
        </div>

        <div className="header-center">
          <form onSubmit={handleSearch} className="search-form">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </form>
          <button
            className="quick-open-button"
            onClick={() => setIsQuickOpenOpen(true)}
            title="クイックオープン (Ctrl+K)"
          >
            <Command size={16} />
            <span>クイックオープン</span>
            <kbd>⌘K</kbd>
          </button>
        </div>

        <div className="header-right">
          <button
            className="icon-button"
            onClick={() => setIsShortcutsOpen(true)}
            title="キーボードショートカット (?)"
          >
            <Keyboard size={20} strokeWidth={2.5} />
          </button>
          <button
            className="icon-button"
            onClick={toggleTheme}
            title={theme === 'light' ? 'ダークモードに切替' : 'ライトモードに切替'}
          >
            {theme === 'light' ? (
              <Moon size={20} strokeWidth={2.5} fill="currentColor" />
            ) : (
              <Sun size={20} strokeWidth={2.5} fill="currentColor" />
            )}
          </button>
          <button
            className="icon-button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="設定"
          >
            <Settings size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Settings dropdown */}
        {isSettingsOpen && (
          <div className="settings-dropdown">
            <div className="settings-section">
              <label className="settings-label">表示名</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="表示名を入力"
                className="settings-input"
              />
              <button className="settings-save" onClick={handleDisplayNameSave}>
                保存
              </button>
            </div>
          </div>
        )}
      </header>

      <QuickOpenModal isOpen={isQuickOpenOpen} onClose={() => setIsQuickOpenOpen(false)} />

      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </>
  )
}
