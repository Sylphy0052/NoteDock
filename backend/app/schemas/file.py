from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class FileBase(BaseModel):
    """Base file schema."""
    original_name: str
    mime_type: str
    size_bytes: int


class FileCreate(FileBase):
    """Schema for creating a file record."""
    stored_key: str


class FileResponse(BaseModel):
    """File response schema."""
    id: int
    original_name: str
    mime_type: str
    size_bytes: int
    created_at: datetime
    url: str
    preview_url: Optional[str] = None

    class Config:
        from_attributes = True


class FileUploadResponse(BaseModel):
    """Response after file upload."""
    id: int
    original_name: str
    mime_type: str
    size_bytes: int
    url: str
    preview_url: Optional[str] = None


class FileBrief(BaseModel):
    """Brief file info for note attachments."""
    id: int
    original_name: str
    mime_type: str
    size_bytes: int

    class Config:
        from_attributes = True
