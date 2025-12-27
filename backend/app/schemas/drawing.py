from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID


# === Shape Types ===

class ShapeBase(BaseModel):
    """Base shape schema."""
    id: str
    type: str
    x: float = 0
    y: float = 0
    rotation: float = 0
    stroke: str = "#000000"
    strokeWidth: float = 2
    fill: Optional[str] = None
    opacity: float = 1.0
    locked: bool = False
    visible: bool = True


# === Drawing Schemas ===

class DrawingBase(BaseModel):
    """Base drawing schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    canvas_width: int = Field(default=1920, ge=100, le=10000)
    canvas_height: int = Field(default=1080, ge=100, le=10000)
    is_public: bool = False


class DrawingCreate(DrawingBase):
    """Schema for creating a drawing."""
    shapes: List[dict] = Field(default_factory=list)
    owner_name: Optional[str] = Field(None, max_length=100)


class DrawingUpdate(BaseModel):
    """Schema for updating a drawing."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    shapes: Optional[List[dict]] = None
    canvas_width: Optional[int] = Field(None, ge=100, le=10000)
    canvas_height: Optional[int] = Field(None, ge=100, le=10000)
    is_public: Optional[bool] = None


class DrawingSummary(BaseModel):
    """Brief drawing summary for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    canvas_width: int
    canvas_height: int
    is_public: bool
    owner_name: Optional[str] = None
    shape_count: int = 0
    created_at: datetime
    updated_at: datetime


class DrawingResponse(BaseModel):
    """Full drawing response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    shapes: List[dict]
    canvas_width: int
    canvas_height: int
    is_public: bool
    owner_id: Optional[UUID] = None
    owner_name: Optional[str] = None
    version: int
    created_at: datetime
    updated_at: datetime


# === Share Schemas ===

class ShareCreate(BaseModel):
    """Schema for creating a share link."""
    permission: str = Field(default="view", pattern="^(view|edit)$")
    password: Optional[str] = Field(None, min_length=4, max_length=100)
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class ShareResponse(BaseModel):
    """Share link response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    drawing_id: UUID
    share_token: str
    permission: str
    has_password: bool = False
    expires_at: Optional[datetime] = None
    access_count: int
    created_at: datetime


class ShareAccessRequest(BaseModel):
    """Request to access a shared drawing."""
    password: Optional[str] = None


class SharedDrawingResponse(BaseModel):
    """Response when accessing a shared drawing."""
    drawing: DrawingResponse
    permission: str
    can_edit: bool


# === Comment Schemas ===

class CommentCreate(BaseModel):
    """Schema for creating a comment."""
    content: str = Field(..., min_length=1, max_length=10000)
    shape_id: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    author_name: str = Field(..., min_length=1, max_length=100)
    author_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")


class CommentUpdate(BaseModel):
    """Schema for updating a comment."""
    content: Optional[str] = Field(None, min_length=1, max_length=10000)
    resolved: Optional[bool] = None


class CommentResponse(BaseModel):
    """Comment response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    drawing_id: UUID
    content: str
    shape_id: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    author_name: str
    author_color: Optional[str] = None
    resolved: bool
    created_at: datetime
    updated_at: datetime


# === History Schemas ===

class HistoryResponse(BaseModel):
    """History entry response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    drawing_id: UUID
    action_type: str
    action_data: dict
    actor_name: Optional[str] = None
    actor_color: Optional[str] = None
    version: int
    created_at: datetime


class RollbackRequest(BaseModel):
    """Request to rollback to a specific version."""
    version: int = Field(..., ge=1)


# === AI Schemas ===

class AIGenerateRequest(BaseModel):
    """Request for AI shape generation."""
    prompt: str = Field(..., min_length=1, max_length=1000)
    context: Optional[str] = None


class AIGenerateResponse(BaseModel):
    """Response from AI shape generation."""
    shapes: List[dict]
    message: Optional[str] = None


class AIAlignRequest(BaseModel):
    """Request for AI auto-alignment."""
    shapes: List[dict]


class AIVectorizeRequest(BaseModel):
    """Request for image to vector conversion."""
    image_base64: str


# === List Response ===

class DrawingListResponse(BaseModel):
    """Paginated drawing list response."""
    items: List[DrawingSummary]
    total: int
    page: int
    per_page: int
    pages: int
