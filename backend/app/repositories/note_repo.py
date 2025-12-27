from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, or_, and_
from typing import Any, Optional, List, Tuple
from datetime import datetime

from app.models import Note, Tag, Folder, Project
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
                joinedload(Note.project),
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
        project_id: Optional[int] = None,
        is_pinned: Optional[bool] = None,
        is_hidden_from_home: Optional[bool] = None,
        include_deleted: bool = False,
        sort_by_pinned: bool = True,
        sort_by: str = "updated_at",
    ) -> Tuple[List[Note], int]:
        """Get paginated list of notes."""
        query = select(Note).options(
            joinedload(Note.tags),
            joinedload(Note.folder),
            joinedload(Note.project),
        )

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

        # Project filter
        if project_id is not None:
            query = query.where(Note.project_id == project_id)

        # Pinned filter
        if is_pinned is not None:
            query = query.where(Note.is_pinned == is_pinned)

        # Hidden from home filter
        if is_hidden_from_home is not None:
            query = query.where(Note.is_hidden_from_home == is_hidden_from_home)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar() or 0

        # Determine sort column
        sort_column = Note.created_at if sort_by == "created_at" else Note.updated_at

        # Order by pinned first (if enabled), then by sort column
        if sort_by_pinned:
            query = query.order_by(Note.is_pinned.desc(), sort_column.desc())
        else:
            query = query.order_by(sort_column.desc())

        # Pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = self.db.execute(query)
        notes = list(result.unique().scalars().all())

        return notes, total

    def get_by_folder_ids(
        self,
        folder_ids: List[int],
        include_deleted: bool = False,
    ) -> List[Note]:
        """Get all notes belonging to multiple folders.

        Args:
            folder_ids: List of folder IDs to get notes from.
            include_deleted: Whether to include deleted notes.

        Returns:
            List of notes belonging to the specified folders.
        """
        if not folder_ids:
            return []

        query = select(Note).options(joinedload(Note.tags))

        if not include_deleted:
            query = query.where(Note.deleted_at.is_(None))

        query = query.where(Note.folder_id.in_(folder_ids))
        query = query.order_by(Note.updated_at.desc())

        result = self.db.execute(query)
        return list(result.unique().scalars().all())

    def create(
        self,
        title: str,
        content_md: str = "",
        folder_id: Optional[int] = None,
        project_id: Optional[int] = None,
        is_pinned: bool = False,
        is_readonly: bool = False,
        is_hidden_from_home: bool = False,
        cover_file_id: Optional[int] = None,
        tags: Optional[List[Tag]] = None,
        created_by: Optional[str] = None,
        updated_by: Optional[str] = None,
    ) -> Note:
        """Create a new note."""
        note = Note(
            title=title,
            content_md=content_md,
            folder_id=folder_id,
            project_id=project_id,
            is_pinned=is_pinned,
            is_readonly=is_readonly,
            is_hidden_from_home=is_hidden_from_home,
            cover_file_id=cover_file_id,
            created_by=created_by,
            updated_by=updated_by,
        )
        if tags:
            note.tags = tags

        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note

    def update(self, note: Note, **kwargs: Any) -> Note:
        """Update a note."""
        for key, value in kwargs.items():
            if hasattr(note, key):
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
            project_id=note.project_id,
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

    def get_by_project(
        self,
        project_id: int,
        include_deleted: bool = False,
    ) -> List[Note]:
        """Get all notes for a specific project.

        Args:
            project_id: Project ID to filter by.
            include_deleted: Whether to include deleted notes.

        Returns:
            List of notes belonging to the specified project.
        """
        query = select(Note).options(
            joinedload(Note.tags),
            joinedload(Note.folder),
            joinedload(Note.project),
        )

        if not include_deleted:
            query = query.where(Note.deleted_at.is_(None))

        query = query.where(Note.project_id == project_id)
        query = query.order_by(Note.updated_at.desc())

        result = self.db.execute(query)
        return list(result.unique().scalars().all())

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

    def get_by_folder_ids_with_date_filter(
        self,
        folder_ids: List[int],
        created_after: Optional[datetime] = None,
        include_deleted: bool = False,
    ) -> List[Note]:
        """Get notes from specified folders created after a given date.

        Args:
            folder_ids: List of folder IDs to get notes from.
            created_after: Only include notes created after this datetime.
            include_deleted: Whether to include deleted notes.

        Returns:
            List of notes matching the criteria.
        """
        if not folder_ids:
            return []

        query = select(Note).options(joinedload(Note.tags))

        if not include_deleted:
            query = query.where(Note.deleted_at.is_(None))

        query = query.where(Note.folder_id.in_(folder_ids))

        if created_after:
            query = query.where(Note.created_at >= created_after)

        query = query.order_by(Note.created_at.desc())

        result = self.db.execute(query)
        return list(result.unique().scalars().all())
