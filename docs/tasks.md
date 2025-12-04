# NoteDock 実装タスクリスト

## 概要

本ドキュメントは `spec.md`、`design.md`、`coding_guide.md` に基づいて作成された実装タスクリストです。
推奨実装順序に従って構成されています。

---

## Phase 1: プロジェクト初期設定

### 1.1 リポジトリ・インフラ構成

- [x] モノレポ構成の作成（frontend/, backend/, infra/）
- [x] `.gitignore`、`.editorconfig` の設定
- [x] `.nvmrc`（v20）、`.python-version`（3.11）の配置
- [x] `docker-compose.yml` の作成
  - frontend（Vite dev / Nginx）
  - backend（FastAPI + Uvicorn）
  - db（PostgreSQL 16）
  - minio（MinIO）
  - minio-console（任意）
- [x] 環境変数ファイル（`.env.example`）の作成
  - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
  - MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
  - DISCORD_WEBHOOK_URL

---

## Phase 2: Backend 実装

### 2.1 データモデル & マイグレーション

- [x] Poetry プロジェクト初期化（pyproject.toml）
- [x] 依存パッケージ追加（fastapi, uvicorn, sqlalchemy, alembic, psycopg, pydantic, python-multipart, minio）
- [x] ディレクトリ構成作成（app/core, db, models, schemas, repositories, services, api, utils）
- [x] SQLAlchemy Base 設定（app/db/base.py）
- [x] データベース接続設定（app/db/session.py）
- [x] Alembic 初期化 & 設定
- [x] モデル実装
  - [x] notes（id, title, content_md, folder_id, is_pinned, is_readonly, cover_file_id, created_at, updated_at, deleted_at）
  - [x] note_versions（id, note_id, version_no, title, content_md, cover_file_id, created_at）
  - [x] tags（id, name）
  - [x] note_tags（note_id, tag_id）
  - [x] folders（id, name, parent_id）
  - [x] files（id, original_name, stored_key, mime_type, size_bytes, created_at）
  - [x] note_files（note_id, file_id）
  - [x] comments（id, note_id, parent_id, display_name, content, created_at, updated_at）
  - [x] activity_logs（id, event_type, note_id, file_id, comment_id, display_name, ip_address, user_agent, created_at）
  - [x] note_links（from_note_id, to_note_id）
- [x] 初回マイグレーション実行

### 2.2 共通設定・エラーハンドリング

- [x] 設定管理（app/core/config.py）- 環境変数読み込み
- [x] ログ設定（app/core/logging.py）- 標準出力、INFO/WARNING/ERROR
- [x] エラーハンドリング（app/core/errors.py）- 統一エラーフォーマット
- [x] FastAPI アプリケーション初期化（app/main.py）

### 2.3 Note CRUD API

- [x] Pydantic スキーマ定義（app/schemas/note.py）
  - NoteCreate, NoteUpdate, NoteResponse, NoteSummary, NoteListResponse
- [x] リポジトリ実装（app/repositories/note_repo.py）
- [x] サービス実装（app/services/note_service.py）
- [x] API エンドポイント（app/api/v1/notes.py）
  - [x] GET /api/notes - 一覧取得（ページネーション、フィルタ、ソート）
  - [x] GET /api/notes/{id} - 詳細取得
  - [x] POST /api/notes - 作成
  - [x] PUT /api/notes/{id} - 更新
  - [x] DELETE /api/notes/{id} - ソフトデリート
  - [x] POST /api/notes/{id}/restore - 復元
  - [x] POST /api/notes/{id}/duplicate - 複製
  - [x] PATCH /api/notes/{id}/pin - ピン留めON/OFF
  - [x] PATCH /api/notes/{id}/readonly - 閲覧専用ON/OFF

### 2.4 フォルダ・タグ API

- [x] フォルダ CRUD API
  - [x] GET /api/folders - 一覧取得（ツリー構造）
  - [x] POST /api/folders - 作成（階層3段制限チェック）
  - [x] PUT /api/folders/{id} - 更新
  - [x] DELETE /api/folders/{id} - 削除
