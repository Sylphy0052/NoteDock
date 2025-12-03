# NoteDock 実装タスクリスト

## 概要

本ドキュメントは `spec.md`、`design.md`、`coding_guide.md` に基づいて作成された実装タスクリストです。
推奨実装順序に従って構成されています。

---

## Phase 1: プロジェクト初期設定

### 1.1 リポジトリ・インフラ構成

- [ ] モノレポ構成の作成（frontend/, backend/, infra/）
- [ ] `.gitignore`、`.editorconfig` の設定
- [ ] `.nvmrc`（v20）、`.python-version`（3.11）の配置
- [ ] `docker-compose.yml` の作成
  - frontend（Vite dev / Nginx）
  - backend（FastAPI + Uvicorn）
  - db（PostgreSQL 16）
  - minio（MinIO）
  - minio-console（任意）
- [ ] 環境変数ファイル（`.env.example`）の作成
  - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
  - MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
  - DISCORD_WEBHOOK_URL

---

## Phase 2: Backend 実装

### 2.1 データモデル & マイグレーション

- [ ] Poetry プロジェクト初期化（pyproject.toml）
- [ ] 依存パッケージ追加（fastapi, uvicorn, sqlalchemy, alembic, psycopg, pydantic, python-multipart, minio）
- [ ] ディレクトリ構成作成（app/core, db, models, schemas, repositories, services, api, utils）
- [ ] SQLAlchemy Base 設定（app/db/base.py）
- [ ] データベース接続設定（app/db/session.py）
- [ ] Alembic 初期化 & 設定
- [ ] モデル実装
  - [ ] notes（id, title, content_md, folder_id, is_pinned, is_readonly, cover_file_id, created_at, updated_at, deleted_at）
  - [ ] note_versions（id, note_id, version_no, title, content_md, cover_file_id, created_at）
  - [ ] tags（id, name）
  - [ ] note_tags（note_id, tag_id）
  - [ ] folders（id, name, parent_id）
  - [ ] files（id, original_name, stored_key, mime_type, size_bytes, created_at）
  - [ ] note_files（note_id, file_id）
  - [ ] comments（id, note_id, parent_id, display_name, content, created_at, updated_at）
  - [ ] activity_logs（id, event_type, note_id, file_id, comment_id, display_name, ip_address, user_agent, created_at）
  - [ ] note_links（from_note_id, to_note_id）
- [ ] 初回マイグレーション実行

### 2.2 共通設定・エラーハンドリング

- [ ] 設定管理（app/core/config.py）- 環境変数読み込み
- [ ] ログ設定（app/core/logging.py）- 標準出力、INFO/WARNING/ERROR
- [ ] エラーハンドリング（app/core/errors.py）- 統一エラーフォーマット
- [ ] FastAPI アプリケーション初期化（app/main.py）

### 2.3 Note CRUD API

- [ ] Pydantic スキーマ定義（app/schemas/note.py）
  - NoteCreate, NoteUpdate, NoteResponse, NoteSummary, NoteListResponse
- [ ] リポジトリ実装（app/repositories/note_repo.py）
- [ ] サービス実装（app/services/note_service.py）
- [ ] API エンドポイント（app/api/v1/notes.py）
  - [ ] GET /api/notes - 一覧取得（ページネーション、フィルタ、ソート）
  - [ ] GET /api/notes/{id} - 詳細取得
  - [ ] POST /api/notes - 作成
  - [ ] PUT /api/notes/{id} - 更新
  - [ ] DELETE /api/notes/{id} - ソフトデリート
  - [ ] POST /api/notes/{id}/restore - 復元
  - [ ] POST /api/notes/{id}/duplicate - 複製
  - [ ] PATCH /api/notes/{id}/pin - ピン留めON/OFF
  - [ ] PATCH /api/notes/{id}/readonly - 閲覧専用ON/OFF

### 2.4 フォルダ・タグ API

- [ ] フォルダ CRUD API
  - [ ] GET /api/folders - 一覧取得（ツリー構造）
  - [ ] POST /api/folders - 作成（階層3段制限チェック）
  - [ ] PUT /api/folders/{id} - 更新
  - [ ] DELETE /api/folders/{id} - 削除
- [ ] タグ API
  - [ ] GET /api/tags - 一覧取得
  - [ ] GET /api/tags/suggest?q= - サジェスト

