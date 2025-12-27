import { NavLink } from 'react-router-dom'
import {
  Home,
  FileText,
  File,
  Tag,
  Trash2,
  Network,
  FolderTree,
  Plus,
  ChevronsLeft,
  Settings,
  PenTool,
  LayoutTemplate,
  Briefcase,
} from 'lucide-react'

interface SidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
}

export default function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const navItems = [
    { to: '/', icon: Home, label: 'ホーム' },
    { to: '/notes', icon: FileText, label: 'ノート' },
    { to: '/projects', icon: Briefcase, label: 'プロジェクト' },
    { to: '/folders', icon: FolderTree, label: 'フォルダ' },
    { to: '/tags', icon: Tag, label: 'タグ' },
    { to: '/files', icon: File, label: 'ファイル' },
    { to: '/templates', icon: LayoutTemplate, label: 'テンプレート' },
    { to: '/trash', icon: Trash2, label: 'ゴミ箱' },
    { to: '/drawings', icon: PenTool, label: '図形描画' },
    { to: '/linkmap', icon: Network, label: 'リンクマップ' },
    { to: '/settings', icon: Settings, label: '設定' },
  ]

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        title={isCollapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
        aria-label={isCollapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
      >
        <ChevronsLeft size={18} />
      </button>
      <nav className="sidebar-nav">
        <NavLink to="/notes/new" className="new-note-button">
          <Plus size={20} />
          <span>新規ノート</span>
        </NavLink>

        <div className="nav-section">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={label}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  )
}
