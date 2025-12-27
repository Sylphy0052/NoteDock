"""Add drawings tables for collaboration feature

Revision ID: 008_add_drawings
Revises: 007_add_companies_and_projects
Create Date: 2025-12-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "008_add_drawings"
down_revision: Union[str, None] = "007_add_companies_and_projects"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create drawings table
    op.create_table(
        "drawings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "shapes",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]"
        ),
        sa.Column(
            "canvas_width",
            sa.Integer(),
            nullable=False,
            server_default="1920"
        ),
        sa.Column(
            "canvas_height",
            sa.Integer(),
            nullable=False,
            server_default="1080"
        ),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("owner_name", sa.String(100), nullable=True),
        sa.Column(
            "is_public",
            sa.Boolean(),
            nullable=False,
            server_default="false"
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()")
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()")
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_drawings_name", "drawings", ["name"])
    op.create_index("ix_drawings_owner", "drawings", ["owner_id"])
    op.create_index("ix_drawings_is_public", "drawings", ["is_public"])

    # Create drawing_shares table
    op.create_table(
        "drawing_shares",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column(
            "drawing_id",
            postgresql.UUID(as_uuid=True),
            nullable=False
        ),
        sa.Column("share_token", sa.String(64), nullable=False),
        sa.Column(
            "permission",
            sa.String(20),
            nullable=False,
            server_default="'view'"
        ),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "access_count",
            sa.Integer(),
            nullable=False,
            server_default="0"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()")
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()")
        ),
        sa.ForeignKeyConstraint(
            ["drawing_id"],
            ["drawings.id"],
            ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("share_token"),
    )
    op.create_index(
        "ix_drawing_shares_token",
        "drawing_shares",
        ["share_token"]
    )
    op.create_index(
        "ix_drawing_shares_drawing",
        "drawing_shares",
        ["drawing_id"]
    )

    # Create drawing_comments table
    op.create_table(
        "drawing_comments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column(
            "drawing_id",
            postgresql.UUID(as_uuid=True),
            nullable=False
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("shape_id", sa.String(64), nullable=True),
        sa.Column("position_x", sa.Float(), nullable=True),
        sa.Column("position_y", sa.Float(), nullable=True),
        sa.Column("author_name", sa.String(100), nullable=False),
        sa.Column("author_color", sa.String(7), nullable=True),
        sa.Column(
            "resolved",
            sa.Boolean(),
            nullable=False,
            server_default="false"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()")
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()")
        ),
        sa.ForeignKeyConstraint(
            ["drawing_id"],
            ["drawings.id"],
            ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_drawing_comments_drawing",
        "drawing_comments",
        ["drawing_id"]
    )

    # Create drawing_history table
    op.create_table(
        "drawing_history",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column(
            "drawing_id",
            postgresql.UUID(as_uuid=True),
            nullable=False
        ),
        sa.Column("action_type", sa.String(50), nullable=False),
        sa.Column("action_data", postgresql.JSONB(), nullable=False),
        sa.Column("actor_name", sa.String(100), nullable=True),
        sa.Column("actor_color", sa.String(7), nullable=True),
        sa.Column("shapes_snapshot", postgresql.JSONB(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()")
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()")
        ),
        sa.ForeignKeyConstraint(
            ["drawing_id"],
            ["drawings.id"],
            ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_drawing_history_drawing",
        "drawing_history",
        ["drawing_id"]
    )
    op.create_index(
        "ix_drawing_history_version",
        "drawing_history",
        ["drawing_id", "version"]
    )


def downgrade() -> None:
    op.drop_table("drawing_history")
    op.drop_table("drawing_comments")
    op.drop_table("drawing_shares")
    op.drop_table("drawings")
