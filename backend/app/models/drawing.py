from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
import uuid

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.drawing_share import DrawingShare
    from app.models.drawing_comment import DrawingComment
    from app.models.drawing_history import DrawingHistory


class Drawing(Base, TimestampMixin):
    """Drawing model - stores CAD drawing data."""

    __tablename__ = "drawings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Shape data (JSONB array)
    shapes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)

    # Canvas settings
    canvas_width: Mapped[int] = mapped_column(Integer, default=1920, nullable=False)
    canvas_height: Mapped[int] = mapped_column(Integer, default=1080, nullable=False)

    # Owner (optional, for future user authentication)
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    owner_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Visibility
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Version for optimistic locking
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Soft delete
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    shares: Mapped[List["DrawingShare"]] = relationship(
        "DrawingShare",
        back_populates="drawing",
        cascade="all, delete-orphan"
    )
    comments: Mapped[List["DrawingComment"]] = relationship(
        "DrawingComment",
        back_populates="drawing",
        cascade="all, delete-orphan"
    )
    history: Mapped[List["DrawingHistory"]] = relationship(
        "DrawingHistory",
        back_populates="drawing",
        cascade="all, delete-orphan",
        order_by="desc(DrawingHistory.created_at)"
    )

    @property
    def is_deleted(self) -> bool:
        """Check if drawing is soft-deleted."""
        return self.deleted_at is not None
