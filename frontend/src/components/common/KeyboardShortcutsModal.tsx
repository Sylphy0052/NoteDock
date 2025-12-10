import { Keyboard } from "lucide-react";
import Modal from "./Modal";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "グローバル",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "クイックオープン" },
      { keys: ["Ctrl", "N"], description: "新規ノート作成" },
      { keys: ["?"], description: "ショートカット一覧を表示" },
    ],
  },
  {
    title: "エディタ",
    shortcuts: [
      { keys: ["Ctrl", "S"], description: "保存" },
      { keys: ["Ctrl", "B"], description: "太字" },
      { keys: ["Ctrl", "I"], description: "斜体" },
      { keys: ["Ctrl", "Shift", "S"], description: "取り消し線" },
      { keys: ["Ctrl", "Shift", "K"], description: "コードブロック" },
      { keys: ["Ctrl", "Shift", "L"], description: "リンク挿入" },
      { keys: ["Ctrl", "Shift", "I"], description: "画像挿入" },
    ],
  },
  {
    title: "クイックオープン",
    shortcuts: [
      { keys: ["↑", "↓"], description: "候補を移動" },
      { keys: ["Enter"], description: "選択したノートを開く" },
      { keys: ["Esc"], description: "閉じる" },
    ],
  },
  {
    title: "ノート一覧",
    shortcuts: [
      { keys: ["J"], description: "次のノートへ" },
      { keys: ["K"], description: "前のノートへ" },
      { keys: ["Enter"], description: "ノートを開く" },
    ],
  },
];

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="キーボードショートカット" size="md">
      <div className="shortcuts-content">
        {shortcutGroups.map((group) => (
          <div key={group.title} className="shortcuts-group">
            <h3 className="shortcuts-group-title">
              <Keyboard size={16} />
              {group.title}
            </h3>
            <div className="shortcuts-list">
              {group.shortcuts.map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <div className="shortcut-keys">
                    {shortcut.keys.map((key, keyIndex) => (
                      <span key={keyIndex}>
                        <kbd className="shortcut-key">{key}</kbd>
                        {keyIndex < shortcut.keys.length - 1 && (
                          <span className="shortcut-plus">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <span className="shortcut-description">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
