from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.note import Note


class NoteLink(Base):
    """Link between notes (parsed from #ID references in content)."""

    __tablename__ = "note_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    from_note_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    to_note_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Relationships
    from_note: Mapped["Note"] = relationship(
        "Note",
        foreign_keys=[from_note_id],
        back_populates="outgoing_links"
    )
    to_note: Mapped["Note"] = relationship(
        "Note",
        foreign_keys=[to_note_id],
        back_populates="incoming_links"
    )
