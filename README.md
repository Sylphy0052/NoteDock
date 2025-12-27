# NoteDock

ITエンジニア少人数チーム向けの Markdown ベースナレッジ蓄積 Web アプリケーション

## 概要

NoteDock は、ノートに PDF / PPTX / 画像 / テキストファイルなどを紐付け、ノート同士も `#1` のような内部リンクでつなぎ、「調査・設計・議論の情報」を一箇所に集約するためのアプリケーションです。

## 機能一覧

| 機能 | 状態 | 説明 |
|------|------|------|
| ノート CRUD | ✅ | Markdown ノートの作成・閲覧・編集・削除 |
| ライブプレビュー | ✅ | 編集中のリアルタイム Markdown プレビュー |
| コメント | ✅ | ノートへのスレッド形式コメント投稿 |
| タグ管理 | ✅ | タグの付与・フィルタリング |
| ファイル添付 | ✅ | 画像・PDF等のアップロード・プレビュー |
| リンクマップ | ✅ | ノート間リンクのグラフ可視化（D3.js） |
| ゴミ箱 | ✅ | ソフトデリート・復元機能 |
| バージョン履歴 | ✅ | 編集履歴の保存・復元 |
| テンプレート | ✅ | ノートテンプレートの保存・適用 |
| クイックオープン | ✅ | Ctrl+K でノート検索 |
| テーマ切替 | ✅ | ライト/ダークモード |
| インポート/エクスポート | ✅ | ZIP 形式での一括入出力 |
| フォルダ管理 | ✅ | フォルダによるノート整理（ツリー構造、最大3階層） |
| AI機能 | ✅ | ノート要約、質問応答、文章支援 |

## 技術スタック

### Frontend

- Vite + React 18 + TypeScript
- React Router v6, TanStack Query v5
- react-markdown + remark-gfm + Mermaid
- D3.js（リンクマップ可視化）

### Backend

- FastAPI (Python >=3.11)
- SQLAlchemy 2.0 + Alembic
- PostgreSQL 17
- Pydantic v2

### Infrastructure

- Docker Compose
- MinIO (S3互換ストレージ)

## セットアップ

### 必要条件

- Docker & Docker Compose

### クイックスタート（Docker）

リポジトリをクローンして開発環境を起動するには：

```bash
# 1. リポジトリをクローン
git clone https://github.com/your-username/NoteDock.git
cd NoteDock

# 2. 開発環境起動スクリプトを実行
./scripts/start-dev.sh
```

スクリプトが全てのサービス（PostgreSQL、MinIO、バックエンド、フロントエンド）を Docker コンテナで起動します。

起動後のアクセス先：

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:8000>
- API Docs: <http://localhost:8000/api/docs>
- MinIO Console: <http://localhost:9001>

便利なコマンド：

```bash
# ログ確認
docker compose logs -f

# 停止
docker compose down

# 再起動
docker compose restart
```

### ローカル開発（Docker外）

Docker を使わずにローカルで開発する場合：

**必要条件：**

- Node.js 20+
- Python >=3.11
- uv (推奨) または Poetry

```bash
# 1. インフラのみ Docker で起動
docker compose up -d db minio minio-init

# 2. バックエンド起動（別ターミナル）
cd backend
uv sync
DB_HOST=localhost DB_PORT=5432 DB_USER=notedock DB_PASSWORD=notedock DB_NAME=notedock \
  .venv/bin/alembic upgrade head
DB_HOST=localhost DB_PORT=5432 DB_USER=notedock DB_PASSWORD=notedock DB_NAME=notedock \
  MINIO_ENDPOINT=localhost:9000 MINIO_ACCESS_KEY=notedock MINIO_SECRET_KEY=notedock-secret \
  MINIO_BUCKET=notedock-files uv run uvicorn app.main:app --reload --port 8000

# 3. フロントエンド起動（別ターミナル）
cd frontend
npm install
npm run dev
```

## 開発

### Backend 開発

```bash
cd backend

# uv を使用する場合（推奨）
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"
uvicorn app.main:app --reload

# Poetry を使用する場合
poetry install
poetry run uvicorn app.main:app --reload
```

### Frontend 開発

```bash
cd frontend
npm install
npm run dev

# または pnpm を使用
pnpm install
pnpm dev
```

### テスト実行

#### Backend テスト（pytest）

```bash
cd backend

# 基本テスト実行
pytest -v

# MinIO統合テストを含む場合
DB_HOST=localhost DB_PORT=5432 DB_USER=notedock DB_PASSWORD=notedock DB_NAME=notedock \
  MINIO_ENDPOINT=localhost:9000 MINIO_ACCESS_KEY=notedock MINIO_SECRET_KEY=notedock-secret \
  MINIO_BUCKET=notedock-files pytest -v
```

