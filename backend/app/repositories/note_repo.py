from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, or_, and_
from typing import Optional, List, Tuple
from datetime import datetime

from app.models import Note, Tag, Folder
from app.db.base import now_jst


class NoteRepository:
    """Repository for Note database operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, note_id: int, include_deleted: bool = False) -> Optional[Note]:
        """Get a note by ID."""
        query = (
            select(Note)
            .options(
                joinedload(Note.tags),
                joinedload(Note.files),
                joinedload(Note.folder),
            )
            .where(Note.id == note_id)
        )
        if not include_deleted:
            query = query.where(Note.deleted_at.is_(None))

        result = self.db.execute(query)
        return result.unique().scalar_one_or_none()

    def get_list(
        self,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
        tag: Optional[str] = None,
        folder_id: Optional[int] = None,
        is_pinned: Optional[bool] = None,
        include_deleted: bool = False,
    ) -> Tuple[List[Note], int]:
        """Get paginated list of notes."""
        query = select(Note).options(joinedload(Note.tags))

        # Exclude deleted notes by default
        if not include_deleted:
            query = query.where(Note.deleted_at.is_(None))
        else:
            # Only show deleted notes
            query = query.where(Note.deleted_at.is_not(None))

        # Search filter
        if q:
            search_term = f"%{q}%"
            query = query.where(
                or_(
                    Note.title.ilike(search_term),
                    Note.content_md.ilike(search_term),
                )
            )

        # Tag filter
        if tag:
            query = query.where(Note.tags.any(Tag.name == tag))

        # Folder filter
        if folder_id is not None:
            query = query.where(Note.folder_id == folder_id)

        # Pinned filter
        if is_pinned is not None:
            query = query.where(Note.is_pinned == is_pinned)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar() or 0

        # Order by pinned first, then by updated_at
        query = query.order_by(Note.is_pinned.desc(), Note.updated_at.desc())

        # Pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = self.db.execute(query)
        notes = list(result.unique().scalars().all())

        return notes, total

    def create(
        self,
        title: str,
        content_md: str = "",
        folder_id: Optional[int] = None,
        is_pinned: bool = False,
        is_readonly: bool = False,
        cover_file_id: Optional[int] = None,
        tags: Optional[List[Tag]] = None,
    ) -> Note:
        """Create a new note."""
        note = Note(
            title=title,
            content_md=content_md,
            folder_id=folder_id,
            is_pinned=is_pinned,
            is_readonly=is_readonly,
            cover_file_id=cover_file_id,
        )
        if tags:
            note.tags = tags

        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note

    def update(self, note: Note, **kwargs: any) -> Note:
        """Update a note."""
        for key, value in kwargs.items():
            if hasattr(note, key) and value is not None:
                setattr(note, key, value)

        note.updated_at = now_jst()
        self.db.commit()
        self.db.refresh(note)
        return note

    def soft_delete(self, note: Note) -> Note:
        """Soft delete a note."""
        note.deleted_at = now_jst()
        self.db.commit()
        self.db.refresh(note)
        return note

    def restore(self, note: Note) -> Note:
        """Restore a soft-deleted note."""
        note.deleted_at = None
        self.db.commit()
        self.db.refresh(note)
        return note

    def hard_delete(self, note: Note) -> None:
        """Permanently delete a note."""
        self.db.delete(note)
        self.db.commit()

    def duplicate(self, note: Note) -> Note:
        """Duplicate a note."""
        new_note = Note(
            title=f"{note.title} (コピー)",
            content_md=note.content_md,
            folder_id=note.folder_id,
            is_pinned=False,
            is_readonly=False,
            cover_file_id=note.cover_file_id,
        )
        # Copy tags
        new_note.tags = list(note.tags)
        # Copy files
        new_note.files = list(note.files)

        self.db.add(new_note)
        self.db.commit()
        self.db.refresh(new_note)
        return new_note

    def get_deleted_notes_older_than(self, days: int) -> List[Note]:
        """Get notes deleted more than X days ago."""
        from datetime import timedelta
        cutoff = now_jst() - timedelta(days=days)

        query = (
            select(Note)
            .where(Note.deleted_at.is_not(None))
            .where(Note.deleted_at < cutoff)
        )
        result = self.db.execute(query)
        return list(result.scalars().all())
