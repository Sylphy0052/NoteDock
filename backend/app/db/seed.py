#!/usr/bin/env python
"""
Seed script for NoteDock.

This script creates initial sample data:
- Sample folders (プロジェクトA, 調査, 設計)
- Sample notes (3-5 notes)
- Sample templates (議事録, 設計書, 調査メモ)

Usage:
    poetry run python -m app.db.seed
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.db.session import SessionLocal
from app.models import Folder, Note, Tag, NoteVersion
from app.core.logging import log_info, log_error
from app.db.base import now_jst


# Sample folder data
SAMPLE_FOLDERS = [
    {"name": "プロジェクトA", "children": ["設計", "調査", "議事録"]},
    {"name": "プロジェクトB", "children": ["開発", "テスト"]},
    {"name": "ナレッジベース", "children": ["技術メモ", "Tips"]},
]

# Sample tags
SAMPLE_TAGS = [
    "設計",
    "調査",
    "議事録",
    "重要",
    "TODO",
    "Python",
    "TypeScript",
    "Docker",
    "API",
    "フロントエンド",
]

# Sample notes
SAMPLE_NOTES = [
    {
        "title": "プロジェクトA キックオフ議事録",
        "folder_path": ["プロジェクトA", "議事録"],
        "tags": ["議事録", "重要"],
        "is_pinned": True,
        "content_md": """# プロジェクトA キックオフ議事録

## 日時
2025年1月6日 10:00-11:00

## 参加者
- 田中（PM）
- 鈴木（リードエンジニア）
- 佐藤（フロントエンド）
- 山田（バックエンド）

## アジェンダ

### 1. プロジェクト概要
新しいナレッジ管理システムの開発プロジェクト。
- 目標: Markdownベースのドキュメント管理
- 期間: 3ヶ月

### 2. 技術スタック
- フロントエンド: React + TypeScript
- バックエンド: FastAPI + Python
- データベース: PostgreSQL

### 3. 次回アクション
- [ ] 要件定義書の作成（田中）
- [ ] 技術調査開始（鈴木）
- [ ] 開発環境構築（山田）

## 関連ノート
- #2 技術調査メモ
- #3 システム設計書
""",
    },
    {
        "title": "技術調査メモ: React 18 の新機能",
        "folder_path": ["ナレッジベース", "技術メモ"],
        "tags": ["調査", "TypeScript", "フロントエンド"],
        "is_pinned": False,
        "content_md": """# React 18 の新機能

## Concurrent Features

React 18では、新しいコンカレント機能が導入されました。

### useTransition

```typescript
const [isPending, startTransition] = useTransition();

function handleClick() {
  startTransition(() => {
    setTab('comments');
  });
}
```

### useDeferredValue

```typescript
const deferredQuery = useDeferredValue(query);
```

## Automatic Batching

React 18では、すべての状態更新が自動的にバッチ処理されます。

```typescript
// これらの更新は1回のレンダリングにまとめられる
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
}, 1000);
```

