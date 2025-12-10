# NoteDock UIデザイン改善 実装計画書

## 1. 概要

### 1.1 目的

NoteDockのユーザー体験（UX）とビジュアルデザイン（UI）を改善し、ITエンジニアチームがより効率的にナレッジを蓄積・活用できるようにする。

### 1.2 現状分析

| 項目 | 現状 |
|------|------|
| UIフレームワーク | React 18 + TypeScript |
| スタイリング | グローバルCSS + CSS Variables |
| テーマ | ライト/ダーク対応済み |
| アイコン | lucide-react |
| コンポーネント数 | 37コンポーネント |

### 1.3 改善方針

1. **漸進的改善**: 既存のCSS Variables基盤を活かし、段階的に改善
2. **破壊的変更の回避**: 機能を維持しながらUXを向上
3. **パフォーマンス維持**: バンドルサイズの大幅増加を避ける

---

## 2. 改善項目一覧

### Phase 1: 基盤改善（即効性・低リスク）

| ID | 項目 | 優先度 | 工数目安 |
|----|------|--------|----------|
| 1.1 | マイクロインタラクション追加 | 高 | 小 |
| 1.2 | カラーパレット調整 | 高 | 小 |
| 1.3 | スケルトンローディング | 高 | 中 |

### Phase 2: コンポーネント改善（UX向上）

| ID | 項目 | 優先度 | 工数目安 |
|----|------|--------|----------|
| 2.1 | サイドバー折りたたみ機能 | 高 | 中 |
| 2.2 | ノートカードのビジュアル強化 | 中 | 中 |
| 2.3 | 空状態（Empty State）デザイン | 中 | 小 |

### Phase 3: エディタ体験向上

| ID | 項目 | 優先度 | 工数目安 |
|----|------|--------|----------|
| 3.1 | フォーカスモード | 中 | 中 |
| 3.2 | Markdownツールバー改善 | 中 | 中 |
| 3.3 | 文字数・読了時間表示 | 低 | 小 |

### Phase 4: 品質・アクセシビリティ

| ID | 項目 | 優先度 | 工数目安 |
|----|------|--------|----------|
| 4.1 | モーダル統一感 | 中 | 小 |
| 4.2 | レスポンシブ改善 | 低 | 大 |
| 4.3 | アクセシビリティ強化 | 低 | 中 |
| 4.4 | キーボードショートカットヘルプ | 低 | 小 |

### Phase 5: デザイン性向上（ビジュアル強化）

| ID | 項目 | 優先度 | 工数目安 |
|----|------|--------|----------|
| 5.1 | グラデーション背景・奥行き感 | 高 | 小 |
| 5.2 | カード・コンテナのシャドウ改善 | 高 | 小 |
| 5.3 | ヘッダーのブランディング強化 | 中 | 小 |
| 5.4 | サイドバーのビジュアル改善 | 中 | 小 |
| 5.5 | タイポグラフィの洗練 | 中 | 小 |
| 5.6 | ダークテーマの深み追加 | 高 | 小 |
| 5.7 | グラデーションボタン | 中 | 小 |
| 5.8 | アクセントカラーの戦略的活用 | 中 | 小 |

---

## 3. 詳細設計

### 3.1 マイクロインタラクション追加

#### 目的
操作フィードバックを改善し、UIの応答性を向上させる。

#### 対象コンポーネント
- `Button.tsx`
- `NoteCard.tsx`
- `Sidebar.tsx` (ナビゲーション項目)
- `Modal.tsx`

#### 実装内容

**globals.css に追加するトランジション定義:**

