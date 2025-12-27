"""Project model for project management."""
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List, TYPE_CHECKING

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.note import Note


class Project(Base, TimestampMixin):
    """Project model for organizing notes by project/case.

    Projects can optionally belong to a company.
    Notes can be associated with a project.
    """

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    company_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    company: Mapped[Optional["Company"]] = relationship(
        "Company",
        back_populates="projects"
    )
    notes: Mapped[List["Note"]] = relationship(
        "Note",
        back_populates="project"
    )
