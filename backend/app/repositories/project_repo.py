"""Repository for Project database operations."""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func
from typing import Any, Optional, List

from app.models.project import Project
from app.models.company import Company
from app.models.note import Note


class ProjectRepository:
    """Repository for Project database operations."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, name: str, company_id: Optional[int] = None) -> Project:
        """Create a new project."""
        project = Project(name=name, company_id=company_id)
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def get_by_id(self, project_id: int) -> Optional[Project]:
        """Get a project by ID."""
        return self.db.get(Project, project_id)

    def get_all(self) -> List[Project]:
        """Get all projects ordered by name."""
        query = select(Project).order_by(Project.name)
        result = self.db.execute(query)
        return list(result.scalars().all())

    def get_by_company(self, company_id: int) -> List[Project]:
        """Get all projects for a company."""
        query = (
            select(Project)
            .where(Project.company_id == company_id)
            .order_by(Project.name)
        )
        result = self.db.execute(query)
        return list(result.scalars().all())

    def get_projects_without_company(self) -> List[Project]:
        """Get all projects without a company."""
        query = (
            select(Project)
            .where(Project.company_id.is_(None))
            .order_by(Project.name)
        )
        result = self.db.execute(query)
        return list(result.scalars().all())

    def update(self, project: Project, **kwargs: Any) -> Project:
        """Update a project."""
        for key, value in kwargs.items():
            if hasattr(project, key):
                setattr(project, key, value)
        self.db.commit()
        self.db.refresh(project)
        return project

    def delete(self, project: Project) -> None:
        """Delete a project."""
        self.db.delete(project)
        self.db.commit()

    def search_by_name(self, query: str) -> List[Project]:
        """Search projects by name (partial match)."""
        stmt = (
            select(Project)
            .where(Project.name.ilike(f"%{query}%"))
            .order_by(Project.name)
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def get_note_count(self, project_id: int) -> int:
        """Get the number of notes for a project."""
        stmt = (
            select(func.count(Note.id))
            .where(Note.project_id == project_id)
        )
        result = self.db.execute(stmt)
        return result.scalar() or 0

    def get_notes(self, project_id: int, include_deleted: bool = False) -> List[Note]:
        """Get all notes for a project.

        Args:
            project_id: Project ID.
            include_deleted: Whether to include soft-deleted notes.

        Returns:
            List of notes for the project.
        """
        stmt = (
            select(Note)
            .where(Note.project_id == project_id)
            .order_by(Note.updated_at.desc())
        )
        if not include_deleted:
            stmt = stmt.where(Note.deleted_at.is_(None))
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def find_by_company_and_name(
        self,
        company_name: str,
        project_name: str,
    ) -> Optional[Project]:
        """Find a project by company name and project name.

        Args:
            company_name: Name of the company.
            project_name: Name of the project.

        Returns:
            Project if found, None otherwise.
        """
        stmt = (
            select(Project)
            .join(Company, Project.company_id == Company.id)
            .where(
                Company.name == company_name,
                Project.name == project_name,
            )
        )
        result = self.db.execute(stmt)
        return result.scalar_one_or_none()

    def find_by_name_only(self, project_name: str) -> Optional[Project]:
        """Find a project by name only (for projects without company).

        Args:
            project_name: Name of the project.

        Returns:
            Project if found, None otherwise.
        """
        stmt = (
            select(Project)
            .where(
                Project.name == project_name,
                Project.company_id.is_(None),
            )
        )
        result = self.db.execute(stmt)
        return result.scalar_one_or_none()