### 2.5 ファイルアップロード & MinIO 連携

- [ ] MinIO クライアントラッパー（app/utils/s3.py）
- [ ] Pydantic スキーマ定義（app/schemas/file.py）
- [ ] リポジトリ実装（app/repositories/file_repo.py）
- [ ] サービス実装（app/services/file_service.py）
- [ ] API エンドポイント（app/api/v1/files.py）
  - [ ] POST /api/files - アップロード（multipart/form-data）
  - [ ] GET /api/files/{id} - ダウンロード
  - [ ] GET /api/files/{id}/preview - プレビュー表示用
  - [ ] DELETE /api/files/{id} - 削除

### 2.6 Markdown TOC & Summary API

- [ ] Markdown ユーティリティ（app/utils/markdown.py）
  - [ ] h2 見出し抽出（TOC生成）
  - [ ] #ID リンク解析（note_links 更新）
  - [ ] 本文先頭数百文字のプレーンテキスト化（summary生成）
- [ ] API エンドポイント
  - [ ] GET /api/notes/{id}/toc - 目次取得
  - [ ] GET /api/notes/{id}/summary - サマリー取得（ホバープレビュー用）

### 2.7 コメント API

- [ ] Pydantic スキーマ定義（app/schemas/comment.py）
- [ ] リポジトリ実装（app/repositories/comment_repo.py）
- [ ] サービス実装（app/services/comment_service.py）
- [ ] API エンドポイント（app/api/v1/comments.py）
  - [ ] GET /api/notes/{id}/comments - コメント一覧（スレッド構造）
  - [ ] POST /api/notes/{id}/comments - コメント投稿
  - [ ] PUT /api/comments/{id} - コメント編集
  - [ ] DELETE /api/comments/{id} - コメント削除

### 2.8 バージョン履歴 API

- [ ] サービス実装（note_service.py に追加）
  - [ ] 保存時に note_versions へ追加
  - [ ] 最大50件制限チェック
- [ ] API エンドポイント
  - [ ] GET /api/notes/{id}/versions - バージョン一覧
  - [ ] GET /api/notes/{id}/versions/{version_no} - 特定バージョン取得
  - [ ] POST /api/notes/{id}/versions/{version_no}/restore - バージョン復元

### 2.9 リンクマップ API

- [ ] リポジトリ実装（app/repositories/link_repo.py）
- [ ] サービス実装（app/services/linkmap_service.py）
- [ ] API エンドポイント（app/api/v1/linkmap.py）
  - [ ] GET /api/linkmap - 全体マップ（nodes, edges）
  - [ ] GET /api/linkmap/{note_id} - 近傍マップ（1-2ホップ）

### 2.10 Discord Webhook 連携

- [ ] サービス実装（app/services/discord_service.py）
  - [ ] Webhook 送信関数
  - [ ] エラー時はログのみ（アプリ継続）
- [ ] イベント連携
  - [ ] ノート作成時に通知
  - [ ] ノート更新時に通知
  - [ ] コメント投稿時に通知

### 2.11 インポート/エクスポート API

- [ ] サービス実装（app/services/import_export_service.py）
- [ ] API エンドポイント（app/api/v1/import_export.py）
  - [ ] GET /api/export - ZIP エクスポート（md + 添付ファイル）
  - [ ] POST /api/import - ZIP インポート

### 2.12 検索 API

- [ ] API エンドポイント（app/api/v1/search.py）
  - [ ] GET /api/search - 通常検索（タイトル、本文、タグ対象、LIKE検索）
  - [ ] GET /api/search/quick - クイックオープン用（タイトル + タグのみ軽量）

### 2.13 クリーンアップバッチ処理

- [ ] サービス実装（app/services/cleanup_service.py）
  - [ ] ゴミ箱30日経過ノートの完全削除
  - [ ] バージョン履歴1年以上前 & 50件超過分の削除
- [ ] バッチ実行スクリプト or FastAPI スケジューラ設定

### 2.14 シードデータ

- [ ] シードスクリプト（app/db/seed.py）
  - [ ] サンプルフォルダ（プロジェクトA, 調査, 設計）
  - [ ] サンプルノート 3-5件
  - [ ] サンプルテンプレート（議事録、設計、調査用）
- [ ] 実行コマンド設定（`poetry run python -m app.db.seed`）

---

