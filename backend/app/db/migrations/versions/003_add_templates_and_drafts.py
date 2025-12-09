"""Add templates and note_drafts tables

Revision ID: 003_add_templates_and_drafts
Revises: 002_add_editing_lock
Create Date: 2024-12-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_add_templates_and_drafts'
down_revision: Union[str, None] = '002_add_editing_lock'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create templates table
    op.create_table(
        'templates',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=False, server_default=''),
        sa.Column('content', sa.Text(), nullable=False, server_default=''),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create note_drafts table
    op.create_table(
        'note_drafts',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('note_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False, server_default=''),
        sa.Column('content_md', sa.Text(), nullable=False, server_default=''),
        sa.Column('folder_id', sa.Integer(), nullable=True),
        sa.Column('tags_json', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('saved_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['note_id'], ['notes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_note_drafts_note_id'), 'note_drafts', ['note_id'], unique=False)
    op.create_index(op.f('ix_note_drafts_session_id'), 'note_drafts', ['session_id'], unique=False)

    # Insert system templates
    op.execute("""
        INSERT INTO templates (name, description, content, is_system, created_at, updated_at)
        VALUES
        ('議事録', '会議の議事録テンプレート', '# 会議議事録

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
', true, NOW(), NOW()),

        ('設計書', '技術設計書テンプレート', '# 設計書

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

```mermaid
graph TD
    A[Client] --> B[API Gateway]
    B --> C[Service]
    C --> D[Database]
```

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
', true, NOW(), NOW()),

        ('調査メモ', '技術調査・リサーチ用テンプレート', '# 調査メモ

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
', true, NOW(), NOW()),

        ('空白', '空白のノート', '', true, NOW(), NOW())
    """)


def downgrade() -> None:
    op.drop_index(op.f('ix_note_drafts_session_id'), table_name='note_drafts')
    op.drop_index(op.f('ix_note_drafts_note_id'), table_name='note_drafts')
    op.drop_table('note_drafts')
    op.drop_table('templates')
