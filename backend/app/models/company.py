"""Company model for project management."""
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, TYPE_CHECKING

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project


class Company(Base, TimestampMixin):
    """Company model for grouping projects.

    Represents a customer or partner organization.
    Projects can optionally belong to a company.
    """

    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Relationships
    projects: Mapped[List["Project"]] = relationship(
        "Project",
        back_populates="company"
    )
