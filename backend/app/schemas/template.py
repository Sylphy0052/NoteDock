"""Pydantic schemas for templates."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TemplateCreate(BaseModel):
    """Schema for creating a template."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="", max_length=500)
    content: str = Field(default="")


class TemplateUpdate(BaseModel):
    """Schema for updating a template."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    content: Optional[str] = None


class TemplateResponse(BaseModel):
    """Schema for template response."""

    id: int
    name: str
    description: str
    content: str
    is_system: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """Schema for template list response."""

    items: list[TemplateResponse]
    total: int
