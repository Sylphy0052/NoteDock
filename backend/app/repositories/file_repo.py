from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional, List
import mimetypes

from app.models import File, Note
from app.models.file import note_files
from app.utils.s3 import get_minio_client


class FileRepository:
    """Repository for File database operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, file_id: int) -> Optional[File]:
        """Get a file by ID."""
        return self.db.get(File, file_id)

    def get_by_key(self, stored_key: str) -> Optional[File]:
        """Get a file by stored key."""
        query = select(File).where(File.stored_key == stored_key)
        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def create(
        self,
        original_name: str,
        stored_key: str,
        mime_type: str,
        size_bytes: int,
    ) -> File:
        """Create a new file record."""
        file = File(
            original_name=original_name,
            stored_key=stored_key,
            mime_type=mime_type,
            size_bytes=size_bytes,
        )
        self.db.add(file)
        self.db.commit()
        self.db.refresh(file)
        return file

    def delete(self, file: File) -> None:
        """Delete a file record."""
        self.db.delete(file)
        self.db.commit()

    def attach_to_note(self, file: File, note: Note) -> None:
        """Attach a file to a note."""
        if file not in note.files:
            note.files.append(file)
            self.db.commit()

    def detach_from_note(self, file: File, note: Note) -> None:
        """Detach a file from a note."""
        if file in note.files:
            note.files.remove(file)
            self.db.commit()

    def get_files_for_note(self, note_id: int) -> List[File]:
        """Get all files attached to a note."""
        query = (
            select(File)
            .join(note_files)
            .where(note_files.c.note_id == note_id)
        )
        result = self.db.execute(query)
        return list(result.scalars().all())

    def is_referenced_by_other_notes(self, file: File, exclude_note_id: int) -> bool:
        """Check if file is referenced by notes other than the specified one."""
        query = (
            select(note_files.c.note_id)
            .where(note_files.c.file_id == file.id)
            .where(note_files.c.note_id != exclude_note_id)
        )
        result = self.db.execute(query)
        return result.first() is not None

    def get_orphaned_files(self) -> List[File]:
        """Get files not attached to any note and not used as cover."""
        # Files not in note_files table and not used as cover
        query = (
            select(File)
            .outerjoin(note_files, File.id == note_files.c.file_id)
            .where(note_files.c.file_id.is_(None))
            .where(~File.id.in_(
                select(Note.cover_file_id).where(Note.cover_file_id.is_not(None))
            ))
        )
        result = self.db.execute(query)
        return list(result.scalars().all())

    def create_with_data(
        self,
        original_name: str,
        data: bytes,
        prefix: str = "attachments",
    ) -> File:
        """Create a file record and upload data to MinIO."""
        minio_client = get_minio_client()

        # Detect mime type
        mime_type, _ = mimetypes.guess_type(original_name)
        if not mime_type:
            mime_type = "application/octet-stream"

        # Generate storage key
        stored_key = minio_client.generate_key(prefix, original_name)

        # Upload to MinIO
        minio_client.upload_bytes(data, stored_key, mime_type)

        # Create file record
        return self.create(
            original_name=original_name,
            stored_key=stored_key,
            mime_type=mime_type,
            size_bytes=len(data),
        )
