from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from app.db.base import Base, TimestampMixin, now_jst
from app.models.tag import note_tags
from app.models.file import note_files

if TYPE_CHECKING:
    from app.models.folder import Folder
    from app.models.tag import Tag
    from app.models.file import File
    from app.models.note_version import NoteVersion
    from app.models.comment import Comment
    from app.models.note_link import NoteLink
    from app.models.project import Project


class Note(Base, TimestampMixin):
    """Note model - the main entity for knowledge management."""

    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Override updated_at to disable onupdate - only update when content changes
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_jst,
        nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    content_md: Mapped[str] = mapped_column(Text, nullable=False, default="")
    folder_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True
    )
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_readonly: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_hidden_from_home: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    cover_file_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("files.id", ondelete="SET NULL"), nullable=True
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Editing lock fields
    editing_locked_by: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    editing_locked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Author tracking
    created_by: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    updated_by: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    # View count
    view_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    # Project association (optional, can coexist with folder)
    project_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    folder: Mapped[Optional["Folder"]] = relationship(
        "Folder",
        back_populates="notes"
    )
    project: Mapped[Optional["Project"]] = relationship(
        "Project",
        back_populates="notes"
    )
    cover_file: Mapped[Optional["File"]] = relationship(
        "File",
        foreign_keys=[cover_file_id]
    )
    tags: Mapped[List["Tag"]] = relationship(
        "Tag",
        secondary=note_tags,
        back_populates="notes"
    )
    files: Mapped[List["File"]] = relationship(
        "File",
        secondary=note_files,
        back_populates="notes"
    )
    versions: Mapped[List["NoteVersion"]] = relationship(
        "NoteVersion",
        back_populates="note",
        cascade="all, delete-orphan",
        order_by="desc(NoteVersion.version_no)"
    )
    comments: Mapped[List["Comment"]] = relationship(
        "Comment",
        back_populates="note",
        cascade="all, delete-orphan"
    )
    outgoing_links: Mapped[List["NoteLink"]] = relationship(
        "NoteLink",
        foreign_keys="NoteLink.from_note_id",
        back_populates="from_note",
        cascade="all, delete-orphan"
    )
    incoming_links: Mapped[List["NoteLink"]] = relationship(
        "NoteLink",
        foreign_keys="NoteLink.to_note_id",
        back_populates="to_note",
        cascade="all, delete-orphan"
    )

    @property
    def is_deleted(self) -> bool:
        """Check if note is soft-deleted."""
        return self.deleted_at is not None
