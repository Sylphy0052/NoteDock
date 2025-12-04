from sqlalchemy.orm import Session
from typing import Optional, List, Tuple

from app.models import Note, NoteVersion, Tag
from app.repositories.note_repo import NoteRepository
from app.repositories.tag_repo import TagRepository
from app.schemas.note import NoteCreate, NoteUpdate
from app.core.errors import NotFoundError, ValidationError
from app.db.base import now_jst


MAX_VERSIONS = 50


class NoteService:
    """Service for Note business logic."""

    def __init__(self, db: Session):
        self.db = db
        self.note_repo = NoteRepository(db)
        self.tag_repo = TagRepository(db)

    def get_note(self, note_id: int, include_deleted: bool = False) -> Note:
        """Get a note by ID."""
        note = self.note_repo.get_by_id(note_id, include_deleted=include_deleted)
        if not note:
            raise NotFoundError("ノート", note_id)
        return note

    def get_notes(
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
        return self.note_repo.get_list(
            page=page,
            page_size=page_size,
            q=q,
            tag=tag,
            folder_id=folder_id,
            is_pinned=is_pinned,
            include_deleted=include_deleted,
        )

    def create_note(self, data: NoteCreate) -> Note:
        """Create a new note."""
        # Get or create tags
        tags = self.tag_repo.get_or_create_many(data.tag_names)

        note = self.note_repo.create(
            title=data.title,
            content_md=data.content_md,
            folder_id=data.folder_id,
            is_pinned=data.is_pinned,
            is_readonly=data.is_readonly,
            cover_file_id=data.cover_file_id,
            tags=tags,
        )

        # Create initial version
        self._create_version(note)

        return note

    def update_note(self, note_id: int, data: NoteUpdate) -> Note:
        """Update an existing note."""
        note = self.get_note(note_id)

        if note.is_readonly:
            raise ValidationError("このノートは閲覧専用です")

        update_data = data.model_dump(exclude_unset=True, exclude={"tag_names"})

        # Handle tags separately
        if data.tag_names is not None:
            tags = self.tag_repo.get_or_create_many(data.tag_names)
            note.tags = tags

        # Update note
        note = self.note_repo.update(note, **update_data)

        # Create new version on save
        self._create_version(note)

        return note

    def delete_note(self, note_id: int) -> Note:
        """Soft delete a note."""
        note = self.get_note(note_id)
        return self.note_repo.soft_delete(note)

    def restore_note(self, note_id: int) -> Note:
        """Restore a soft-deleted note."""
        note = self.get_note(note_id, include_deleted=True)
        if not note.is_deleted:
            raise ValidationError("このノートは削除されていません")
        return self.note_repo.restore(note)

    def hard_delete_note(self, note_id: int) -> None:
        """Permanently delete a note."""
        note = self.get_note(note_id, include_deleted=True)
        self.note_repo.hard_delete(note)

    def duplicate_note(self, note_id: int) -> Note:
        """Duplicate a note."""
        note = self.get_note(note_id)
        new_note = self.note_repo.duplicate(note)

        # Create initial version for the new note
        self._create_version(new_note)

        return new_note

    def toggle_pin(self, note_id: int, is_pinned: bool) -> Note:
        """Toggle pin status of a note."""
        note = self.get_note(note_id)
        return self.note_repo.update(note, is_pinned=is_pinned)

    def toggle_readonly(self, note_id: int, is_readonly: bool) -> Note:
        """Toggle readonly status of a note."""
        note = self.get_note(note_id)
        return self.note_repo.update(note, is_readonly=is_readonly)

    def _create_version(self, note: Note) -> NoteVersion:
        """Create a new version of the note."""
        # Get current max version number
        max_version = 0
        for version in note.versions:
            if version.version_no > max_version:
                max_version = version.version_no

        new_version = NoteVersion(
            note_id=note.id,
            version_no=max_version + 1,
            title=note.title,
            content_md=note.content_md,
            cover_file_id=note.cover_file_id,
        )
        self.db.add(new_version)
        self.db.commit()

        # Clean up old versions if exceeding max
        self._cleanup_old_versions(note)

        return new_version

    def _cleanup_old_versions(self, note: Note) -> None:
        """Remove versions exceeding the maximum count."""
        versions = sorted(note.versions, key=lambda v: v.version_no, reverse=True)

        if len(versions) > MAX_VERSIONS:
            for old_version in versions[MAX_VERSIONS:]:
                self.db.delete(old_version)
            self.db.commit()

    def get_versions(self, note_id: int) -> List[NoteVersion]:
        """Get all versions of a note."""
        note = self.get_note(note_id)
        return sorted(note.versions, key=lambda v: v.version_no, reverse=True)

    def get_version(self, note_id: int, version_no: int) -> NoteVersion:
        """Get a specific version of a note."""
        note = self.get_note(note_id)
        for version in note.versions:
            if version.version_no == version_no:
                return version
        raise NotFoundError("バージョン", version_no)

    def restore_version(self, note_id: int, version_no: int) -> Note:
        """Restore a note to a specific version."""
        note = self.get_note(note_id)
        version = self.get_version(note_id, version_no)

        if note.is_readonly:
            raise ValidationError("このノートは閲覧専用です")

        # Update note with version content
        note.title = version.title
        note.content_md = version.content_md
        note.cover_file_id = version.cover_file_id
        note.updated_at = now_jst()
        self.db.commit()
        self.db.refresh(note)

        # Create new version for the restore
        self._create_version(note)

        return note
