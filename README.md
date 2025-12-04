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
| フォルダ管理 | 🚧 | フォルダによるノート整理（開発中） |

## 技術スタック

### Frontend

- Vite + React 18 + TypeScript
- React Router v6, TanStack Query v5
- react-markdown + remark-gfm + Mermaid
- D3.js（リンクマップ可視化）

### Backend

- FastAPI (Python >=3.11)
- SQLAlchemy 2.0 + Alembic
- PostgreSQL 16
- Pydantic v2

### Infrastructure

- Docker Compose
- MinIO (S3互換ストレージ)

## セットアップ

### 必要条件

- Docker & Docker Compose
- Node.js 20+ (開発時)
- Python >=3.11 (開発時)
- npm または pnpm (フロントエンド開発時)
- uv または Poetry (バックエンド開発時)

### 起動方法

1. 環境変数の設定

    ```bash
    cp .env.example .env
    ```

2. Docker Compose でデータベース・ストレージを起動

    ```bash
    docker compose up -d db minio createbuckets
    ```

3. バックエンド起動

    ```bash
    cd backend

    # uv を使用する場合（推奨）
    uv venv
    source .venv/bin/activate
    uv pip install -e .
    alembic upgrade head
    uvicorn app.main:app --reload --port 8000

    # Poetry を使用する場合
    poetry install
    poetry run alembic upgrade head
    poetry run uvicorn app.main:app --reload --port 8000
    ```

4. フロントエンド起動

    ```bash
    cd frontend
    npm install
    npm run dev
    ```

5. アクセス
    - Frontend: <http://localhost:3000>
    - Backend API: <http://localhost:8000>
    - API Docs: <http://localhost:8000/api/docs>
    - MinIO Console: <http://localhost:9001>

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

```bash
# Backend テスト
cd backend
pytest -v

# Frontend テスト
cd frontend
npm test
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

詳細は `/api/docs` の Swagger UI を参照してください。

## ドキュメント

- [システム仕様書](docs/spec.md)
- [設計メモ](docs/design.md)
- [AIコーディングガイド](docs/coding_guide.md)
- [タスクリスト](docs/tasks.md)

## ライセンス

MIT License
