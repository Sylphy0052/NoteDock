# NoteDock 実装前設計メモ（AIエージェント向け）

## 1. リポジトリ構成

### 1.1 全体

単一リポジトリ（モノレポ）で管理する。

```
notedock/
  frontend/      # Vite + React + TS
  backend/       # FastAPI + SQLAlchemy
  infra/         # docker-compose などインフラ系（任意）
  README.md
  .editorconfig
  .gitignore
```

### 1.2 frontend ディレクトリ構成（例）

```
frontend/
  src/
    api/
      client.ts        # axios or fetch wrapper
      notes.ts
      files.ts
      comments.ts
      search.ts
      linkmap.ts
    components/
      layout/
        Header.tsx
        Sidebar.tsx
      notes/
        NoteCard.tsx
        NoteDetail.tsx
        NoteEditor.tsx
        TocSidebar.tsx
        FileList.tsx
        FileViewerModal.tsx
        NoteLinkHoverCard.tsx
      common/
        Button.tsx
        TextInput.tsx
        Toast.tsx
    pages/
      HomePage.tsx
      NotesListPage.tsx
      NoteDetailPage.tsx
      NoteEditPage.tsx
      TrashPage.tsx
      TagsPage.tsx
      LinkmapPage.tsx
    hooks/
      useNote.ts
      useNotes.ts
      useToc.ts
      useNoteSummary.ts
      useTheme.ts
      useDisplayName.ts
    router/
      index.tsx
    styles/
      globals.css
      theme.css
  vite.config.ts
  tsconfig.json
  package.json
  pnpm-lock.yaml
  .eslintrc.cjs
  .prettierrc
```

### 1.3 backend ディレクトリ構成（例）

```
backend/
  app/
    main.py
    core/
      config.py       # 設定/環境変数読み込み
      logging.py      # ログ設定
      errors.py       # エラーハンドリング
    db/
      base.py         # Base = declarative_base()
      session.py      # SessionLocal, engine など
      migrations/     # Alembic
    models/
      note.py
      tag.py
      folder.py
      file.py
      comment.py
      note_version.py
      note_link.py
      activity_log.py
    schemas/
      note.py
      file.py
      comment.py
      common.py       # ErrorResponse など
    repositories/
      note_repo.py
      file_repo.py
      comment_repo.py
      tag_repo.py
      link_repo.py
    services/
      note_service.py
      file_service.py
      comment_service.py
      linkmap_service.py
      import_export_service.py
      discord_service.py
      cleanup_service.py   # バージョン＆ゴミ箱クリーンアップ
    api/
      v1/
        notes.py
        files.py
        comments.py
        search.py
        linkmap.py
        import_export.py
    utils/
      markdown.py      # TOC生成, #IDリンク解析
      summary.py       # ノート概要生成
      s3.py            # MinIOクライアントラッパ
  pyproject.toml      # poetry
  alembic.ini
  README.md
```

## 2. ランタイム／バージョン指定

AIエージェントは「最新」を取りがちなので、次のバージョンを前提に実装すること：

| ツール | バージョン |
|--------|-----------|
| Node.js | 20 系 |
| パッケージマネージャ（frontend） | pnpm |
| Python | 3.11 |
| PostgreSQL | 16 |
| MinIO | 安定版タグ（例：minio/minio:RELEASE.2024-01-01T00-00-00Z 形式） |

リポジトリルートにバージョン指定ファイルを置いてもよい：

- `.nvmrc` → v20
- `.python-version` → 3.11

## 3. パッケージマネージャ・ツール

### 3.1 frontend

pnpm を使用

package.json には最低限：

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint src --ext .ts,.tsx",
  "test": "vitest"
}
```

使用ライブラリ（例）：

- `react`, `react-dom`, `react-router-dom`
- `@tanstack/react-query` など
- `react-markdown`, `remark-gfm`
- `mermaid` or `@uiw/react-md-editor` など（Mermaid対応）
- `axios` または fetch ラッパ

### 3.2 backend

poetry を使用

必須パッケージ（例）：

- fastapi
- uvicorn[standard]
- sqlalchemy
- alembic
- psycopg[binary]
- pydantic
- python-multipart（ファイルアップロード用）
- minio or boto3（S3互換）

テスト: pytest, httpx

## 4. API エラーフォーマット

### 4.1 成功レスポンス

通常はそのまま JSON オブジェクト／配列を返す。

ラップ用の `success: true` などは付けない。

### 4.2 エラーレスポンス（共通仕様）

FastAPI の Exception Handler で 統一フォーマットに変換する：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": {
      "title": ["タイトルは必須です"]
    }
  }
}
```

| フィールド | 説明 |
|-----------|------|
| code | 機械可読なエラーコード（例: VALIDATION_ERROR, NOT_FOUND, CONFLICT, INTERNAL_ERROR） |
| message | ユーザー向け日本語メッセージ（短め） |
| details | フィールドごとの詳細（バリデーション時に使用） |

