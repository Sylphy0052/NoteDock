"""Company Pydantic schemas."""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


class CompanyBase(BaseModel):
    """Base company schema."""

    name: str = Field(..., min_length=1, max_length=255)


class CompanyCreate(CompanyBase):
    """Schema for creating a company."""

    pass


class CompanyUpdate(BaseModel):
    """Schema for updating a company."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)


class CompanyResponse(CompanyBase):
    """Schema for company response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    project_count: int = 0
