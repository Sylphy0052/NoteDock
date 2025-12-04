from sqlalchemy import String, Integer, DateTime, Table, ForeignKey, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import List, TYPE_CHECKING

from app.db.base import Base, now_jst

if TYPE_CHECKING:
    from app.models.note import Note


# Association table for many-to-many relationship between notes and files
note_files = Table(
    "note_files",
    Base.metadata,
    Column("note_id", Integer, ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True),
    Column("file_id", Integer, ForeignKey("files.id", ondelete="CASCADE"), primary_key=True),
)


class File(Base):
    """File model for attachments stored in MinIO."""

    __tablename__ = "files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    original_name: Mapped[str] = mapped_column(String(500), nullable=False)
    stored_key: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_jst,
        nullable=False
    )

    # Relationships
    notes: Mapped[List["Note"]] = relationship(
        "Note",
        secondary=note_files,
        back_populates="files"
    )