**AIエージェント向けルール：**

- FastAPI の HTTPException をそのまま返さず、必ず中央のエラーハンドラを通すこと。
- Pydanticバリデーションエラーもこのフォーマットに変換。

## 5. ログ設計

### 5.1 出力先

- すべて標準出力へ（Docker 前提のため）。
- ローテーションは Docker / ホスト側に任せる。

### 5.2 ログレベル

| レベル | 用途 |
|--------|------|
| INFO | 起動、主要なイベント（ノート作成など） |
| WARNING | 想定外だが継続可能な状況 |
| ERROR | 処理失敗、例外 |

### 5.3 ログ形式

v1はプレーンテキストでOK（JSONログは必須でない）。

ただし最低限「タイムスタンプ・レベル・メッセージ」は含める。

例：

```
2025-12-04 14:32:10 [INFO] Created note id=1 title="タイトル"
2025-12-04 14:33:01 [ERROR] Failed to upload file: reason=...
```

## 6. Lint / フォーマッタ / テスト方針

### 6.1 frontend

| ツール | 用途 |
|--------|------|
| ESLint | Lint |
| Prettier | フォーマッタ |
| Vitest + React Testing Library | テスト |

最低限：

- Note一覧ページ／詳細ページがレンダリングできるテスト
- MarkdownViewer が簡単なMarkdownを正しく表示するテスト

### 6.2 backend

| ツール | 用途 |
|--------|------|
| ruff（オプション） | Lint |
| black | フォーマッタ |
| pytest | テスト |

最低限：

- Note CRUD API のハッピーパス
- ファイルアップロードAPIのハッピーパス
- ノート間リンクAPI（summary, toc, linkmap）のハッピーパス

**AIエージェント向けルール：**

- 主要APIについては 1〜2ケースでもいいのでpytestを書くこと。
- 余裕がなければテストは最低限でOKだが、テストゼロは禁止。

## 7. docker-compose 設計

### 7.1 サービス一覧

- frontend (Node/Vite or Nginx)
- backend (FastAPI + Uvicorn)
- db (PostgreSQL 16)
- minio (MinIO 本体)
- minio-console（任意、管理UI）

### 7.2 ポート割り当て

| サービス | ホスト | コンテナ |
|----------|--------|----------|
| frontend | 3000 | 3000 |
| backend | 8000 | 8000 |
| db | 5432 | 5432 |
| minio | 9000 | 9000 |
| minio-console | 9001 | 9001 |

### 7.3 環境変数（backend）

backend コンテナには最低限以下を渡す：

**DB関連**

```
DB_HOST=db
DB_PORT=5432
DB_USER=notedock
DB_PASSWORD=notedock
DB_NAME=notedock
```

**MinIO関連**

```
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=notedock
MINIO_SECRET_KEY=notedock-secret
MINIO_BUCKET=notedock-files
```

**Discord**

```
DISCORD_WEBHOOK_URL=（空 or URL）
```

### 7.4 バックアップ関連

バックアップスクリプト自体は後で手動追加でOK。
AIエージェントは、db と minio のデータディレクトリに volume を設定すること：

```yaml
services:
  db:
    volumes:
      - db-data:/var/lib/postgresql/data
  minio:
    volumes:
      - minio-data:/data

volumes:
  db-data:
  minio-data:
```

## 8. シードデータ（初期データ）

AIエージェントには、開発用の簡単なシードも実装してほしい：

backendに `app/db/seed.py` を用意し、以下を登録：

- サンプルフォルダ数個（プロジェクトA, 調査, 設計）
- サンプルノート3〜5件
- サンプルテンプレート（議事録・設計・調査用）のノート

`make seed` もしくは `poetry run python -m app.db.seed` で実行できるようにする。

## 9. AIエージェントの実装手順（推奨順序）

1. backend のデータモデル & マイグレーション実装
   - models/, alembic セットアップ
2. Note CRUD API 実装
3. ファイルアップロード & MinIO連携実装
4. Markdown TOC & summary API 実装
5. コメントAPI実装
6. バージョン履歴API実装
7. リンクマップAPI実装
8. Discord連携実装
9. インポート／エクスポート実装
10. frontend 各ページ & コンポーネント実装
11. クイックオープン & ショートカット実装
12. 簡単なテスト追加

## 10. AIエージェント向け重要ルールまとめ

- 認証機能は実装しないこと。
- Markdown での 生HTMLタグはすべて無効化 すること。
- ノート間リンクは必ず #<数字> 形式で解釈し、内部リンクとして扱うこと。
- 日時は JST 前提／表示は YYYY/MM/DD HH:mm 形式。
- 検索対象は「ノートのタイトル／本文／タグ」だけにすること。
- 添付ファイルの中身・コメントは検索対象に含めないこと。
- Golangや別言語など、仕様外の技術スタックは使わないこと（React + FastAPI + PostgreSQL + MinIO に固定）。
