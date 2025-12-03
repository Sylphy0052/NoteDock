# NoteDock AI Coding Guide

## 0. このドキュメントの目的

**対象：** NoteDock を実装する AIコーディングエージェント

**目的：**

- 実装時に参照する 仕様のソースオブトゥルース を提供する
- 技術スタック・API仕様・データモデル・画面構成を明確にする

**注意：**

- 認証は無い前提
- 1インスタンス = 1チーム専用
- PCブラウザ（横1280px以上）での利用前提

## 1. 技術スタックとアーキテクチャ

### 1.1 技術スタック

**フロントエンド**

- Vite + React + TypeScript（SPA）
- ライブラリ想定：
  - react-router-dom（ルーティング）
  - react-query など（データフェッチ・キャッシュ）
  - react-markdown + remark-gfm（Markdown表示）
  - mermaid または対応ライブラリ（Mermaid描画）
  - PDF表示：react-pdf（pdfjs）など

**バックエンド**

- FastAPI (Python)
- SQLAlchemy + Alembic（DBアクセス & マイグレーション）
- MinIO クライアント（minio or boto3）

**データベース**

- PostgreSQL

**ストレージ**

- MinIO（S3互換／storageコンテナ）

### 1.2 コンテナ構成（Docker）

- frontend: Vite + React ビルド or devサーバ
- backend: FastAPI + Uvicorn
- db: PostgreSQL
- storage: MinIO

**デプロイ環境：**

- オンプレ or 自前サーバ1台で Docker Compose 運用
- ステージング環境はなし（本番のみ）

## 2. 機能概要（要点）

- ノート（Markdown）作成・編集・閲覧・削除
- ノートごとのカバー画像
- 添付ファイル（PDF / PPTX / 画像 / テキスト）
- ノート間リンク：#<ノートID> で別ノートにジャンプ
- ノート内 TOC（h2 見出し）＋右サイドバーからジャンプ
- コメント（スレッド形式、表示名ベース）
- バージョン履歴（保存ごと）
- テンプレート（ユーザー自作OK）
- フォルダ階層（最大3段）＋タグ（フリーワード）
- ゴミ箱（30日後自動完全削除）
- ノートリンクのグラフビュー（全体＋近傍）
- Discord Webhook 通知（ノート作成・更新・コメント）
- インポート／エクスポート（md + 添付）
- クイックオープン（Ctrl+K）
- テーマ（ライト/ダーク切り替え）

## 3. データモデル（DBスキーマの指針）

実際の型・制約は SQLAlchemy で定義すること。ここでは論理モデルを示す。

### 3.1 notes

| カラム | 型 |
|--------|-----|
| id | int PK, auto increment |
| title | str |
| content_md | text |
| folder_id | int \| null → folders.id |
| is_pinned | bool |
| is_readonly | bool |
| cover_file_id | int \| null → files.id |
| created_at | datetime JST |
| updated_at | datetime JST |
| deleted_at | datetime \| null |

### 3.2 note_versions

| カラム | 型 |
|--------|-----|
| id | int PK |
| note_id | int → notes.id |
| version_no | int （1,2,3…） |
| title | str |
| content_md | text |
| cover_file_id | int \| null |
| created_at | datetime JST |

**制約・運用**

- 1ノートあたり 最大50件 保存
- created_at が1年以上前の古い履歴はバッチで削除対象

### 3.3 tags / note_tags

**tags**

| カラム | 型 |
|--------|-----|
| id | int PK |
| name | str |

**note_tags**

| カラム | 型 |
|--------|-----|
| note_id | int |
| tag_id | int |

※タグはフリーワード。サジェスト用にインデックス推奨。

### 3.4 folders

| カラム | 型 |
|--------|-----|
| id | int PK |
| name | str |
| parent_id | int \| null → folders.id |

※階層最大3段は アプリ側ロジックで制約。

### 3.5 files / note_files

**files**

| カラム | 型 |
|--------|-----|
| id | int PK |
| original_name | str |
| stored_key | str （MinIOのオブジェクトキー） |
| mime_type | str |
| size_bytes | int |
| created_at | datetime |

**note_files**