## Phase 3: Frontend 実装

### 3.1 プロジェクト初期セットアップ

- [ ] Vite + React + TypeScript プロジェクト作成
- [ ] pnpm 設定
- [ ] 依存パッケージ追加
  - react, react-dom, react-router-dom
  - @tanstack/react-query
  - react-markdown, remark-gfm
  - mermaid
  - axios
- [ ] ESLint, Prettier 設定
- [ ] Vitest + React Testing Library 設定
- [ ] ディレクトリ構成作成（api/, components/, pages/, hooks/, router/, styles/）

### 3.2 API クライアント

- [ ] axios ラッパー（api/client.ts）
- [ ] 各 API モジュール
  - [ ] api/notes.ts
  - [ ] api/files.ts
  - [ ] api/comments.ts
  - [ ] api/search.ts
  - [ ] api/linkmap.ts
  - [ ] api/folders.ts
  - [ ] api/tags.ts

### 3.3 共通 UI コンポーネント

- [ ] レイアウト
  - [ ] Header.tsx（ロゴ、検索バー、クイックオープン、テーマ切替、表示名設定）
  - [ ] Sidebar.tsx（ホーム、ノート、タグ、ゴミ箱、リンクマップ）
  - [ ] Layout.tsx（Header + Sidebar + main）
- [ ] 共通コンポーネント
  - [ ] Button.tsx
  - [ ] TextInput.tsx
  - [ ] Toast.tsx（成功/エラー通知）
  - [ ] Modal.tsx
  - [ ] Pagination.tsx
- [ ] テーマ
  - [ ] ライト/ダーク切替機能
  - [ ] OS設定追従（prefers-color-scheme）
  - [ ] LocalStorage 保存
  - [ ] useTheme フック

### 3.4 ホームページ（ダッシュボード）

- [ ] HomePage.tsx
  - [ ] ピン留めノート一覧
  - [ ] 最近開いたノート一覧
  - [ ] 最近更新されたノート一覧
- [ ] NoteCard.tsx（カバー画像付きカード）

### 3.5 ノート一覧ページ

- [ ] NotesListPage.tsx
  - [ ] カード表示（カバー画像付き）
  - [ ] ページネーション（1ページ20件）
  - [ ] フォルダ/タグフィルタ
  - [ ] ソート（更新日時降順）

### 3.6 ノート詳細ページ

- [ ] NoteDetailPage.tsx
  - [ ] カバー画像 + タイトル + メタ情報
  - [ ] Markdown Viewer（中央左）
  - [ ] TOC サイドバー（中央右、h2のみ）
  - [ ] 添付ファイル一覧
  - [ ] コメントセクション
