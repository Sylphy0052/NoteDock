from sqlalchemy import String, Text, Boolean, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING
import uuid

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.drawing import Drawing


class DrawingComment(Base, TimestampMixin):
    """DrawingComment model - stores comments on drawings."""

    __tablename__ = "drawing_comments"

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

    # Comment content
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Attachment target (shape ID or position)
    shape_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    position_x: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    position_y: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Author information
    author_name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    author_color: Mapped[Optional[str]] = mapped_column(
        String(7), nullable=True
    )

    # Status
    resolved: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Relationship
    drawing: Mapped["Drawing"] = relationship(
        "Drawing",
        back_populates="comments"
    )