| カラム | 型 |
|--------|-----|
| note_id | int |
| file_id | int |

### 3.6 comments

| カラム | 型 |
|--------|-----|
| id | int PK |
| note_id | int → notes.id |
| parent_id | int \| null （スレッド用） |
| display_name | str （ブラウザ設定名） |
| content | text |
| created_at | datetime |
| updated_at | datetime |

### 3.7 activity_logs

| カラム | 型 |
|--------|-----|
| id | int PK |
| event_type | str（例: note_created, note_updated, note_deleted, note_restored, comment_created…） |
| note_id | int \| null |
| file_id | int \| null |
| comment_id | int \| null |
| display_name | str \| null |
| ip_address | str \| null |
| user_agent | str \| null |
| created_at | datetime |

### 3.8 note_links（任意だが推奨）

| カラム | 型 |
|--------|-----|
| from_note_id | int |
| to_note_id | int |

※ Markdown解析で #<id> を検出して保存しておくと、リンクマップ生成が楽になる。

## 4. バックエンド API 設計（概要）

実装時は FastAPI のルーターに分割すること。

### 4.1 ノート

#### 4.1.1 一覧取得

**GET /api/notes**

- クエリ: page, page_size, q, tag, folder_id, sort
- 戻り値: items: NoteSummary[], total, page, page_size

```json
{
  "items": [
    {
      "id": 1,
      "title": "タイトル",
      "updated_at": "2025/12/04 14:32",
      "tags": ["API", "DB"],
      "folder_id": 2,
      "is_pinned": true,
      "cover_file_url": "/api/files/10/preview"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

#### 4.1.2 詳細取得

**GET /api/notes/{id}**

含める情報：

- ノート本体
- タグ
- フォルダ
- 添付ファイル一覧
- （任意）TOC情報も含めてもよい

#### 4.1.3 作成・更新・削除・復元

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| POST | /api/notes | ノート作成 |
| PUT | /api/notes/{id} | ノート更新（保存時に note_versions に新しいバージョン行を追加） |
| DELETE | /api/notes/{id} | ソフトデリート（deleted_at 設定） |
| POST | /api/notes/{id}/restore | 復元（deleted_at = null） |

#### 4.1.4 バージョン履歴

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| GET | /api/notes/{id}/versions | バージョン一覧 |
| GET | /api/notes/{id}/versions/{version_no} | 特定バージョン取得 |
| POST | /api/notes/{id}/versions/{version_no}/restore | 指定バージョンを現在版として復元（新しいバージョンとして保存） |

#### 4.1.5 サマリ & TOC

**GET /api/notes/{id}/summary**

```json
{ "id": 1, "title": "タイトル", "summary": "...", "updated_at": "..." }
```

**GET /api/notes/{id}/toc**

```json
[ { "id": "section-1", "text": "見出し" }, ... ]
```

Markdownからh2を抽出して生成

### 4.2 ファイル

#### 4.2.1 アップロード

**POST /api/files**

- multipart/form-data, フィールド名 file
- クエリ or ボディで note_id を指定（アップロードと同時に紐付け）

戻り値:

- file_id
- url
- preview_url（画像 or PDFの場合）

#### 4.2.2 ダウンロード／プレビュー

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| GET | /api/files/{id} | ファイルのバイナリストリーム |
| GET | /api/files/{id}/preview | 画像/PDF用の表示用レスポンス |

### 4.3 コメント

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| GET | /api/notes/{id}/comments | コメント一覧 |
| POST | /api/notes/{id}/comments | コメント投稿 |
| PUT | /api/comments/{id} | コメント編集 |
| DELETE | /api/comments/{id} | コメント削除 |

**注意：** 認証がないため、「自分のコメントかどうか」は display_name とローカル状態で判定。

### 4.4 検索／クイックオープン

**GET /api/search**

- クエリ: q, tag, folder_id 等
- 対象：ノートのタイトル・本文・タグ
- 実装：LIKE 等のシンプル検索でOK

**GET /api/search/quick**

- クイックオープン用、タイトル＋タグのみを軽量に返す

### 4.5 リンクマップ

**GET /api/linkmap**

- 全ノート・全リンクを返す

**GET /api/linkmap/{note_id}**

- 指定ノート周辺（1〜2ホップ）のサブグラフを返す

戻り値例：

```json
{
  "nodes": [
    { "id": 1, "title": "ノート1", "is_pinned": true },
    { "id": 2, "title": "ノート2" }
  ],
  "edges": [
    { "from": 1, "to": 2 }
  ]
}
```

### 4.6 インポート／エクスポート

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| GET | /api/export | すべてのノートと添付ファイルを ZIP で返す |
| POST | /api/import | ZIPを受け取り、中の .md とファイルをノートとして登録 |

### 4.7 Discord 連携（Webhook）

バックエンド内部からのみ使用。
環境変数に Webhook URL を設定しておき、以下のイベントで送信：

- ノート作成
- ノート更新
- コメント投稿

## 5. フロントエンド仕様（概要）

### 5.1 ルーティング

| パス | 画面 |
|------|------|
| / | ホーム（ダッシュボード） |
| /notes | ノート一覧 |
| /notes/:id | ノート詳細 |
| /notes/:id/edit | ノート編集 |
| /trash | ゴミ箱 |
| /tags | タグ一覧 |
| /linkmap | 全体リンクマップ |

### 5.2 共通UI

**上ヘッダー**

- ロゴ
- 検索バー
- クイックオープントリガー
- テーマ切替（ライト/ダーク）
- 表示名設定（コメント用）

**左サイドバー**

- ホーム
- ノート
- タグ
- ゴミ箱
- リンクマップ

### 5.3 ノート詳細画面

- 上部：カバー画像＋タイトル＋メタ情報
- 中央左：Markdown Viewer
- 中央右：TOC（h2のみ）
- 下 or 右下：添付ファイル一覧
- 下部：コメント（スレッド）

**ノート間リンク：**

`#1` を `<a data-note-id="1">#1</a>` にレンダリングし、
ホバー時に /api/notes/{id}/summary でサマリ取得 → ポップアップ表示。