## 参考リンク
- [React 18 公式ドキュメント](https://react.dev)
- [アップグレードガイド](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)
""",
    },
    {
        "title": "システム設計書",
        "folder_path": ["プロジェクトA", "設計"],
        "tags": ["設計", "API"],
        "is_pinned": True,
        "content_md": """# システム設計書

## 1. システム概要

本システムは、ITエンジニアチーム向けのナレッジ管理Webアプリケーションです。

## 2. アーキテクチャ

```mermaid
graph TB
    Client[クライアント<br/>React] --> API[API Server<br/>FastAPI]
    API --> DB[(PostgreSQL)]
    API --> S3[MinIO<br/>ファイルストレージ]
```

## 3. データモデル

### 3.1 Notes テーブル
| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT | 主キー |
| title | VARCHAR | タイトル |
| content_md | TEXT | Markdown本文 |
| folder_id | INT | フォルダID |
| is_pinned | BOOL | ピン留め |

### 3.2 Tags テーブル
| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT | 主キー |
| name | VARCHAR | タグ名 |

## 4. API設計

### ノート API
- `GET /api/notes` - 一覧取得
- `GET /api/notes/{id}` - 詳細取得
- `POST /api/notes` - 作成
- `PUT /api/notes/{id}` - 更新
- `DELETE /api/notes/{id}` - 削除

## 関連ノート
- #1 キックオフ議事録
""",
    },
    {
        "title": "Docker コンテナ Tips",
        "folder_path": ["ナレッジベース", "Tips"],
        "tags": ["Docker", "Tips"],
        "is_pinned": False,
        "content_md": """# Docker コンテナ Tips

## よく使うコマンド

### コンテナ操作
```bash
# コンテナ一覧
docker ps -a

# コンテナ起動
docker-compose up -d

# ログ確認
docker-compose logs -f backend
```

### クリーンアップ
```bash
# 停止中のコンテナを削除
docker container prune

# 未使用イメージを削除
docker image prune -a

# 全てのボリュームを削除（注意！）
docker volume prune
```

## docker-compose のTips

### 環境変数の管理
```yaml
services:
  backend:
    env_file:
      - .env
      - .env.local
```

### ヘルスチェック
```yaml
services:
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```
""",
    },
    {
        "title": "【テンプレート】議事録",
        "folder_path": ["ナレッジベース"],
        "tags": ["議事録"],
        "is_pinned": False,
        "is_readonly": True,
        "content_md": """# 【テンプレート】議事録

## 会議情報

| 項目 | 内容 |
|------|------|
| 会議名 | |
| 日時 | YYYY/MM/DD HH:mm - HH:mm |
| 場所 | |
| 参加者 | |

## アジェンダ

1.
2.
3.

## 議事内容

### 1.

### 2.

### 3.

## 決定事項

-

## アクションアイテム

| 担当者 | タスク | 期限 |
|--------|--------|------|
| | | |

## 次回予定

- 日時:
- アジェンダ:
""",
    },
]


def create_folders(db) -> dict[str, Folder]:
    """Create sample folders and return a mapping of paths to folder objects."""
    folder_map: dict[str, Folder] = {}

    for folder_data in SAMPLE_FOLDERS:
        # Create parent folder
        parent_name = folder_data["name"]
        parent_folder = Folder(name=parent_name, parent_id=None)
        db.add(parent_folder)
        db.flush()
        folder_map[parent_name] = parent_folder
        log_info(f"Created folder: {parent_name}")

        # Create child folders
        for child_name in folder_data.get("children", []):
            child_folder = Folder(name=child_name, parent_id=parent_folder.id)
            db.add(child_folder)
            db.flush()
            folder_map[f"{parent_name}/{child_name}"] = child_folder
            log_info(f"Created folder: {parent_name}/{child_name}")

    db.commit()
    return folder_map


def create_tags(db) -> dict[str, Tag]:
    """Create sample tags and return a mapping of names to tag objects."""
    tag_map: dict[str, Tag] = {}

    for tag_name in SAMPLE_TAGS:
        tag = Tag(name=tag_name)
        db.add(tag)
        db.flush()
        tag_map[tag_name] = tag
        log_info(f"Created tag: {tag_name}")

    db.commit()
    return tag_map


def create_notes(db, folder_map: dict[str, Folder], tag_map: dict[str, Tag]) -> None:
    """Create sample notes."""
    for note_data in SAMPLE_NOTES:
        # Get folder
        folder = None
        if note_data.get("folder_path"):
            folder_path = "/".join(note_data["folder_path"])
            folder = folder_map.get(folder_path)

        # Get tags
        tags = [tag_map[t] for t in note_data.get("tags", []) if t in tag_map]

        # Create note
        note = Note(
            title=note_data["title"],
            content_md=note_data["content_md"],
            folder_id=folder.id if folder else None,
            is_pinned=note_data.get("is_pinned", False),
            is_readonly=note_data.get("is_readonly", False),
        )
        note.tags = tags
        db.add(note)
        db.flush()

        # Create initial version
        version = NoteVersion(
            note_id=note.id,
            version_no=1,
            title=note.title,
            content_md=note.content_md,
        )
        db.add(version)

        log_info(f"Created note: {note.title}")

    db.commit()


def main() -> None:
    """Run the seed script."""
    log_info("Starting seed script...")

    db = SessionLocal()
    try:
        # Check if data already exists
        existing_folders = db.query(Folder).first()
        if existing_folders:
            print("Data already exists. Skipping seed.")
            print("To reseed, please run migrations to reset the database first.")
            return

        # Create sample data
        print("\n" + "=" * 50)
        print("Creating sample data...")
        print("=" * 50)

        folder_map = create_folders(db)
        print(f"Created {len(folder_map)} folders")

        tag_map = create_tags(db)
        print(f"Created {len(tag_map)} tags")

        create_notes(db, folder_map, tag_map)
        print(f"Created {len(SAMPLE_NOTES)} notes")

        print("=" * 50)
        print("Seed completed successfully!")
        print("=" * 50 + "\n")

        log_info("Seed script completed successfully")
    except Exception as e:
        log_error(f"Seed script failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