#### Frontend 単体テスト（Vitest）

```bash
cd frontend
npm test                 # ウォッチモードで実行
npm run test:coverage    # カバレッジレポート付き
```

#### E2E テスト（Playwright）

Playwright を使用したエンドツーエンドテストを実行できます。

```bash
cd frontend

# 1. 初回セットアップ（依存関係とブラウザのインストール）
npm install
npx playwright install

# 2. テスト実行
npm run test:e2e           # 全テスト実行（ヘッドレス）
npm run test:e2e:ui        # UIモードで実行（インタラクティブ）
npm run test:e2e:headed    # ブラウザ表示付きで実行
npm run test:e2e:debug     # デバッグモードで実行
npm run test:e2e:report    # HTMLレポートを表示
```

**E2E テストの前提条件：**

- フロントエンド開発サーバーが起動している必要があります（`npm run dev`）
- または `playwright.config.ts` の `webServer` 設定により自動起動されます

**テストスイート一覧：**

| ファイル | テスト対象 |
|---------|-----------|
| `e2e/home.spec.ts` | ホームページ |
| `e2e/notes-list.spec.ts` | ノート一覧・検索・フィルタリング |
| `e2e/note-detail.spec.ts` | ノート詳細・コメント・バージョン履歴 |
| `e2e/note-edit.spec.ts` | ノート編集・作成・テンプレート |
| `e2e/folders.spec.ts` | フォルダ管理 |
| `e2e/tags.spec.ts` | タグページ |
| `e2e/linkmap.spec.ts` | リンクマップ |
| `e2e/trash.spec.ts` | ゴミ箱 |
| `e2e/search.spec.ts` | 検索・クイックオープン |

**特定のテストファイルのみ実行：**

```bash
npx playwright test e2e/home.spec.ts
npx playwright test e2e/notes-list.spec.ts --headed
```

**特定のブラウザでのみ実行：**

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### メンテナンススクリプト

#### データリセット

開発・テスト時にデータベースとMinIOストレージの全データを削除できます。

```bash
cd backend

# 現在のデータ数を確認（削除せず）
uv run python -m app.scripts.reset_data --dry-run

# データリセット実行（確認プロンプトあり）
uv run python -m app.scripts.reset_data

# 確認をスキップして実行
uv run python -m app.scripts.reset_data --force
```

**注意**: このスクリプトは全データを完全に削除します。本番環境では使用しないでください。

#### クリーンアップ

定期メンテナンス用のクリーンアップスクリプト（ゴミ箱30日経過分の完全削除、古いバージョン履歴の削除など）:

```bash
cd backend
uv run python -m app.scripts.run_cleanup
```

#### 週報自動集約

毎週月曜日に実行し、過去1週間の週報ノートをプロジェクトごとにAIで集約して実績ノートを作成します。

```bash
cd backend
uv run python -m app.scripts.run_weekly_report
```

**週報の形式:**

週報ノートは「週報」を含むフォルダ（例：`週報/個人/田中太郎`）に作成し、以下の形式でプロジェクトセクションを記述します：

```markdown
# 週報 12/25

## @P ACME/販売管理システム
- 機能Aを実装
- バグBを修正
- #123 のレビュー対応

## @P ACME/顧客管理システム
- ログイン画面を改修

## other
- 社内勉強会参加
```

**処理内容:**

1. 「週報」を含むフォルダ配下の過去7日間に作成されたノートを収集
2. `## @P 会社名/プロジェクト名` パターンでセクションを抽出
3. `#123` 形式のノートリンクからコンテンツを取得
4. プロジェクトごとにAIで集約
5. 各プロジェクトに紐づく「{プロジェクト名} 週報実績」ノートを作成/先頭に追記

**cron設定（毎週月曜0時）:**

```bash
0 0 * * 1 cd /path/to/notedock/backend && uv run python -m app.scripts.run_weekly_report >> /var/log/notedock_weekly_report.log 2>&1
```

#### バックアップ

データベースとMinIOストレージのバックアップを作成します。

```bash
# 全てバックアップ（DB + MinIO）
./scripts/backup.sh

# データベースのみ
./scripts/backup.sh --db-only

# MinIOのみ
./scripts/backup.sh --minio-only
```

バックアップファイルは `backups/` ディレクトリに保存されます：

- `db_backup_YYYYMMDD_HHMMSS.dump` - PostgreSQLバックアップ
- `minio_backup_YYYYMMDD_HHMMSS.tar.gz` - MinIOバックアップ

