"""Add is_hidden_from_home column to notes

Revision ID: 006_add_hidden_from_home
Revises: 005_add_view_count
Create Date: 2025-12-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "006_add_hidden_from_home"
down_revision: Union[str, None] = "005_add_view_count"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_hidden_from_home column to notes table
    op.add_column(
        "notes",
        sa.Column(
            "is_hidden_from_home", sa.Boolean(), nullable=False, server_default="false"
        ),
    )


def downgrade() -> None:
    op.drop_column("notes", "is_hidden_from_home")
