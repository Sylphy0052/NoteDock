from datetime import timedelta

from sqlalchemy.orm import Session
from typing import Optional, List, Tuple

from app.models import Note, NoteVersion, Tag
from app.repositories.note_repo import NoteRepository
from app.repositories.tag_repo import TagRepository
from app.schemas.note import NoteCreate, NoteUpdate
from app.core.errors import NotFoundError, ValidationError
from app.db.base import now_jst


MAX_VERSIONS = 50
EDIT_LOCK_TIMEOUT_MINUTES = 30


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

    # ============================================
    # Edit Lock Methods
    # ============================================

    def _is_lock_expired(self, note: Note) -> bool:
        """Check if the edit lock has expired."""
        if not note.editing_locked_at:
            return True
        timeout = timedelta(minutes=EDIT_LOCK_TIMEOUT_MINUTES)
        return now_jst() > note.editing_locked_at + timeout

    def check_edit_lock(self, note_id: int) -> dict:
        """
        Check the edit lock status of a note.

        Returns:
            dict with keys:
            - is_locked: bool
            - locked_by: str or None
            - locked_at: datetime or None
            - is_expired: bool
        """
        note = self.get_note(note_id)
        is_locked = bool(note.editing_locked_by and note.editing_locked_at)
        is_expired = self._is_lock_expired(note) if is_locked else False

        # Auto-release expired lock
        if is_locked and is_expired:
            self._clear_edit_lock(note)
            is_locked = False

        return {
            "is_locked": is_locked,
            "locked_by": note.editing_locked_by if is_locked else None,
            "locked_at": note.editing_locked_at if is_locked else None,
            "is_expired": is_expired,
        }

    def acquire_edit_lock(
        self, note_id: int, locked_by: str, force: bool = False
    ) -> dict:
        """
        Acquire the edit lock for a note.

        Args:
            note_id: ID of the note
            locked_by: Display name or session ID of the user
            force: If True, ignore existing lock (used for "continue editing")

        Returns:
            dict with keys:
            - success: bool
            - message: str
            - locked_by: str (current lock holder)
        """
        note = self.get_note(note_id)

        # Check existing lock
        has_lock = bool(note.editing_locked_by and note.editing_locked_at)
        is_expired = self._is_lock_expired(note) if has_lock else True

        # Allow acquiring lock if: no lock, expired lock, same user, or force
        same_user = note.editing_locked_by == locked_by
        can_acquire = not has_lock or is_expired or same_user or force

        if not can_acquire:
            return {
                "success": False,
                "message": f"現在 {note.editing_locked_by} さんが編集中です",
                "locked_by": note.editing_locked_by,
            }

        # Set lock
        note.editing_locked_by = locked_by
        note.editing_locked_at = now_jst()
        self.db.commit()
        self.db.refresh(note)

        return {
            "success": True,
            "message": "編集ロックを取得しました",
            "locked_by": locked_by,
        }

    def release_edit_lock(self, note_id: int, locked_by: str) -> dict:
        """
        Release the edit lock for a note.

        Args:
            note_id: ID of the note
            locked_by: Display name of the user releasing the lock

        Returns:
            dict with keys:
            - success: bool
            - message: str
        """
        note = self.get_note(note_id)

        # Only the lock holder can release (or anyone if expired)
        if note.editing_locked_by and note.editing_locked_by != locked_by:
            if not self._is_lock_expired(note):
                return {
                    "success": False,
                    "message": "他のユーザーのロックは解除できません",
                }

        self._clear_edit_lock(note)

        return {
            "success": True,
            "message": "編集ロックを解除しました",
        }

    def refresh_edit_lock(self, note_id: int, locked_by: str) -> dict:
        """
        Refresh the edit lock (extend timeout).

        Args:
            note_id: ID of the note
            locked_by: Display name of the user

        Returns:
            dict with keys:
            - success: bool
            - message: str
        """
        note = self.get_note(note_id)

        if note.editing_locked_by != locked_by:
            return {
                "success": False,
                "message": "ロック所有者ではありません",
            }

        note.editing_locked_at = now_jst()
        self.db.commit()

        return {
            "success": True,
            "message": "編集ロックを更新しました",
        }

    def _clear_edit_lock(self, note: Note) -> None:
        """Clear the edit lock on a note."""
        note.editing_locked_by = None
        note.editing_locked_at = None
        self.db.commit()
        self.db.refresh(note)
