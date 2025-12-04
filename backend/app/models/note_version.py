from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from app.db.base import Base, now_jst

if TYPE_CHECKING:
    from app.models.note import Note
    from app.models.file import File


class NoteVersion(Base):
    """Version history for notes."""

    __tablename__ = "note_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    note_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content_md: Mapped[str] = mapped_column(Text, nullable=False)
    cover_file_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("files.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_jst,
        nullable=False
    )

    # Relationships
    note: Mapped["Note"] = relationship(
        "Note",
        back_populates="versions"
    )
    cover_file: Mapped[Optional["File"]] = relationship(
        "File",
        foreign_keys=[cover_file_id]
    )
