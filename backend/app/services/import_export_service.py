"""Import/Export service for notes."""

import io
import json
import zipfile
from datetime import datetime
from typing import Any, BinaryIO, Optional

from sqlalchemy.orm import Session

from app.models import Note, Folder, Tag, File
from app.repositories.note_repo import NoteRepository
from app.repositories.folder_repo import FolderRepository
from app.repositories.tag_repo import TagRepository
from app.repositories.file_repo import FileRepository
from app.utils.s3 import get_minio_client
from app.core.logging import log_info, log_warning, log_error
from app.db.base import now_jst


class ImportExportService:
    """Service for importing and exporting notes."""

    def __init__(self, db: Session):
        self.db = db
        self.note_repo = NoteRepository(db)
        self.folder_repo = FolderRepository(db)
        self.tag_repo = TagRepository(db)
        self.file_repo = FileRepository(db)
        self.minio_client = get_minio_client()

    def export_notes(
        self,
        note_ids: Optional[list[int]] = None,
    ) -> io.BytesIO:
        """
        Export notes as a ZIP file.

        Args:
            note_ids: Optional list of specific note IDs to export.
                     If None, exports all non-deleted notes.

        Returns:
            BytesIO containing the ZIP file.
        """
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            # Get notes to export
            if note_ids:
                notes = [
                    self.note_repo.get_by_id(nid)
                    for nid in note_ids
                    if self.note_repo.get_by_id(nid) is not None
                ]
            else:
                notes, _ = self.note_repo.get_list(
                    page=1,
                    page_size=10000,  # Get all notes
                    include_deleted=False,
                )

            # Create manifest
            manifest: dict[str, Any] = {
                "version": "1.0",
                "exported_at": now_jst().isoformat(),
                "notes_count": len(notes),
                "notes": [],
            }

            for note in notes:
                # Build folder path
                folder_path = self._get_folder_path(note.folder) if note.folder else ""
                safe_title = self._sanitize_filename(note.title)

                # Note directory in ZIP
                note_dir = f"{folder_path}/{safe_title}" if folder_path else safe_title
                note_dir = note_dir.lstrip("/")

                # Write markdown file
                md_filename = f"{note_dir}/{safe_title}.md"
                md_content = self._build_markdown_content(note)
                zip_file.writestr(md_filename, md_content.encode("utf-8"))

                # Export attached files
                attachments: list[dict[str, str]] = []
                for file in note.files:
                    try:
                        file_data = self.minio_client.download_file(file.stored_key)
                        if file_data:
                            attachment_path = f"{note_dir}/attachments/{file.original_name}"
                            zip_file.writestr(attachment_path, file_data)
                            attachments.append({
                                "original_name": file.original_name,
                                "mime_type": file.mime_type,
                            })
                    except Exception as e:
                        log_warning(f"Failed to export attachment {file.id}: {e}")

                # Add note to manifest
                manifest["notes"].append({
                    "id": note.id,
                    "title": note.title,
                    "folder_path": folder_path,
                    "tags": [tag.name for tag in note.tags],
                    "is_pinned": note.is_pinned,
                    "is_readonly": note.is_readonly,
                    "created_at": note.created_at.isoformat(),
                    "updated_at": note.updated_at.isoformat(),
                    "attachments": attachments,
                })

            # Write manifest
            zip_file.writestr(
                "manifest.json",
                json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8"),
            )

        zip_buffer.seek(0)
        log_info(f"Exported {len(notes)} notes")
        return zip_buffer

    def import_notes(
        self,
        zip_file: BinaryIO,
    ) -> dict[str, Any]:
        """
        Import notes from a ZIP file.

        Args:
            zip_file: ZIP file to import.

        Returns:
            Import result with counts.
        """
        result = {
            "imported_notes": 0,
            "imported_files": 0,
            "errors": [],
        }

        try:
            with zipfile.ZipFile(zip_file, "r") as zf:
                # Read manifest if exists
                manifest = None
                if "manifest.json" in zf.namelist():
                    manifest_data = zf.read("manifest.json")
                    manifest = json.loads(manifest_data.decode("utf-8"))

                # Find all markdown files
                md_files = [
                    name for name in zf.namelist()
                    if name.endswith(".md") and not name.startswith("__MACOSX")
                ]

                for md_path in md_files:
                    try:
                        note_result = self._import_single_note(zf, md_path, manifest)
                        if note_result["success"]:
                            result["imported_notes"] += 1
                            result["imported_files"] += note_result.get("files_count", 0)
                        else:
                            result["errors"].append(note_result["error"])
                    except Exception as e:
                        result["errors"].append(f"Failed to import {md_path}: {str(e)}")
                        log_error(f"Import error for {md_path}: {e}")

        except zipfile.BadZipFile:
            result["errors"].append("Invalid ZIP file")
            log_error("Invalid ZIP file for import")

        log_info(
            f"Import completed: {result['imported_notes']} notes, "
            f"{result['imported_files']} files, {len(result['errors'])} errors"
        )
        return result

    def _import_single_note(
        self,
        zf: zipfile.ZipFile,
        md_path: str,
        manifest: Optional[dict],
    ) -> dict[str, Any]:
        """Import a single note from the ZIP."""
        # Read markdown content
        md_content = zf.read(md_path).decode("utf-8")

        # Extract title and content
        title, content_md = self._parse_markdown_content(md_content)
        if not title:
            title = md_path.rsplit("/", 1)[-1].replace(".md", "")

        # Determine folder from path
        folder_path = "/".join(md_path.split("/")[:-1])
        folder = self._get_or_create_folder_from_path(folder_path) if folder_path else None

        # Get metadata from manifest
        tags: list[str] = []
        is_pinned = False
        is_readonly = False

        if manifest:
            for note_info in manifest.get("notes", []):
                if note_info.get("title") == title:
                    tags = note_info.get("tags", [])
                    is_pinned = note_info.get("is_pinned", False)
                    is_readonly = note_info.get("is_readonly", False)
                    break

        # Get or create tags
        tag_objects = self.tag_repo.get_or_create_many(tags)

        # Create note
        note = self.note_repo.create(
            title=title,
            content_md=content_md,
            folder_id=folder.id if folder else None,
            is_pinned=is_pinned,
            is_readonly=is_readonly,
            tags=tag_objects,
        )

        # Import attachments
        files_count = 0
        note_dir = md_path.rsplit("/", 1)[0] if "/" in md_path else ""
        attachments_dir = f"{note_dir}/attachments/" if note_dir else "attachments/"

        for name in zf.namelist():
            if name.startswith(attachments_dir) and not name.endswith("/"):
                try:
                    file_data = zf.read(name)
                    original_name = name.rsplit("/", 1)[-1]

                    # Upload to MinIO
                    file = self.file_repo.create_with_data(
                        original_name=original_name,
                        data=file_data,
                        prefix=f"attachments/{note.id}",
                    )

                    # Link to note
                    note.files.append(file)
                    files_count += 1
                except Exception as e:
                    log_warning(f"Failed to import attachment {name}: {e}")

        self.db.commit()

        return {
            "success": True,
            "note_id": note.id,
            "files_count": files_count,
        }

    def _get_folder_path(self, folder: Folder) -> str:
        """Get the full path of a folder."""
        path_parts = []
        current = folder
        while current:
            path_parts.insert(0, self._sanitize_filename(current.name))
            current = current.parent
        return "/".join(path_parts)

    def _get_or_create_folder_from_path(self, path: str) -> Optional[Folder]:
        """Get or create folders from a path string."""
        if not path or path == ".":
            return None

        parts = [p for p in path.split("/") if p and p != "attachments"]
        if not parts:
            return None

        # Limit to 3 levels
        parts = parts[:3]

        parent: Optional[Folder] = None
        for part in parts:
            folder = self.folder_repo.get_by_name_and_parent(part, parent.id if parent else None)
            if not folder:
                folder = self.folder_repo.create(name=part, parent_id=parent.id if parent else None)
            parent = folder

        return parent

    def _sanitize_filename(self, name: str) -> str:
        """Sanitize a filename for safe file system use."""
        # Remove/replace problematic characters
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            name = name.replace(char, "_")
        return name.strip()[:100]  # Limit length

    def _build_markdown_content(self, note: Note) -> str:
        """Build markdown content with frontmatter."""
        lines = [
            "---",
            f"title: {note.title}",
            f"tags: [{', '.join(tag.name for tag in note.tags)}]",
            f"created_at: {note.created_at.isoformat()}",
            f"updated_at: {note.updated_at.isoformat()}",
            f"is_pinned: {str(note.is_pinned).lower()}",
            f"is_readonly: {str(note.is_readonly).lower()}",
            "---",
            "",
            note.content_md or "",
        ]
        return "\n".join(lines)

    def _parse_markdown_content(self, content: str) -> tuple[Optional[str], str]:
        """Parse markdown content, extracting title from frontmatter if present."""
        title = None
        body = content

        # Check for frontmatter
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                frontmatter = parts[1].strip()
                body = parts[2].strip()

                # Extract title from frontmatter
                for line in frontmatter.split("\n"):
                    if line.startswith("title:"):
                        title = line.replace("title:", "").strip()
                        break

        return title, body