```css
/* === トランジション変数 === */
:root {
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}

/* === ボタンのインタラクション === */
.btn {
  transition:
    background-color var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

/* === カードのインタラクション === */
.note-card {
  transition:
    transform var(--transition-normal),
    box-shadow var(--transition-normal);
}

.note-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

[data-theme='dark'] .note-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

/* === サイドバーナビゲーション === */
.nav-item {
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

/* === モーダルアニメーション === */
.modal-overlay {
  animation: fadeIn var(--transition-normal) ease;
}

.modal-content {
  animation: slideUp var(--transition-normal) ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### テスト観点
- [ ] ホバー時のトランジションが滑らかか
- [ ] アニメーションがパフォーマンスに影響しないか（60fps維持）
- [ ] reduced-motion設定時にアニメーションが無効化されるか

---

### 3.2 カラーパレット調整

#### 目的
ノートアプリとして落ち着いた色調に統一し、長時間の利用でも目が疲れにくいデザインにする。

#### 変更内容

**現行 → 改善後:**

```css
:root {
  /* プライマリカラー */
  --color-primary: #2563eb;        /* → #4f46e5 (インディゴ) */
  --color-primary-hover: #1d4ed8;  /* → #4338ca */
  --color-primary-light: #dbeafe; /* → #e0e7ff */

  /* アクセントカラー（新規追加） */
  --color-accent: #8b5cf6;
  --color-accent-light: #ede9fe;

  /* 成功・警告・エラー */
  --color-success: #16a34a;        /* → #10b981 (エメラルド) */
  --color-warning: #ca8a04;        /* → #f59e0b (アンバー) */
  --color-error: #dc2626;          /* 変更なし */

  /* 背景色（第3背景追加） */
  --color-bg-tertiary: #fafafa;
}

[data-theme='dark'] {
  /* より深みのあるダークテーマ */
  --color-bg: #0f172a;             /* より深い青みがかった黒 */
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;

  --color-primary: #818cf8;        /* 明るいインディゴ */
  --color-primary-hover: #a5b4fc;

  --color-text: #f1f5f9;
  --color-text-secondary: #94a3b8;
}
```

#### 移行方針
- CSS Variablesの値を変更するだけで全体に反映
- 個別にカラーコードをハードコードしている箇所は修正が必要

#### テスト観点
- [ ] コントラスト比がWCAG AA基準（4.5:1）を満たすか
- [ ] ライト/ダーク両テーマで視認性が確保されているか

---

### 3.3 スケルトンローディング

#### 目的
ローディング中のUXを改善し、体感速度を向上させる。

#### 新規作成ファイル

**frontend/src/components/common/Skeleton.tsx:**

```tsx
import clsx from "clsx";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className,
}: SkeletonProps) {
  return (
    <div
      className={clsx("skeleton", `skeleton-${variant}`, className)}
      style={{ width, height }}
    />
  );
}

// ノートカード用スケルトン
export function NoteCardSkeleton() {
  return (
    <div className="note-card-skeleton">
      <Skeleton variant="rectangular" height={120} />
      <div className="note-card-skeleton-content">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
        <div className="note-card-skeleton-tags">
          <Skeleton variant="text" width={60} />
          <Skeleton variant="text" width={40} />
        </div>
      </div>
    </div>
  );
}
```

**CSS追加:**

```css
/* === スケルトンローディング === */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-secondary) 25%,
    var(--color-bg-tertiary) 50%,
    var(--color-bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 0.25rem;
}

.skeleton-text {
  height: 1rem;
  margin-bottom: 0.5rem;
}

.skeleton-circular {
  border-radius: 50%;
}

.skeleton-card {
  border-radius: 0.5rem;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* reduced-motion対応 */
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background: var(--color-bg-secondary);
  }
}
```

#### 適用箇所
- `NotesListPage.tsx`: ノート一覧のローディング
- `NoteDetailPage.tsx`: ノート詳細のローディング
- `HomePage.tsx`: ホーム画面のセクションローディング

---

### 3.4 サイドバー折りたたみ機能

#### 目的
画面の作業領域を最大化し、集中して作業できる環境を提供する。

#### 実装方針

1. **状態管理**: `localStorage` に折りたたみ状態を保存
2. **アニメーション**: CSS transitionでスムーズに切り替え
3. **表示モード**:
   - 展開時: アイコン + テキスト（現行）
   - 折りたたみ時: アイコンのみ + ツールチップ

#### コンポーネント変更

**frontend/src/hooks/useSidebarCollapse.ts（新規）:**

```tsx
import { useState, useEffect } from "react";

