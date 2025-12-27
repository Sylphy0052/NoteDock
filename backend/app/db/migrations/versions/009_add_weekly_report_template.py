"""Add weekly report template

Revision ID: 009_add_weekly_report_template
Revises: 008_add_drawings
Create Date: 2025-12-25

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "009_add_weekly_report_template"
down_revision: Union[str, None] = "008_add_drawings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Insert weekly report system template
    op.execute("""
        INSERT INTO templates (name, description, content, is_system, created_at, updated_at)
        VALUES
        ('週報', '週次報告テンプレート', '# 週報 xx/yy

## @P

- [作業内容1]
- [作業内容2]

## @P

- [作業内容1]
- [作業内容2]

## other

- [作業内容1]
- [作業内容2]
', true, NOW(), NOW())
    """)


def downgrade() -> None:
    op.execute("DELETE FROM templates WHERE name = '週報' AND is_system = true")
