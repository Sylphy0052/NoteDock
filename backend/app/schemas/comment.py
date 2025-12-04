from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class CommentBase(BaseModel):
    """Base comment schema."""
    content: str = Field(..., min_length=1)
    display_name: str = Field(..., min_length=1, max_length=100)
    parent_id: Optional[int] = None


class CommentCreate(CommentBase):
    """Schema for creating a comment."""
    pass


class CommentUpdate(BaseModel):
    """Schema for updating a comment."""
    content: str = Field(..., min_length=1)


class CommentResponse(BaseModel):
    """Comment response schema."""
    id: int
    note_id: int
    parent_id: Optional[int] = None
    display_name: str
    content: str
    created_at: datetime
    updated_at: datetime
    replies: List["CommentResponse"] = []

    class Config:
        from_attributes = True


CommentResponse.model_rebuild()