- [x] タグ API
  - [x] GET /api/tags - 一覧取得
  - [x] GET /api/tags/suggest?q= - サジェスト

### 2.5 ファイルアップロード & MinIO 連携

- [x] MinIO クライアントラッパー（app/utils/s3.py）
- [x] Pydantic スキーマ定義（app/schemas/file.py）
- [x] リポジトリ実装（app/repositories/file_repo.py）
- [x] サービス実装（app/services/file_service.py）
- [x] API エンドポイント（app/api/v1/files.py）
  - [x] POST /api/files - アップロード（multipart/form-data）
  - [x] GET /api/files/{id} - ダウンロード
  - [x] GET /api/files/{id}/preview - プレビュー表示用
  - [x] DELETE /api/files/{id} - 削除

### 2.6 Markdown TOC & Summary API

- [x] Markdown ユーティリティ（app/utils/markdown.py）
  - [x] h2 見出し抽出（TOC生成）
  - [x] #ID リンク解析（note_links 更新）
  - [x] 本文先頭数百文字のプレーンテキスト化（summary生成）
- [x] API エンドポイント
  - [x] GET /api/notes/{id}/toc - 目次取得
  - [x] GET /api/notes/{id}/summary - サマリー取得（ホバープレビュー用）

### 2.7 コメント API

- [x] Pydantic スキーマ定義（app/schemas/comment.py）
- [x] リポジトリ実装（app/repositories/comment_repo.py）
- [x] サービス実装（app/services/comment_service.py）
- [x] API エンドポイント（app/api/v1/comments.py）
  - [x] GET /api/notes/{id}/comments - コメント一覧（スレッド構造）
  - [x] POST /api/notes/{id}/comments - コメント投稿
  - [x] PUT /api/comments/{id} - コメント編集
  - [x] DELETE /api/comments/{id} - コメント削除

### 2.8 バージョン履歴 API

- [x] サービス実装（note_service.py に追加）
  - [x] 保存時に note_versions へ追加
  - [x] 最大50件制限チェック
- [x] API エンドポイント
  - [x] GET /api/notes/{id}/versions - バージョン一覧
  - [x] GET /api/notes/{id}/versions/{version_no} - 特定バージョン取得
  - [x] POST /api/notes/{id}/versions/{version_no}/restore - バージョン復元

### 2.9 リンクマップ API

- [x] リポジトリ実装（app/repositories/link_repo.py）
- [x] サービス実装（app/services/linkmap_service.py）
- [x] API エンドポイント（app/api/v1/linkmap.py）
  - [x] GET /api/linkmap - 全体マップ（nodes, edges）
  - [x] GET /api/linkmap/{note_id} - 近傍マップ（1-2ホップ）

### 2.10 Discord Webhook 連携

- [x] サービス実装（app/services/discord_service.py）
  - [x] Webhook 送信関数
  - [x] エラー時はログのみ（アプリ継続）
- [x] イベント連携
  - [x] ノート作成時に通知
  - [x] ノート更新時に通知
  - [x] コメント投稿時に通知

### 2.11 インポート/エクスポート API

- [x] サービス実装（app/services/import_export_service.py）
- [x] API エンドポイント（app/api/v1/import_export.py）
  - [x] GET /api/export - ZIP エクスポート（md + 添付ファイル）
  - [x] POST /api/import - ZIP インポート

### 2.12 検索 API

- [x] API エンドポイント（app/api/v1/search.py）
  - [x] GET /api/search - 通常検索（タイトル、本文、タグ対象、LIKE検索）
  - [x] GET /api/search/quick - クイックオープン用（タイトル + タグのみ軽量）

### 2.13 クリーンアップバッチ処理

- [x] サービス実装（app/services/cleanup_service.py）
  - [x] ゴミ箱30日経過ノートの完全削除
  - [x] バージョン履歴1年以上前 & 50件超過分の削除
- [x] バッチ実行スクリプト（app/scripts/run_cleanup.py）