### 5.4 ノート編集画面

**レイアウト：**

- 左：Markdownエディタ
- 右：ライブプレビュー

**エディタ上：**

- 上部ツールバー（太字、斜体、見出し、リスト、コードブロック、リンク、チェックボックス、画像挿入）

**添付ファイルエリア：**

- ドラッグ＆ドロップでアップロード

**カバー画像設定：**

- 画像ファイルを選択して設定

**ショートカット：**

- Ctrl+S 保存
- Ctrl+K クイックオープン
- その他 Markdown編集系

## 6. バックアップ・メンテナンス

**DB（PostgreSQL）**

- cron 等で毎日 pg_dump

**MinIO**

- データディレクトリを tar.gz でバックアップ

**バージョン履歴・ゴミ箱のクリーンアップ**

毎日バッチで：

- note_versions の古い行（1年以上前 & 上限外）削除
- deleted_at から30日経過したノート完全削除

## 7. AIコーディングエージェント向け実装上の注意

- 認証機能を実装しないこと。
- HTMLタグをMarkdownとして解釈しない（すべて無効化／エスケープ）。
- リンク記法 #<数字> を独自にパースして内部リンクに変換すること。
- タイムゾーンは JST前提、表示フォーマットは YYYY/MM/DD HH:mm。
- データ削除はソフトデリートを標準とし、物理削除はバッチ処理でのみ行うこと。
- 設定値（Discord Webhook URL、バックアップパスなど）は 環境変数 由来とし、UIから変更可能にしないこと。
- 検索対象はノート本体のみ（添付ファイル・コメントは検索対象外）。

## 8. 要確認・未固定事項（実装時に決めてよいもの）

以下は 大きな仕様に影響しない細部 であり、実装時に決めてよい／調整してよい項目です。

- クイックオープンのショートカットキーの最終決定（Ctrl+K で問題なければそのまま）
- Discord通知のメッセージフォーマット（絵文字や整形の細部）
- TOC内のh2以外（h3以下）を将来的に扱うかどうか
- コメントのスレッドUIの細かな見た目（インデント幅など）
- リンクマップのシビアな表示制限（ノート数が非常に多くなった場合の扱い）
