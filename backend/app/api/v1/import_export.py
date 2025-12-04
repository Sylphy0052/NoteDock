"""Import/Export API endpoints."""

from fastapi import APIRouter, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.services.import_export_service import ImportExportService


router = APIRouter()


def get_import_export_service(db: Session = Depends(get_db)) -> ImportExportService:
    return ImportExportService(db)


class ImportResult(BaseModel):
    """Import result response."""

    imported_notes: int
    imported_files: int
    errors: List[str]


@router.get("/export")
def export_notes(
    note_ids: Optional[str] = Query(
        None,
        description="Comma-separated note IDs to export. If not specified, exports all notes.",
    ),
    service: ImportExportService = Depends(get_import_export_service),
) -> StreamingResponse:
    """
    Export notes as a ZIP file.

    If note_ids is specified, only exports those notes.
    Otherwise, exports all non-deleted notes.
    """
    # Parse note IDs if provided
    ids_list: Optional[List[int]] = None
    if note_ids:
        ids_list = [int(id.strip()) for id in note_ids.split(",") if id.strip()]

    # Generate ZIP
    zip_buffer = service.export_notes(note_ids=ids_list)

    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"notedock_export_{timestamp}.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.post("/import", response_model=ImportResult)
def import_notes(
    file: UploadFile = File(..., description="ZIP file to import"),
    service: ImportExportService = Depends(get_import_export_service),
) -> ImportResult:
    """
    Import notes from a ZIP file.

    The ZIP file should contain:
    - Markdown files (.md) for notes
    - Optional manifest.json with metadata
    - Optional attachments/ directories with files
    """
    result = service.import_notes(file.file)
    return ImportResult(
        imported_notes=result["imported_notes"],
        imported_files=result["imported_files"],
        errors=result["errors"],
    )
