from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, TYPE_CHECKING
import uuid

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.drawing import Drawing


class DrawingShare(Base, TimestampMixin):
    """DrawingShare model - stores share links for drawings."""

    __tablename__ = "drawing_shares"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    drawing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drawings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Share token (unique identifier for the share link)
    share_token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )

    # Permission level
    permission: Mapped[str] = mapped_column(
        String(20), default="view", nullable=False
    )  # 'view' | 'edit'

    # Optional password protection
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Optional expiration
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Access tracking
    accessed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    access_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationship
    drawing: Mapped["Drawing"] = relationship(
        "Drawing",
        back_populates="shares"
    )

    @property
    def is_expired(self) -> bool:
        """Check if share link is expired."""
        if self.expires_at is None:
            return False
        return datetime.now(self.expires_at.tzinfo) > self.expires_at

    @property
    def is_view_only(self) -> bool:
        """Check if share is view-only."""
        return self.permission == "view"

    @property
    def can_edit(self) -> bool:
        """Check if share allows editing."""
        return self.permission == "edit"
