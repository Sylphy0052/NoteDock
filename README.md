# NoteDock

ITエンジニア少人数チーム向けの Markdown ベースナレッジ蓄積 Web アプリケーション

## 概要

NoteDock は、ノートに PDF / PPTX / 画像 / テキストファイルなどを紐付け、ノート同士も `#1` のような内部リンクでつなぎ、「調査・設計・議論の情報」を一箇所に集約するためのアプリケーションです。

## 技術スタック

### Frontend

- Vite + React + TypeScript
- React Router, TanStack Query
- react-markdown + remark-gfm

### Backend

- FastAPI (Python 3.11)
- SQLAlchemy + Alembic
- PostgreSQL 16

### Infrastructure

- Docker Compose
- MinIO (S3互換ストレージ)

## セットアップ

### 必要条件

- Docker & Docker Compose
- Node.js 20 (開発時)
- Python 3.11 (開発時)
- pnpm (フロントエンド開発時)
- Poetry (バックエンド開発時)

### 起動方法

1. 環境変数の設定

    ```bash
    cp .env.example .env
    ```

1. Docker Compose で起動

    ```bash
    docker compose up -d
    ```

1. アクセス
    - Frontend: <http://localhost:3000>
    - Backend API: <http://localhost:8000>
    - API Docs: <http://localhost:8000/api/docs>
    - MinIO Console: <http://localhost:9001>

## 開発

### Backend 開発

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

### Frontend 開発

```bash
cd frontend
pnpm install
pnpm dev
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

## ドキュメント

- [システム仕様書](docs/spec.md)
- [設計メモ](docs/design.md)
- [AIコーディングガイド](docs/coding_guide.md)
- [タスクリスト](docs/tasks.md)