- [ ] MarkdownViewer.tsx
  - [ ] react-markdown + remark-gfm
  - [ ] Mermaid 対応（```mermaid）
  - [ ] シンタックスハイライト
  - [ ] HTML タグ無効化（XSS対策）
- [ ] TocSidebar.tsx（h2 見出しリスト、クリックでスクロール）
- [ ] FileList.tsx（アイコン + ファイル名、画像サムネイル）

### 3.7 ノート編集ページ

- [ ] NoteEditPage.tsx
  - [ ] 左：Markdown エディタ（プレーンテキストエリア）
  - [ ] 右：ライブプレビュー
  - [ ] 表示切替（エディタのみ/プレビューのみ/両方）
- [ ] EditorToolbar.tsx
  - [ ] 太字/斜体/見出し/リスト/コードブロック/リンク/チェックボックス/画像挿入
- [ ] タイトル入力
- [ ] フォルダ選択
- [ ] タグ入力（既存タグサジェスト）
- [ ] カバー画像設定
- [ ] 添付ファイルエリア（ドラッグ＆ドロップ）
- [ ] 保存ボタン（Ctrl+S）
- [ ] 編集ロック警告表示

### 3.8 ノート間リンク & ホバープレビュー

- [ ] #<数字> パース & リンク化
- [ ] NoteLinkHoverCard.tsx
  - [ ] ホバー時に /api/notes/{id}/summary 取得
  - [ ] タイトル + 概要 + 更新日時表示
- [ ] 無効リンク処理（存在しないIDの場合）

### 3.9 ファイルアップロード & Viewer

- [ ] FileUploader.tsx（ドラッグ＆ドロップ / ファイル選択）
- [ ] FileViewerModal.tsx
  - [ ] 画像：ライトボックス風拡大表示
  - [ ] PDF：pdf.js Viewer
  - [ ] テキスト：テキスト表示
  - [ ] PPT/PPTX：ダウンロードのみ
- [ ] Markdown 内画像挿入機能

### 3.10 コメント機能

- [ ] CommentSection.tsx
  - [ ] スレッド形式表示
  - [ ] 表示名設定（LocalStorage）
  - [ ] 投稿フォーム
- [ ] CommentItem.tsx
  - [ ] 本文 + 表示名 + 日時
  - [ ] 編集/削除ボタン（自分のコメントのみ）
- [ ] useDisplayName フック

### 3.11 バージョン履歴 UI

- [ ] VersionHistoryModal.tsx
  - [ ] バージョン一覧表示
  - [ ] 特定バージョン閲覧
  - [ ] 「このバージョンに戻す」操作

### 3.12 ゴミ箱ページ

- [ ] TrashPage.tsx
  - [ ] 削除済みノート一覧
  - [ ] 復元ボタン
  - [ ] 完全削除ボタン（確認ダイアログ）

### 3.13 タグ一覧 & フォルダツリー

- [ ] TagsPage.tsx（タグ一覧、クリックでフィルタ）
- [ ] FolderTree.tsx（サイドバー内、階層3段表示）

### 3.14 リンクマップページ

- [ ] LinkmapPage.tsx
  - [ ] 全体グラフ表示（ノード=ノート、エッジ=リンク）
  - [ ] ズームイン/アウト/リセット
  - [ ] ノードクリック → ノート詳細へ遷移
  - [ ] ノードホバー → タイトル+概要表示
- [ ] 近傍グラフ表示（ノート詳細から遷移）

### 3.15 クイックオープン & ショートカット

- [ ] QuickOpenModal.tsx
  - [ ] Ctrl+K で起動
  - [ ] インクリメンタルサーチ（タイトル + タグ）
  - [ ] Enter で選択ノートへ遷移
- [ ] キーボードショートカット
  - [ ] Ctrl+S：保存
  - [ ] Ctrl+B：太字
  - [ ] Ctrl+I：斜体
  - [ ] Ctrl+Shift+H：見出し2
  - [ ] Ctrl+Shift+L：リスト
  - [ ] Ctrl+Shift+C：コードブロック

### 3.16 テンプレート機能

- [ ] テンプレート保存機能（ノートから）
- [ ] 新規ノート作成時のテンプレート選択
  - [ ] システム標準（議事録、設計、調査）
  - [ ] ユーザー作成テンプレート

### 3.17 インポート/エクスポート UI

- [ ] エクスポートボタン（ZIP ダウンロード）
- [ ] インポートモーダル（ZIP アップロード）

---

## Phase 4: テスト

### 4.1 Backend テスト（pytest）

- [ ] Note CRUD API ハッピーパス
- [ ] ファイルアップロード API ハッピーパス
- [ ] TOC / Summary API ハッピーパス
- [ ] リンクマップ API ハッピーパス
- [ ] コメント API ハッピーパス

### 4.2 Frontend テスト（Vitest + React Testing Library）

- [ ] ノート一覧ページレンダリングテスト
- [ ] ノート詳細ページレンダリングテスト
- [ ] MarkdownViewer 表示テスト
- [ ] 共通コンポーネントテスト

---

## 技術スタック・バージョン

| 項目 | バージョン/ツール |
|------|------------------|
| Node.js | 20系 |
| パッケージマネージャ（Frontend） | pnpm |
| Python | 3.11 |
| PostgreSQL | 16 |
| MinIO | 安定版タグ |
| Frontend | Vite + React + TypeScript |
| Backend | FastAPI + SQLAlchemy + Alembic |

---

## 実装上の注意事項

1. **認証機能は実装しない**（閉じた社内ネットワーク前提）
2. **HTML タグは無効化**（XSS対策）
3. **ノート間リンクは `#<数字>` 形式**で解釈
4. **日時は JST 前提**、表示形式は `YYYY/MM/DD HH:mm`
5. **検索対象はノート本体のみ**（添付ファイル・コメントは対象外）
6. **ソフトデリートを標準**とし、物理削除はバッチのみ
7. **設定値は環境変数由来**（UI から変更不可）
