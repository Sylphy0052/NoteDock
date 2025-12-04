"""Cleanup service for scheduled maintenance tasks."""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.models import Note, NoteVersion, File
from app.models.file import note_files
from app.repositories.note_repo import NoteRepository
from app.repositories.file_repo import FileRepository
from app.utils.s3 import get_minio_client
from app.core.logging import log_info, log_warning, log_error
from app.db.base import now_jst


# Constants
TRASH_RETENTION_DAYS = 30
VERSION_RETENTION_DAYS = 365
MAX_VERSIONS_PER_NOTE = 50


class CleanupService:
    """Service for cleanup and maintenance tasks."""

    def __init__(self, db: Session):
        self.db = db
        self.note_repo = NoteRepository(db)
        self.file_repo = FileRepository(db)
        self.minio_client = get_minio_client()

    def run_all_cleanup(self) -> dict[str, int]:
        """
        Run all cleanup tasks.

        Returns:
            Dictionary with counts of deleted items.
        """
        results = {
            "deleted_notes": 0,
            "deleted_versions": 0,
            "deleted_files": 0,
        }

        # 1. Clean up trash (notes deleted more than 30 days ago)
        results["deleted_notes"] = self.cleanup_trash()

        # 2. Clean up old versions (older than 1 year and beyond 50 limit)
        results["deleted_versions"] = self.cleanup_old_versions()

        # 3. Clean up orphaned files
        results["deleted_files"] = self.cleanup_orphaned_files()

        log_info(
            f"Cleanup completed: "
            f"{results['deleted_notes']} notes, "
            f"{results['deleted_versions']} versions, "
            f"{results['deleted_files']} files"
        )

        return results

    def cleanup_trash(self) -> int:
        """
        Permanently delete notes that have been in trash for more than 30 days.

        Returns:
            Number of deleted notes.
        """
        cutoff_date = now_jst() - timedelta(days=TRASH_RETENTION_DAYS)
        deleted_count = 0

        # Find notes to delete
        query = select(Note).where(
            Note.deleted_at.is_not(None),
            Note.deleted_at < cutoff_date,
        )
        result = self.db.execute(query)
        notes_to_delete = list(result.scalars().all())

        for note in notes_to_delete:
            try:
                # Collect file IDs to check later
                file_ids = [f.id for f in note.files]

                # Delete note (cascade will handle versions, comments, links)
                self.note_repo.hard_delete(note)
                deleted_count += 1

                log_info(f"Permanently deleted note id={note.id} title={note.title}")
            except Exception as e:
                log_error(f"Failed to delete note {note.id}: {e}")
                self.db.rollback()

        return deleted_count

    def cleanup_old_versions(self) -> int:
        """
        Delete old versions beyond the limits:
        - More than 1 year old AND
        - Beyond the 50 most recent versions per note

        Returns:
            Number of deleted versions.
        """
        cutoff_date = now_jst() - timedelta(days=VERSION_RETENTION_DAYS)
        deleted_count = 0

        # Get all notes with versions
        notes_query = select(Note.id)
        notes_result = self.db.execute(notes_query)
        note_ids = [row[0] for row in notes_result.fetchall()]

        for note_id in note_ids:
            try:
                # Get versions for this note, ordered by version_no desc
                versions_query = (
                    select(NoteVersion)
                    .where(NoteVersion.note_id == note_id)
                    .order_by(NoteVersion.version_no.desc())
                )
                versions_result = self.db.execute(versions_query)
                versions = list(versions_result.scalars().all())

                # Skip the first MAX_VERSIONS_PER_NOTE
                versions_to_check = versions[MAX_VERSIONS_PER_NOTE:]

                for version in versions_to_check:
                    # Only delete if older than 1 year
                    if version.created_at < cutoff_date:
                        self.db.delete(version)
                        deleted_count += 1

                self.db.commit()
            except Exception as e:
                log_error(f"Failed to cleanup versions for note {note_id}: {e}")
                self.db.rollback()

        if deleted_count > 0:
            log_info(f"Deleted {deleted_count} old versions")

        return deleted_count

    def cleanup_orphaned_files(self) -> int:
        """
        Delete files not referenced by any note (not in note_files and not as cover).

        Returns:
            Number of deleted files.
        """
        deleted_count = 0

        # Get orphaned files
        orphaned_files = self.file_repo.get_orphaned_files()

        for file in orphaned_files:
            try:
                # Delete from MinIO
                if self.minio_client.file_exists(file.stored_key):
                    self.minio_client.delete_file(file.stored_key)

                # Delete from database
                self.file_repo.delete(file)
                deleted_count += 1

                log_info(f"Deleted orphaned file id={file.id} key={file.stored_key}")
            except Exception as e:
                log_error(f"Failed to delete orphaned file {file.id}: {e}")
                self.db.rollback()

        return deleted_count


def run_cleanup_job(db: Session) -> dict[str, int]:
    """
    Entry point for running cleanup as a scheduled job.

    Args:
        db: Database session.

    Returns:
        Cleanup results.
    """
    service = CleanupService(db)
    return service.run_all_cleanup()
