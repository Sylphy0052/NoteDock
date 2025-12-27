"""Add view_count column to notes

Revision ID: 005_add_view_count
Revises: 004_add_settings_and_author
Create Date: 2024-12-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "005_add_view_count"
down_revision: Union[str, None] = "004_add_settings_and_author"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add view_count column to notes table
    op.add_column(
        "notes",
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0")
    )


def downgrade() -> None:
    op.drop_column("notes", "view_count")
