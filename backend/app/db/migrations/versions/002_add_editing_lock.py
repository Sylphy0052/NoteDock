"""Add editing lock columns to notes table

Revision ID: 002_add_editing_lock
Revises: 001_initial
Create Date: 2024-12-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002_add_editing_lock"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add editing lock columns to notes table
    op.add_column(
        "notes",
        sa.Column("editing_locked_by", sa.String(100), nullable=True)
    )
    op.add_column(
        "notes",
        sa.Column("editing_locked_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("notes", "editing_locked_at")
    op.drop_column("notes", "editing_locked_by")
