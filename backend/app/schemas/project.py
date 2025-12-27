"""Project Pydantic schemas."""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

from app.schemas.company import CompanyResponse


class ProjectBase(BaseModel):
    """Base project schema."""

    name: str = Field(..., min_length=1, max_length=255)
    company_id: Optional[int] = None


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""

    pass


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_id: Optional[int] = None


class ProjectResponse(ProjectBase):
    """Schema for project response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    company: Optional[CompanyResponse] = None
    created_at: datetime
    updated_at: datetime
    note_count: int = 0


class ProjectSummary(BaseModel):
    """Project summary for hover preview."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company_name: Optional[str] = None
