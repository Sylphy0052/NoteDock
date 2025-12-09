"""Pydantic schemas for note drafts."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DraftSave(BaseModel):
    """Schema for saving a draft."""

    session_id: str = Field(..., min_length=1, max_length=64)
    note_id: Optional[int] = None
    title: str = Field(default="")
    content_md: str = Field(default="")
    folder_id: Optional[int] = None
    tags: list[str] = Field(default_factory=list)


class DraftResponse(BaseModel):
    """Schema for draft response."""

    id: int
    note_id: Optional[int]
    session_id: str
    title: str
    content_md: str
    folder_id: Optional[int]
    tags: list[str]
    saved_at: datetime

    class Config:
        from_attributes = True


class DraftCheckResponse(BaseModel):
    """Schema for checking if a draft exists."""

    has_draft: bool
    draft: Optional[DraftResponse] = None
