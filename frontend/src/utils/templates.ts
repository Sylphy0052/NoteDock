// Template types
export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  isSystem: boolean;
  createdAt: string;
}

// Storage key for user templates
const USER_TEMPLATES_KEY = "notedock_user_templates";

// System templates (predefined)
export const SYSTEM_TEMPLATES: Template[] = [
  {
    id: "system-meeting",
    name: "議事録",
    description: "会議の議事録テンプレート",
    content: `# 会議議事録

## 基本情報
- **日時**:
- **場所**:
- **参加者**:

## アジェンダ
1.
2.
3.

## 議論内容

### 議題1

**概要**:

**決定事項**:

**アクションアイテム**:
- [ ] 担当者: 期限:

### 議題2

**概要**:

**決定事項**:

**アクションアイテム**:
- [ ] 担当者: 期限:

## 次回の予定
- **日時**:
- **議題**:

## 備考
`,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "system-design",
    name: "設計書",
    description: "技術設計書テンプレート",
    content: `# 設計書

## 概要
### 目的

### 背景

### スコープ

## 要件
### 機能要件
1.
2.
3.

### 非機能要件
- パフォーマンス:
- セキュリティ:
- 可用性:

## アーキテクチャ
### システム構成図

\`\`\`mermaid
graph TD
    A[Client] --> B[API Gateway]
    B --> C[Service]
    C --> D[Database]
\`\`\`

### データフロー

## データモデル
### エンティティ

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | integer | 主キー |
| name | string | 名前 |
| created_at | datetime | 作成日時 |

## API設計
### エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/resource | リソース一覧取得 |
| POST | /api/resource | リソース作成 |

## 実装計画
### タスク
- [ ] タスク1
- [ ] タスク2
- [ ] タスク3

### スケジュール

## 参考資料
-
`,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "system-research",
    name: "調査メモ",
    description: "技術調査・リサーチ用テンプレート",
    content: `# 調査メモ

## 調査概要
- **調査目的**:
- **調査期間**:
- **調査担当**:

## 調査対象
### 対象1

**公式サイト**:

**概要**:

**特徴**:
-
-

**メリット**:
-

**デメリット**:
-

**コスト**:

### 対象2

**公式サイト**:

**概要**:

**特徴**:
-
-

**メリット**:
-

**デメリット**:
-

**コスト**:

## 比較表

| 項目 | 対象1 | 対象2 |
|------|-------|-------|
| 機能A | ○ | △ |
| 機能B | △ | ○ |
| コスト | 高 | 中 |

## 結論・推奨

## 次のアクション
- [ ]
- [ ]

## 参考リンク
-
-
`,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "system-blank",
    name: "空白",
    description: "空白のノート",
    content: "",
    isSystem: true,
    createdAt: "2024-01-01T00:00:00Z",
  },
];

// Get all templates (system + user)
export function getAllTemplates(): Template[] {
  const userTemplates = getUserTemplates();
  return [...SYSTEM_TEMPLATES, ...userTemplates];
}

// Get user templates from localStorage
export function getUserTemplates(): Template[] {
  try {
    const stored = localStorage.getItem(USER_TEMPLATES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Save user template
export function saveUserTemplate(
  name: string,
  description: string,
  content: string
): Template {
  const templates = getUserTemplates();
  const newTemplate: Template = {
    id: `user-${Date.now()}`,
    name,
    description,
    content,
    isSystem: false,
    createdAt: new Date().toISOString(),
  };
  templates.push(newTemplate);
  localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(templates));
  return newTemplate;
}

// Delete user template
export function deleteUserTemplate(templateId: string): boolean {
  const templates = getUserTemplates();
  const filtered = templates.filter((t) => t.id !== templateId);
  if (filtered.length === templates.length) return false;
  localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(filtered));
  return true;
}

// Get template by ID
export function getTemplateById(templateId: string): Template | null {
  const all = getAllTemplates();
  return all.find((t) => t.id === templateId) || null;
}