### 2.14 シードデータ

- [x] シードスクリプト（app/db/seed.py）
  - [x] サンプルフォルダ（プロジェクトA, 調査, 設計）
  - [x] サンプルノート 3-5件
  - [x] サンプルテンプレート（議事録、設計、調査用）
- [x] 実行コマンド設定（`poetry run python -m app.db.seed`）

---

## Phase 3: Frontend 実装

### 3.1 プロジェクト初期セットアップ

- [x] Vite + React + TypeScript プロジェクト作成
- [x] pnpm 設定
- [x] 依存パッケージ追加
  - react, react-dom, react-router-dom
  - @tanstack/react-query
  - react-markdown, remark-gfm
  - mermaid
  - axios
- [x] ESLint, Prettier 設定
- [x] Vitest + React Testing Library 設定
- [x] ディレクトリ構成作成（api/, components/, pages/, hooks/, router/, styles/）

### 3.2 API クライアント

- [x] axios ラッパー（api/client.ts）
- [x] 各 API モジュール
  - [x] api/notes.ts
  - [x] api/files.ts
  - [x] api/comments.ts
  - [x] api/search.ts
  - [x] api/linkmap.ts
  - [x] api/folders.ts
  - [x] api/tags.ts
  - [x] api/importExport.ts

### 3.3 共通 UI コンポーネント

- [x] レイアウト
  - [x] Header.tsx（ロゴ、検索バー、クイックオープン、テーマ切替、表示名設定）
  - [x] Sidebar.tsx（ホーム、ノート、タグ、ゴミ箱、リンクマップ）
  - [x] Layout.tsx（Header + Sidebar + main）
- [x] 共通コンポーネント
  - [x] Button.tsx
  - [x] TextInput.tsx
  - [x] Toast.tsx（成功/エラー通知）
  - [x] Modal.tsx
  - [x] Pagination.tsx
  - [x] QuickOpenModal.tsx
- [x] テーマ
  - [x] ライト/ダーク切替機能
  - [x] OS設定追従（prefers-color-scheme）
  - [x] LocalStorage 保存
  - [x] useTheme フック

### 3.4 ホームページ（ダッシュボード）

- [x] HomePage.tsx
  - [x] ピン留めノート一覧
  - [x] 最近開いたノート一覧
  - [x] 最近更新されたノート一覧
- [x] NoteCard.tsx（カバー画像付きカード）

### 3.5 ノート一覧ページ

- [x] NotesListPage.tsx
  - [x] カード表示（カバー画像付き）
  - [x] ページネーション（1ページ20件）
  - [x] フォルダ/タグフィルタ
  - [x] ソート（更新日時降順）

### 3.6 ノート詳細ページ

- [x] NoteDetailPage.tsx
  - [x] カバー画像 + タイトル + メタ情報
  - [x] Markdown Viewer（中央左）
  - [x] TOC サイドバー（中央右、h2のみ）
  - [x] 添付ファイル一覧
  - [x] コメントセクション
