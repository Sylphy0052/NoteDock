from sqlalchemy.orm import Session
from fastapi import UploadFile
from typing import Optional, List, BinaryIO
import mimetypes

from app.models import File, Note
from app.repositories.file_repo import FileRepository
from app.repositories.note_repo import NoteRepository
from app.utils.s3 import get_minio_client, MinIOClient
from app.core.errors import NotFoundError, ValidationError


# Allowed file types
ALLOWED_EXTENSIONS = {
    # Images
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico",
    # Documents
    ".pdf",
    ".doc", ".docx",  # Word
    ".xls", ".xlsx",  # Excel
    ".ppt", ".pptx",  # PowerPoint
    # Text
    ".txt", ".md", ".json", ".csv",
}

# Max attachments per note
MAX_ATTACHMENTS_PER_NOTE = 50


class FileService:
    """Service for file operations."""

    def __init__(self, db: Session):
        self.db = db
        self.file_repo = FileRepository(db)
        self.note_repo = NoteRepository(db)
        self.minio: MinIOClient = get_minio_client()

    def get_file(self, file_id: int) -> File:
        """Get a file by ID."""
        file = self.file_repo.get_by_id(file_id)
        if not file:
            raise NotFoundError("ファイル", file_id)
        return file

    def list_files(
        self,
        search: Optional[str] = None,
        mime_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[List[File], int]:
        """List all files with pagination and filtering."""
        return self.file_repo.get_all(
            search=search, mime_type=mime_type, page=page, page_size=page_size
        )

    def upload_file(
        self,
        upload_file: UploadFile,
        note_id: Optional[int] = None,
        is_cover: bool = False,
    ) -> File:
        """Upload a file and optionally attach to a note."""
        # Validate file
        self._validate_file(upload_file)

        # Get file info
        original_name = upload_file.filename or "unknown"
        content_type = upload_file.content_type or self._guess_content_type(original_name)

        # Read file content
        content = upload_file.file.read()
        size = len(content)

        # Generate storage key
        prefix = "covers" if is_cover else "attachments"
        if note_id:
            prefix = f"{prefix}/{note_id}"
        key = self.minio.generate_key(prefix, original_name)

        # Upload to MinIO
        from io import BytesIO
        self.minio.upload_file(BytesIO(content), key, content_type, size)

        # Create file record
        file = self.file_repo.create(
            original_name=original_name,
            stored_key=key,
            mime_type=content_type,
            size_bytes=size,
        )

        # Attach to note if specified
        if note_id:
            note = self.note_repo.get_by_id(note_id)
            if not note:
                raise NotFoundError("ノート", note_id)

            if is_cover:
                note.cover_file_id = file.id
                self.db.commit()
            else:
                # Check attachment limit
                if len(note.files) >= MAX_ATTACHMENTS_PER_NOTE:
                    raise ValidationError(
                        f"添付ファイルは{MAX_ATTACHMENTS_PER_NOTE}件までです"
                    )
                self.file_repo.attach_to_note(file, note)

        return file

    def download_file(self, file_id: int) -> tuple[bytes, str, str]:
        """Download a file. Returns (content, filename, content_type)."""
        file = self.get_file(file_id)
        content = self.minio.download_file(file.stored_key)
        return content, file.original_name, file.mime_type

    def get_file_stream(self, file_id: int) -> tuple[BinaryIO, str, str]:
        """Get file stream for streaming response."""
        file = self.get_file(file_id)
        stream = self.minio.get_file_stream(file.stored_key)
        return stream, file.original_name, file.mime_type

    def delete_file(self, file_id: int, note_id: Optional[int] = None) -> None:
        """Delete a file."""
        file = self.get_file(file_id)

        # If note_id is specified, just detach from that note
        if note_id:
            note = self.note_repo.get_by_id(note_id)
            if note:
                # Remove from attachments
                self.file_repo.detach_from_note(file, note)

                # Remove as cover if applicable
                if note.cover_file_id == file_id:
                    note.cover_file_id = None
                    self.db.commit()

                # Only delete file if not referenced by other notes
                if not self.file_repo.is_referenced_by_other_notes(file, note_id):
                    self._delete_file_completely(file)
        else:
            # Delete file completely
            self._delete_file_completely(file)

    def _delete_file_completely(self, file: File) -> None:
        """Delete file from storage and database."""
        # Delete from MinIO
        try:
            self.minio.delete_file(file.stored_key)
        except Exception:
            pass  # File might not exist in storage

        # Delete from database
        self.file_repo.delete(file)

    def get_files_for_note(self, note_id: int) -> List[File]:
        """Get all files attached to a note."""
        return self.file_repo.get_files_for_note(note_id)

    def attach_file_to_note(self, file_id: int, note_id: int) -> None:
        """Attach an existing file to a note."""
        file = self.get_file(file_id)
        note = self.note_repo.get_by_id(note_id)
        if not note:
            raise NotFoundError("ノートが見つかりません")

        # Check if already attached
        if file in note.files:
            return  # Already attached, no-op

        # Check attachment limit
        if len(note.files) >= MAX_ATTACHMENTS_PER_NOTE:
            raise ValidationError(
                f"添付ファイルは{MAX_ATTACHMENTS_PER_NOTE}件までです"
            )

        self.file_repo.attach_to_note(file, note)

    def detach_file_from_note(self, file_id: int, note_id: int) -> None:
        """Detach a file from a note."""
        file = self.get_file(file_id)
        note = self.note_repo.get_by_id(note_id)
        if not note:
            raise NotFoundError("ノートが見つかりません")

        self.file_repo.detach_from_note(file, note)

    def get_file_url(self, file: File) -> str:
        """Get the download URL for a file."""
        return f"/api/files/{file.id}"

    def get_preview_url(self, file: File) -> Optional[str]:
        """Get the preview URL for a file (images and PDFs)."""
        if self._is_previewable(file.mime_type):
            return f"/api/files/{file.id}/preview"
        return None

    def _validate_file(self, upload_file: UploadFile) -> None:
        """Validate uploaded file."""
        if not upload_file.filename:
            raise ValidationError("ファイル名が必要です")

        ext = self._get_extension(upload_file.filename)
        if ext not in ALLOWED_EXTENSIONS:
            raise ValidationError(
                f"対応していないファイル形式です。対応形式: {', '.join(ALLOWED_EXTENSIONS)}"
            )

    def _get_extension(self, filename: str) -> str:
        """Get lowercase file extension."""
        if "." in filename:
            return "." + filename.rsplit(".", 1)[-1].lower()
        return ""

    def _guess_content_type(self, filename: str) -> str:
        """Guess content type from filename."""
        content_type, _ = mimetypes.guess_type(filename)
        return content_type or "application/octet-stream"

    def _is_previewable(self, mime_type: str) -> bool:
        """Check if file type is previewable."""
        return mime_type.startswith("image/") or mime_type == "application/pdf"
