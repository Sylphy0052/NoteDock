from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING
import uuid

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.drawing import Drawing


class DrawingHistory(Base, TimestampMixin):
    """DrawingHistory model - stores change history for drawings."""

    __tablename__ = "drawing_history"

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

    # Action information
    # Examples: 'add_shape', 'update_shape', 'delete_shape', 'bulk_update'
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # Contains the details of the action (shape data, changes, etc.)
    action_data: Mapped[dict] = mapped_column(JSONB, nullable=False)

    # Actor information
    actor_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    actor_color: Mapped[Optional[str]] = mapped_column(
        String(7), nullable=True
    )

    # Optional snapshot (for periodic full snapshots)
    shapes_snapshot: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )

    # Version number (for ordering and rollback)
    version: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    # Relationship
    drawing: Mapped["Drawing"] = relationship(
        "Drawing",
        back_populates="history"
    )
