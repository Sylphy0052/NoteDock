"""Add sort_order to templates

Revision ID: 010_add_template_sort_order
Revises: 009_add_weekly_report_template
Create Date: 2025-12-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "010_add_template_sort_order"
down_revision: Union[str, None] = "009_add_weekly_report_template"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add sort_order column
    op.add_column(
        'templates',
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='100')
    )

    # Set sort_order for system templates
    # 1. 空白, 2. 週報, 3. 議事録, 4. 設計書, 5. 調査メモ
    op.execute("UPDATE templates SET sort_order = 1 WHERE name = '空白' AND is_system = true")
    op.execute("UPDATE templates SET sort_order = 2 WHERE name = '週報' AND is_system = true")
    op.execute("UPDATE templates SET sort_order = 3 WHERE name = '議事録' AND is_system = true")
    op.execute("UPDATE templates SET sort_order = 4 WHERE name = '設計書' AND is_system = true")
    op.execute("UPDATE templates SET sort_order = 5 WHERE name = '調査メモ' AND is_system = true")


def downgrade() -> None:
    op.drop_column('templates', 'sort_order')
