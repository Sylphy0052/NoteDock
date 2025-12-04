import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Moon,
  Sun,
  Settings,
  Command,
} from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import QuickOpenModal from "../common/QuickOpenModal";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false);
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("notedock_display_name") || ""
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleDisplayNameSave = () => {
    localStorage.setItem("notedock_display_name", displayName);
    setIsSettingsOpen(false);
  };

  // Keyboard shortcut for quick open (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsQuickOpenOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="header">
        <div className="header-left">
          <Link to="/" className="header-logo">
            <span className="logo-icon">📝</span>
            <span className="logo-text">NoteDock</span>
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
            onClick={toggleTheme}
            title={theme === "light" ? "ダークモードに切替" : "ライトモードに切替"}
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            className="icon-button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="設定"
          >
            <Settings size={20} />
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

      <QuickOpenModal
        isOpen={isQuickOpenOpen}
        onClose={() => setIsQuickOpenOpen(false)}
      />
    </>
  );
}
