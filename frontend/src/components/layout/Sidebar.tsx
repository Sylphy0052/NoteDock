import { NavLink } from "react-router-dom";
import {
  Home,
  FileText,
  Tag,
  Trash2,
  Network,
  FolderTree,
  Plus,
} from "lucide-react";

interface SidebarProps {
  isCollapsed?: boolean;
}

export default function Sidebar({ isCollapsed = false }: SidebarProps) {
  const navItems = [
    { to: "/", icon: Home, label: "ホーム" },
    { to: "/notes", icon: FileText, label: "ノート" },
    { to: "/tags", icon: Tag, label: "タグ" },
    { to: "/folders", icon: FolderTree, label: "フォルダ" },
    { to: "/trash", icon: Trash2, label: "ゴミ箱" },
    { to: "/linkmap", icon: Network, label: "リンクマップ" },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <nav className="sidebar-nav">
        <NavLink to="/notes/new" className="new-note-button">
          <Plus size={20} />
          {!isCollapsed && <span>新規ノート</span>}
        </NavLink>

        <div className="nav-section">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              title={label}
            >
              <Icon size={20} />
              {!isCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
}
