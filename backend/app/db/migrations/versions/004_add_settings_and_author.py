"""Add app_settings table and author columns to notes

Revision ID: 004_add_settings_and_author
Revises: 003_add_templates_and_drafts
Create Date: 2024-12-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "004_add_settings_and_author"
down_revision: Union[str, None] = "003_add_templates_and_drafts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create app_settings table
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.Text(), nullable=False, default=""),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )

    # Add author columns to notes table
    op.add_column(
        "notes",
        sa.Column("created_by", sa.String(100), nullable=True)
    )
    op.add_column(
        "notes",
        sa.Column("updated_by", sa.String(100), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("notes", "updated_by")
    op.drop_column("notes", "created_by")
    op.drop_table("app_settings")
