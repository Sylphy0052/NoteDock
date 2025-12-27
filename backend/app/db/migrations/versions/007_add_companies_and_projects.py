"""Add companies and projects tables

Revision ID: 007_add_companies_and_projects
Revises: 006_add_hidden_from_home
Create Date: 2025-12-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "007_add_companies_and_projects"
down_revision: Union[str, None] = "006_add_hidden_from_home"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create companies table
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_companies_name", "companies", ["name"])

    # Create projects table
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["company_id"], ["companies.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projects_name", "projects", ["name"])

    # Add project_id column to notes table
    op.add_column(
        "notes",
        sa.Column("project_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_notes_project_id",
        "notes",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # Drop foreign key and column from notes
    op.drop_constraint("fk_notes_project_id", "notes", type_="foreignkey")
    op.drop_column("notes", "project_id")

    # Drop projects table
    op.drop_index("ix_projects_name", table_name="projects")
    op.drop_table("projects")

    # Drop companies table
    op.drop_index("ix_companies_name", table_name="companies")
    op.drop_table("companies")
