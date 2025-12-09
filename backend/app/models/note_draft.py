"""Note draft model for auto-saving drafts."""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, now_jst


class NoteDraft(Base):
    """Draft model for auto-saving note edits."""

    __tablename__ = "note_drafts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # note_id is nullable for new notes (not yet created)
    note_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    # session_id identifies the editing session (for new notes without note_id)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # Draft content
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    content_md: Mapped[str] = mapped_column(Text, nullable=False, default="")
    folder_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tags_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    # Timestamp
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_jst,
        onupdate=now_jst,
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<NoteDraft(id={self.id}, note_id={self.note_id}, session_id={self.session_id})>"