const STORAGE_KEY = "notedock-sidebar-collapsed";

export function useSidebarCollapse() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const toggle = () => setIsCollapsed((prev) => !prev);

  return { isCollapsed, toggle };
}
```

**Sidebar.tsx 変更点:**

```tsx
// Props追加
interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

// JSX変更
<aside className={clsx("sidebar", isCollapsed && "sidebar-collapsed")}>
  <button className="sidebar-toggle" onClick={onToggle}>
    {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
  </button>

  <nav className="nav-section">
    {navItems.map((item) => (
      <NavLink key={item.path} to={item.path} className="nav-item">
        <item.icon size={20} />
        {!isCollapsed && <span>{item.label}</span>}
        {isCollapsed && (
          <span className="nav-item-tooltip">{item.label}</span>
        )}
      </NavLink>
    ))}
  </nav>
</aside>
```

**CSS追加:**

```css
.sidebar {
  width: 220px;
  transition: width var(--transition-normal);
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-collapsed .nav-item {
  justify-content: center;
  padding: 0.75rem;
}

.nav-item-tooltip {
  position: absolute;
  left: 100%;
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--transition-fast);
}

.sidebar-collapsed .nav-item:hover .nav-item-tooltip {
  opacity: 1;
  visibility: visible;
}
```

#### キーボードショートカット
- `Ctrl + \` または `Cmd + \`: サイドバー折りたたみ切り替え

---

### 3.5 ノートカードのビジュアル強化

#### 目的
ノート一覧の情報密度を向上させ、目的のノートを素早く見つけられるようにする。

#### 変更内容

**現行:**
```
┌─────────────┐
│ タイトル      │
│ 更新日       │
│ タグ タグ    │
└─────────────┘
```

**改善後:**
```
┌─────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← カバー画像/グラデーション
│ タイトル            📌│  ← ピンアイコン右上
│ プレビューテキスト...  │  ← 本文プレビュー（2行）
│ 🏷️ tag1  🏷️ tag2     │
│ 📅 2時間前   💬 3     │  ← 相対時間 + コメント数
└─────────────────────┘
```

#### NoteCard.tsx 変更

```tsx
interface NoteCardProps {
  note: Note;
  showPreview?: boolean; // 新規追加
}

export function NoteCard({ note, showPreview = true }: NoteCardProps) {
  return (
    <article className="note-card">
      {/* カバー画像エリア */}
      <div className="note-card-cover">
        {note.cover_image_url ? (
          <img src={note.cover_image_url} alt="" />
        ) : (
          <div className="note-card-cover-gradient" />
        )}
        {note.is_pinned && (
          <span className="note-card-pin-badge">
            <Pin size={14} />
          </span>
        )}
      </div>

      {/* コンテンツエリア */}
      <div className="note-card-content">
        <h3 className="note-card-title">{note.title}</h3>

        {showPreview && note.content && (
          <p className="note-card-preview">
            {extractPreview(note.content, 80)}
          </p>
        )}

        {/* タグ */}
        {note.tags?.length > 0 && (
          <div className="note-card-tags">
            {note.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="note-card-tag">
                {tag.name}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="note-card-tag-more">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* メタ情報 */}
        <div className="note-card-meta">
          <span className="note-card-date">
            <Calendar size={12} />
            {formatRelativeTime(note.updated_at)}
          </span>
          {note.comment_count > 0 && (
            <span className="note-card-comments">
              <MessageSquare size={12} />
              {note.comment_count}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ヘルパー関数
function extractPreview(markdown: string, maxLength: number): string {
  // Markdownの記法を除去してプレーンテキストを抽出
  const plain = markdown
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .trim();

  return plain.length > maxLength
    ? plain.slice(0, maxLength) + "..."
    : plain;
}
```

---

### 3.6 空状態（Empty State）デザイン

#### 目的
データがない状態でも親しみやすく、次のアクションを促すデザインにする。

#### 新規コンポーネント

**frontend/src/components/common/EmptyState.tsx:**

```tsx
import { ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

**使用例:**

```tsx
// NotesListPage.tsx
{notes.length === 0 && (
  <EmptyState
    icon={<FileText size={48} />}
    title="まだノートがありません"
    description="最初のノートを作成して、アイデアを記録しましょう"
    action={{
      label: "新規ノート作成",
      onClick: () => navigate("/notes/new"),
    }}
  />
)}

// TrashPage.tsx
{trashedNotes.length === 0 && (
  <EmptyState
    icon={<Trash2 size={48} />}
    title="ゴミ箱は空です"
    description="削除されたノートはここに表示されます"
  />
)}
```

**CSS:**

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-state-icon {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.empty-state-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.empty-state-description {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
  max-width: 300px;
}
```

---

### 3.7 フォーカスモード

#### 目的
編集時に気が散る要素を排除し、執筆に集中できる環境を提供する。

#### 実装方針

1. `Ctrl + Shift + F` でフォーカスモード切り替え
2. フォーカスモード時:
   - ヘッダー・サイドバーを非表示
   - エディタを画面中央に最大化
   - 背景を暗くして周囲をフェード
3. `Esc` で通常モードに戻る

#### 状態管理

**frontend/src/hooks/useFocusMode.ts:**

```tsx
import { useState, useEffect, useCallback } from "react";

export function useFocusMode() {
  const [isFocusMode, setIsFocusMode] = useState(false);

  const toggle = useCallback(() => {
    setIsFocusMode((prev) => !prev);
  }, []);

  const exit = useCallback(() => {
    setIsFocusMode(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+F でトグル
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        toggle();
      }
      // Esc で終了
      if (e.key === "Escape" && isFocusMode) {
        exit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode, toggle, exit]);

  // body にクラスを付与
  useEffect(() => {
    document.body.classList.toggle("focus-mode", isFocusMode);
  }, [isFocusMode]);

  return { isFocusMode, toggle, exit };
}
```

**CSS:**

```css
/* フォーカスモード時のスタイル */
body.focus-mode .header,
body.focus-mode .sidebar {
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-normal);
}

body.focus-mode .main-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

body.focus-mode .note-editor {
  min-height: calc(100vh - 4rem);
}

/* フォーカスモード終了ボタン */
.focus-mode-exit {
  position: fixed;
  top: 1rem;
  right: 1rem;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

body.focus-mode:hover .focus-mode-exit {
  opacity: 1;
}
```

---

### 3.8 モーダル統一感

#### 目的
すべてのモーダルで一貫したデザインを適用し、プロフェッショナルな印象を与える。

#### 変更内容

**オーバーレイのグラスモーフィズム化:**

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

[data-theme='dark'] .modal-overlay {
  background: rgba(0, 0, 0, 0.6);
}

.modal-content {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* モーダルヘッダー */
.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
}

/* モーダルボディ */
.modal-body {
  padding: 1.5rem;
}

/* モーダルフッター */
.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
```

---

### 3.9 キーボードショートカットヘルプ

#### 目的
利用可能なキーボードショートカットを一覧表示し、パワーユーザーの生産性を向上させる。

#### 実装

**frontend/src/components/common/KeyboardShortcutsModal.tsx:**

```tsx
import { Modal } from "./Modal";

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "グローバル",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "クイックオープン" },
      { keys: ["Ctrl", "\\"], description: "サイドバー切り替え" },
      { keys: ["?"], description: "ショートカット一覧" },
    ],
  },
  {
    title: "エディタ",
    shortcuts: [
      { keys: ["Ctrl", "S"], description: "保存" },
      { keys: ["Ctrl", "B"], description: "太字" },
      { keys: ["Ctrl", "I"], description: "斜体" },
      { keys: ["Ctrl", "Shift", "F"], description: "フォーカスモード" },
    ],
  },
  {
    title: "ナビゲーション",
    shortcuts: [
      { keys: ["G", "H"], description: "ホームへ移動" },
      { keys: ["G", "N"], description: "ノート一覧へ移動" },
      { keys: ["G", "T"], description: "タグ一覧へ移動" },
    ],
  },
];

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="キーボードショートカット">
      <div className="shortcuts-modal-content">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title} className="shortcuts-group">
            <h4 className="shortcuts-group-title">{group.title}</h4>
            <dl className="shortcuts-list">
              {group.shortcuts.map((shortcut, i) => (
                <div key={i} className="shortcut-item">
                  <dt className="shortcut-keys">
                    {shortcut.keys.map((key, j) => (
                      <kbd key={j} className="shortcut-key">
                        {key}
                      </kbd>
                    ))}
                  </dt>
                  <dd className="shortcut-description">
                    {shortcut.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Modal>
  );
}
```

**CSS:**

```css
.shortcuts-group {
  margin-bottom: 1.5rem;
}

.shortcuts-group-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.shortcut-keys {
  display: flex;
  gap: 0.25rem;
}

.shortcut-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-family: inherit;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.shortcut-description {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
```

---

### 3.10 グラデーション背景・奥行き感

#### 目的
単色のフラットな背景から、微細なグラデーションを加えることで奥行きと洗練された印象を与える。

#### 実装内容

**globals.css に追加:**

```css
/* === 背景グラデーション === */
:root {
  /* 微細なグラデーション背景 */
  --gradient-subtle: linear-gradient(
    180deg,
    var(--color-bg) 0%,
    var(--color-bg-secondary) 100%
  );

  /* アクセントグラデーション */
  --gradient-accent: linear-gradient(
    135deg,
    var(--color-primary) 0%,
    var(--color-accent) 100%
  );

  /* カード用の微細なグラデーション */
  --gradient-card: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 0.4) 100%
  );
}

[data-theme='dark'] {
  --gradient-subtle: linear-gradient(
    180deg,
    var(--color-bg) 0%,
    #0a1120 100%
  );

  --gradient-card: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

/* メインコンテンツエリアに適用 */
.main-content {
  background: var(--gradient-subtle);
  min-height: calc(100vh - 56px);
}

/* ホームページのヒーローセクション */
.home-header {
  background: var(--gradient-accent);
  color: white;
  padding: 2rem;
  border-radius: 1rem;
  margin-bottom: 2rem;
}
```

#### 適用箇所
- `.main-content`: メインコンテンツエリア
- `.home-header`: ホームページのヘッダーセクション
- `.note-card-cover`: カバー画像がない場合のフォールバック

---

### 3.11 カード・コンテナのシャドウ改善

#### 目的
フラットなボーダーのみのデザインから、洗練されたシャドウで浮遊感と階層感を表現する。

#### 実装内容

**シャドウ変数の定義:**

```css
:root {
  /* 多層シャドウ（より自然な影） */
  --shadow-sm:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 1px 3px rgba(0, 0, 0, 0.06);

  --shadow-md:
    0 2px 4px rgba(0, 0, 0, 0.04),
    0 4px 8px rgba(0, 0, 0, 0.06),
    0 8px 16px rgba(0, 0, 0, 0.04);

  --shadow-lg:
    0 4px 8px rgba(0, 0, 0, 0.04),
    0 8px 16px rgba(0, 0, 0, 0.06),
    0 16px 32px rgba(0, 0, 0, 0.08);

  --shadow-xl:
    0 8px 16px rgba(0, 0, 0, 0.06),
    0 16px 32px rgba(0, 0, 0, 0.08),
    0 32px 64px rgba(0, 0, 0, 0.1);

  /* カード専用シャドウ */
  --shadow-card:
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 4px 12px rgba(0, 0, 0, 0.04);

  --shadow-card-hover:
    0 4px 12px rgba(0, 0, 0, 0.1),
    0 12px 24px rgba(0, 0, 0, 0.08);
}

[data-theme='dark'] {
  --shadow-sm:
    0 1px 2px rgba(0, 0, 0, 0.2),
    0 1px 3px rgba(0, 0, 0, 0.3);

  --shadow-md:
    0 2px 4px rgba(0, 0, 0, 0.2),
    0 4px 8px rgba(0, 0, 0, 0.3),
    0 8px 16px rgba(0, 0, 0, 0.2);

  --shadow-lg:
    0 4px 8px rgba(0, 0, 0, 0.2),
    0 8px 16px rgba(0, 0, 0, 0.3),
    0 16px 32px rgba(0, 0, 0, 0.4);

  --shadow-card:
    0 1px 3px rgba(0, 0, 0, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.2);

  --shadow-card-hover:
    0 4px 12px rgba(0, 0, 0, 0.4),
    0 12px 24px rgba(0, 0, 0, 0.3);

  /* ダークモード用のグロー効果 */
  --glow-primary: 0 0 20px rgba(129, 140, 248, 0.3);
}

/* カードに適用 */
.note-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-card);
  transition:
    transform var(--transition-normal),
    box-shadow var(--transition-normal);
}

.note-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}

[data-theme='dark'] .note-card:hover {
  box-shadow: var(--shadow-card-hover), var(--glow-primary);
}
```

---

### 3.12 ヘッダーのブランディング強化

#### 目的
ロゴとヘッダーのデザインを強化し、アプリのアイデンティティを確立する。

#### 実装内容

**Header.tsx の変更:**

```tsx
// ロゴコンポーネント
function Logo() {
  return (
    <Link to="/" className="header-logo">
      <div className="logo-icon-wrapper">
        <Ship size={24} className="logo-icon" />
      </div>
      <span className="logo-text">
        Note<span className="logo-text-accent">Dock</span>
      </span>
    </Link>
  );
}
```

**CSS:**

```css
.header {
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
}

.logo-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--gradient-accent);
  border-radius: 0.5rem;
  color: white;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.02em;
}

.logo-text-accent {
  color: var(--color-primary);
}

/* ヘッダー下部のアクセントライン */
.header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--gradient-accent);
  opacity: 0.5;
}
```

---

### 3.13 サイドバーのビジュアル改善

#### 目的
ナビゲーションの視認性を向上させ、アクティブ状態を明確に表示する。

#### 実装内容

```css
/* サイドバー全体 */
.sidebar {
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
}

/* 新規ノートボタン - グラデーション */
.new-note-button {
  background: var(--gradient-accent);
  border: none;
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.new-note-button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* ナビゲーションアイテム */
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  color: var(--color-text-secondary);
  border-radius: 0.5rem;
  text-decoration: none;
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.nav-item:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

/* アクティブ状態 - 左インジケーター */
.nav-item.active {
  background: var(--color-bg);
  color: var(--color-primary);
  font-weight: 500;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--gradient-accent);
  border-radius: 0 2px 2px 0;
}

/* バッジ（カウント表示） */
.nav-item-badge {
  margin-left: auto;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border-radius: 1rem;
}

.nav-item.active .nav-item-badge {
  background: var(--color-primary);
  color: white;
}
```

---

### 3.14 タイポグラフィの洗練

#### 目的
文字の読みやすさと階層感を向上させ、プロフェッショナルな印象を与える。

#### 実装内容

```css
/* フォント設定 */
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Andale Mono', monospace;

  /* フォントサイズスケール */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */

  /* 行の高さ */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 見出しスタイル */
h1, h2, h3, h4, h5, h6 {
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: var(--leading-tight);
  color: var(--color-text);
}

h1 { font-size: var(--text-3xl); }
h2 { font-size: var(--text-2xl); }
h3 { font-size: var(--text-xl); }
h4 { font-size: var(--text-lg); }

/* ノートカードのタイトル */
.note-card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  line-height: var(--leading-tight);
  letter-spacing: -0.01em;

  /* 2行で切り詰め */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 本文プレビュー */
.note-card-preview {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);

  /* 2行で切り詰め */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* コードブロック */
code, pre {
  font-family: var(--font-mono);
  font-size: 0.9em;
}
```

---

### 3.15 ダークテーマの深み追加

#### 目的
より洗練された、目に優しいダークテーマを実現する。

#### 実装内容

```css
[data-theme='dark'] {
  /* 青みがかった深いダーク（Slate系） */
  --color-bg: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;

  /* テキストカラー */
  --color-text: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;

  /* ボーダー */
  --color-border: #334155;
  --color-border-subtle: #1e293b;

  /* プライマリカラー（明るめのインディゴ） */
  --color-primary: #818cf8;
  --color-primary-hover: #a5b4fc;
  --color-primary-light: rgba(129, 140, 248, 0.1);

  /* アクセント */
  --color-accent: #a78bfa;
  --color-accent-light: rgba(167, 139, 250, 0.1);

  /* 成功・警告・エラー（ダークモード用に調整） */
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-error: #f87171;

  /* グロー効果 */
  --glow-primary: 0 0 20px rgba(129, 140, 248, 0.25);
  --glow-accent: 0 0 20px rgba(167, 139, 250, 0.25);

  /* グラデーション */
  --gradient-subtle: linear-gradient(
    180deg,
    #0f172a 0%,
    #020617 100%
  );

  --gradient-accent: linear-gradient(
    135deg,
    #6366f1 0%,
    #8b5cf6 50%,
    #a855f7 100%
  );
}

/* ダークモード固有のスタイル */
[data-theme='dark'] .note-card {
  background: linear-gradient(
    180deg,
    var(--color-bg-secondary) 0%,
    rgba(30, 41, 59, 0.8) 100%
  );
  border-color: var(--color-border-subtle);
}

[data-theme='dark'] .note-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card-hover), var(--glow-primary);
}

/* ダークモードのヘッダー */
[data-theme='dark'] .header {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* ダークモードのサイドバー */
[data-theme='dark'] .sidebar {
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(8px);
}
```

---

### 3.16 グラデーションボタン

#### 目的
重要なアクションボタンを視覚的に強調し、クリックを促す。

#### 実装内容

```css
/* プライマリボタン - グラデーション */
.btn-primary {
  background: var(--gradient-accent);
  border: none;
  color: white;
  font-weight: 500;
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  filter: brightness(1.05);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  filter: brightness(0.95);
}

/* フォーカス状態 */
.btn-primary:focus-visible {
  outline: none;
  box-shadow:
    var(--shadow-md),
    0 0 0 3px var(--color-primary-light);
}

/* ゴーストボタンのホバー時グラデーション */
.btn-ghost:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

/* アイコンボタンのホバー */
.icon-button:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
```

---

### 3.17 アクセントカラーの戦略的活用

#### 目的
アクセントカラーを効果的に使用し、重要な情報やステータスを視覚的に強調する。

#### 実装内容

```css
/* ピン留めノートの強調 */
.note-card.is-pinned {
  border-left: 3px solid var(--color-primary);
}

.note-card.is-pinned .note-card-pin-badge {
  background: var(--gradient-accent);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

/* 閲覧専用ノートの表示 */
.note-card.is-readonly {
  border-left: 3px solid var(--color-warning);
}

.badge-readonly {
  background: rgba(251, 191, 36, 0.1);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}

/* タグのカラーバリエーション */
.tag {
  padding: 0.25rem 0.5rem;
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: 1rem;
  background: var(--color-primary-light);
  color: var(--color-primary);
  transition:
    background var(--transition-fast),
    transform var(--transition-fast);
}

.tag:hover {
  background: var(--color-primary);
  color: white;
  transform: scale(1.05);
}

/* アクティブなフィルター */
.filter-active {
  background: var(--gradient-accent);
  color: white;
}

/* 成功メッセージのアクセント */
.toast-success {
  border-left: 4px solid var(--color-success);
  background: rgba(16, 185, 129, 0.1);
}

.toast-error {
  border-left: 4px solid var(--color-error);
  background: rgba(248, 113, 113, 0.1);
}

/* リンクのホバーアニメーション */
a:hover {
  color: var(--color-accent);
  text-decoration: none;
}

/* 内部リンク（#ID）のスタイル */
.internal-link {
  color: var(--color-primary);
  font-weight: 500;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  background: var(--color-primary-light);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.internal-link:hover {
  background: var(--color-primary);
  color: white;
}
```

---

## 4. 実装スケジュール

### Phase 1: 基盤改善

```
実装順序:
1. カラーパレット調整 (globals.css)
2. トランジション変数追加 (globals.css)
3. マイクロインタラクション適用
4. Skeletonコンポーネント作成
5. 各ページにスケルトンローディング適用
```

### Phase 2: コンポーネント改善

```
実装順序:
1. useSidebarCollapse フック作成
2. Sidebar折りたたみ機能実装
3. EmptyStateコンポーネント作成
4. NoteCardビジュアル強化
5. 各ページにEmptyState適用
```

### Phase 3: エディタ体験向上

```
実装順序:
1. useFocusMode フック作成
2. NoteEditPageにフォーカスモード適用
3. 文字数カウンター追加
4. Markdownツールバー改善
```

### Phase 4: 品質・アクセシビリティ

```
実装順序:
1. モーダルスタイル統一
2. KeyboardShortcutsModal作成
3. フォーカスリング改善
4. レスポンシブ対応（必要に応じて）
```

### Phase 5: デザイン性向上

```
実装順序:
1. CSS Variables追加（シャドウ、グラデーション、フォント）
2. ダークテーマの深み追加
3. カード・コンテナのシャドウ改善
4. グラデーション背景適用
5. ヘッダーのブランディング強化
6. サイドバーのビジュアル改善
7. タイポグラフィの洗練
8. グラデーションボタン適用
9. アクセントカラーの戦略的活用
```

---

## 5. テスト計画

### 5.1 ビジュアルテスト

- [ ] ライト/ダーク両テーマでの表示確認
- [ ] 各ブレークポイントでのレイアウト確認
- [ ] アニメーションの滑らかさ確認
- [ ] グラデーションの表示確認（各ブラウザ）
- [ ] シャドウの階層感確認
- [ ] タイポグラフィの可読性確認
- [ ] カラーコントラスト比の検証

### 5.2 機能テスト

- [ ] サイドバー折りたたみの状態保存
- [ ] フォーカスモードのキーボード操作
- [ ] モーダルのアクセシビリティ（Escキー、オーバーレイクリック）

### 5.3 パフォーマンステスト

- [ ] バンドルサイズの変化確認
- [ ] Lighthouseスコアの維持
- [ ] アニメーション時の60fps維持

---

## 6. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| カラー変更による既存UIの破綻 | 中 | CSS Variables経由で一括管理、段階的適用 |
| アニメーションによるパフォーマンス低下 | 低 | transform/opacityのみ使用、will-change活用 |
| アクセシビリティの低下 | 中 | reduced-motion対応、コントラスト比チェック |
| 実装工数の肥大化 | 中 | Phase単位で完結、優先度順に実装 |
| backdrop-filterの非対応ブラウザ | 低 | フォールバック背景色を設定、@supports使用 |
| グラデーションの印刷時問題 | 低 | @media print で単色にフォールバック |
| フォント読み込み遅延（Inter等） | 低 | システムフォントをフォールバック、font-display: swap |
| ダークモードでのコントラスト不足 | 中 | WCAG AA基準でのテスト、色覚シミュレーション |

---

## 7. 参考資料

- [Tailwind CSS Color Palette](https://tailwindcss.com/docs/customizing-colors)
- [Material Design 3](https://m3.material.io/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
