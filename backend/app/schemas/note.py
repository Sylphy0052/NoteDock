from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class TagResponse(BaseModel):
    """Tag response schema."""
    id: int
    name: str

    class Config:
        from_attributes = True


class FolderResponse(BaseModel):
    """Folder response schema."""
    id: int
    name: str
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True


class FileResponse(BaseModel):
    """File response schema (brief)."""
    id: int
    original_name: str
    mime_type: str
    size_bytes: int

    class Config:
        from_attributes = True


class NoteBase(BaseModel):
    """Base note schema."""
    title: str = Field(..., min_length=1, max_length=500)
    content_md: str = Field(default="")
    folder_id: Optional[int] = None
    is_pinned: bool = False
    is_readonly: bool = False
    cover_file_id: Optional[int] = None


class NoteCreate(NoteBase):
    """Schema for creating a note."""
    tag_names: List[str] = Field(default_factory=list)


class NoteUpdate(BaseModel):
    """Schema for updating a note."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content_md: Optional[str] = None
    folder_id: Optional[int] = None
    is_pinned: Optional[bool] = None
    is_readonly: Optional[bool] = None
    cover_file_id: Optional[int] = None
    tag_names: Optional[List[str]] = None


class NoteSummary(BaseModel):
    """Brief note summary for list views."""
    id: int
    title: str
    updated_at: datetime
    tags: List[TagResponse] = Field(default_factory=list)
    folder_id: Optional[int] = None
    is_pinned: bool = False
    is_readonly: bool = False
    cover_file_url: Optional[str] = None

    class Config:
        from_attributes = True


class NoteResponse(BaseModel):
    """Full note response schema."""
    id: int
    title: str
    content_md: str
    folder_id: Optional[int] = None
    folder: Optional[FolderResponse] = None
    is_pinned: bool
    is_readonly: bool
    cover_file_id: Optional[int] = None
    cover_file_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    tags: List[TagResponse] = Field(default_factory=list)
    files: List[FileResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class NoteListResponse(BaseModel):
    """Paginated note list response."""
    items: List[NoteSummary]
    total: int
    page: int
    page_size: int


class NoteSummaryHover(BaseModel):
    """Note summary for hover preview."""
    id: int
    title: str
    summary: str
    updated_at: datetime


class NotePinUpdate(BaseModel):
    """Schema for updating pin status."""
    is_pinned: bool


class NoteReadonlyUpdate(BaseModel):
    """Schema for updating readonly status."""
    is_readonly: bool