#### 復元

バックアップからデータを復元します。

```bash
# 利用可能なバックアップを一覧表示
./scripts/restore.sh --list

# 最新のバックアップから復元
./scripts/restore.sh --latest

# 特定のタイムスタンプから復元
./scripts/restore.sh 20251213_022344
```

**注意**: 復元操作は現在のデータを上書きします。実行前に確認プロンプトが表示されます。

#### 自動バックアップの設定

毎日自動でバックアップを実行するには、ホストマシンのcronに設定を追加します。

```bash
# crontabを編集
crontab -e

# 以下の行を追加（毎日午前2時に実行）
0 2 * * * /path/to/notedock/scripts/backup.sh >> /var/log/notedock_backup.log 2>&1
```

**設定例（絶対パスを使用）:**

```bash
# 毎日午前2時にバックアップ
0 2 * * * /home/username/projects/notedock/scripts/backup.sh >> /var/log/notedock_backup.log 2>&1

# 毎日午前2時と14時にバックアップ（1日2回）
0 2,14 * * * /home/username/projects/notedock/scripts/backup.sh >> /var/log/notedock_backup.log 2>&1

# 毎週日曜日の午前3時にバックアップ
0 3 * * 0 /home/username/projects/notedock/scripts/backup.sh >> /var/log/notedock_backup.log 2>&1
```

**設定の確認:**

```bash
# 現在のcron設定を確認
crontab -l

# バックアップログを確認
tail -f /var/log/notedock_backup.log
```

**注意事項:**

- バックアップスクリプトはDockerコンテナが起動している必要があります
- バックアップファイルは `backups/` ディレクトリに保存されます
- 古いバックアップは自動削除されません。定期的に手動で削除するか、以下のようにcronで古いファイルを削除してください：

```bash
# 30日以上前のバックアップを削除（バックアップの直後に実行）
0 3 * * * find /path/to/notedock/backups -name "*.dump" -mtime +30 -delete
0 3 * * * find /path/to/notedock/backups -name "*.tar.gz" -mtime +30 -delete
```

## ディレクトリ構成

```text
notedock/
├── frontend/          # Vite + React + TypeScript
│   ├── src/
│   │   ├── api/       # API クライアント
│   │   ├── components/# コンポーネント
│   │   ├── pages/     # ページ
│   │   ├── hooks/     # カスタムフック
│   │   ├── router/    # ルーティング
│   │   └── styles/    # スタイル
│   ├── e2e/           # Playwright E2E テスト
│   └── ...
├── backend/           # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── core/      # 設定、ログ、エラー
│   │   ├── db/        # DB接続、マイグレーション
│   │   ├── models/    # SQLAlchemy モデル
│   │   ├── schemas/   # Pydantic スキーマ
│   │   ├── repositories/ # データアクセス層
│   │   ├── services/  # ビジネスロジック
│   │   ├── api/       # APIエンドポイント
│   │   └── utils/     # ユーティリティ
│   └── ...
├── docs/              # ドキュメント
├── docker-compose.yml
└── .env.example
```

## API エンドポイント

主要なエンドポイント:

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /api/notes | ノート一覧取得 |
| POST | /api/notes | ノート作成 |
| GET | /api/notes/{id} | ノート詳細取得 |
| PUT | /api/notes/{id} | ノート更新 |
| DELETE | /api/notes/{id} | ノート削除（ソフト） |
| POST | /api/notes/{id}/restore | ノート復元 |
| GET | /api/notes/{id}/comments | コメント一覧 |
| POST | /api/notes/{id}/comments | コメント投稿 |
| GET | /api/tags | タグ一覧 |
| POST | /api/files/upload | ファイルアップロード |
| GET | /api/linkmap | リンクマップデータ |
| GET | /api/v1/settings/models | 利用可能なAIモデル一覧 |
| POST | /api/v1/ai/generate | AI生成 |
| POST | /api/v1/ai/summarize/{note_id} | ノート要約 |
| POST | /api/v1/ai/ask/{note_id} | 質問応答 |
| GET | /api/folders | フォルダ一覧（ツリー構造） |
| POST | /api/folders | フォルダ作成 |
| PUT | /api/folders/{id} | フォルダ更新 |
| DELETE | /api/folders/{id} | フォルダ削除 |

詳細は `/api/docs` の Swagger UI を参照してください。

## ドキュメント

- [システム仕様書](docs/spec.md)
- [設計メモ](docs/design.md)
- [AIコーディングガイド](docs/coding_guide.md)
- [タスクリスト](docs/tasks.md)