- [x] MarkdownViewer.tsx（components/markdown/MarkdownViewer.tsx）
  - [x] react-markdown + remark-gfm
  - [x] Mermaid 対応（```mermaid）
  - [x] シンタックスハイライト
  - [x] HTML タグ無効化（XSS対策）
- [x] TocSidebar.tsx（NoteDetailPage内に統合）
- [x] FileList.tsx（NoteDetailPage内に統合）

### 3.7 ノート編集ページ

- [x] NoteEditPage.tsx
  - [x] 左：Markdown エディタ（プレーンテキストエリア）
  - [x] 右：ライブプレビュー
  - [x] 表示切替（エディタのみ/プレビューのみ/両方）
- [x] EditorToolbar.tsx（NoteEditPage内に統合）
  - [x] 太字/斜体/見出し/リスト/コードブロック/リンク/チェックボックス/画像挿入
- [x] タイトル入力
- [x] フォルダ選択
- [x] タグ入力（既存タグサジェスト）
- [x] カバー画像設定
- [x] 添付ファイルエリア（ドラッグ＆ドロップ）
- [x] 保存ボタン（Ctrl+S）
- [x] 編集ロック警告表示

### 3.8 ノート間リンク & ホバープレビュー

- [x] #<数字> パース & リンク化
- [x] NoteLinkHoverCard.tsx
  - [x] ホバー時に /api/notes/{id}/summary 取得
  - [x] タイトル + 概要 + 更新日時表示
- [x] 無効リンク処理（存在しないIDの場合）

### 3.9 ファイルアップロード & Viewer

- [x] FileUploader.tsx（ドラッグ＆ドロップ / ファイル選択）
- [x] FileViewerModal.tsx
  - [x] 画像：ライトボックス風拡大表示
  - [x] PDF：iframe Viewer
  - [x] テキスト：テキスト表示
  - [x] PPT/PPTX：ダウンロードのみ
- [x] Markdown 内画像挿入機能

### 3.10 コメント機能

- [x] CommentSection.tsx
  - [x] スレッド形式表示
  - [x] 表示名設定（LocalStorage）
  - [x] 投稿フォーム
- [x] CommentItem.tsx
  - [x] 本文 + 表示名 + 日時
  - [x] 編集/削除ボタン（自分のコメントのみ）
- [x] useDisplayName フック

### 3.11 バージョン履歴 UI

- [x] VersionHistoryModal.tsx
  - [x] バージョン一覧表示
  - [x] 特定バージョン閲覧
  - [x] 「このバージョンに戻す」操作

### 3.12 ゴミ箱ページ

- [x] TrashPage.tsx
  - [x] 削除済みノート一覧
  - [x] 復元ボタン
  - [x] 完全削除ボタン（確認ダイアログ）

### 3.13 タグ一覧 & フォルダツリー

- [x] TagsPage.tsx（タグ一覧、クリックでフィルタ）
- [x] FolderTree.tsx（サイドバー内、階層3段表示）

### 3.14 リンクマップページ

- [x] LinkmapPage.tsx
  - [x] 全体グラフ表示（ノード=ノート、エッジ=リンク）
  - [x] ズームイン/アウト/リセット
  - [x] ノードクリック → ノート詳細へ遷移
  - [x] ノードホバー → タイトル+概要表示
- [x] 近傍グラフ表示（?focus=noteIdパラメータ対応）

### 3.15 クイックオープン & ショートカット

- [x] QuickOpenModal.tsx
  - [x] Ctrl+K で起動
  - [x] インクリメンタルサーチ（タイトル + タグ）
  - [x] Enter で選択ノートへ遷移
- [x] キーボードショートカット
  - [x] Ctrl+S：保存
  - [x] Ctrl+B：太字
  - [x] Ctrl+I：斜体
  - [x] Ctrl+Shift+H：見出し2
  - [x] Ctrl+Shift+L：リスト
  - [x] Ctrl+Shift+C：コードブロック

### 3.16 テンプレート機能

- [x] テンプレート保存機能（ノートから）
- [x] 新規ノート作成時のテンプレート選択
  - [x] システム標準（議事録、設計、調査）
  - [x] ユーザー作成テンプレート

### 3.17 インポート/エクスポート UI

- [x] エクスポートボタン（ZIP ダウンロード）
- [x] インポートモーダル（ZIP アップロード）

---

## Phase 4: テスト

### 4.1 Backend テスト（pytest）

- [x] Note CRUD API ハッピーパス
- [x] ファイルアップロード API ハッピーパス（@pytest.mark.integration）
- [x] TOC / Summary API ハッピーパス
- [x] リンクマップ API ハッピーパス
- [x] コメント API ハッピーパス

### 4.2 Frontend テスト（Vitest + React Testing Library）

- [x] ノート一覧ページレンダリングテスト
- [x] ノート詳細ページレンダリングテスト
- [x] MarkdownViewer 表示テスト
- [x] 共通コンポーネントテスト（Button, TextInput, NoteCard）

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
