from fastapi import APIRouter, Depends, UploadFile, File, Query, Request
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from typing import Any, Optional

from app.db.session import get_db
from app.services.file_service import FileService
from app.services.activity_log_service import ActivityLogService
from app.schemas.file import FileUploadResponse
from app.schemas.common import MessageResponse


router = APIRouter()


def get_file_service(db: Session = Depends(get_db)) -> FileService:
    return FileService(db)


def get_activity_log_service(db: Session = Depends(get_db)) -> ActivityLogService:
    return ActivityLogService(db)


def get_client_ip(request: Request) -> str:
    """Get client IP address from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def file_to_response(file: Any, service: FileService) -> FileUploadResponse:
    """Convert File model to response schema."""
    return FileUploadResponse(
        id=file.id,
        original_name=file.original_name,
        mime_type=file.mime_type,
        size_bytes=file.size_bytes,
        url=service.get_file_url(file),
        preview_url=service.get_preview_url(file),
    )


@router.post("/files", response_model=FileUploadResponse, status_code=201)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    note_id: Optional[int] = Query(None, description="紐付けるノートID"),
    is_cover: bool = Query(False, description="カバー画像として設定"),
    service: FileService = Depends(get_file_service),
    log_service: ActivityLogService = Depends(get_activity_log_service),
) -> FileUploadResponse:
    """ファイルをアップロード"""
    uploaded_file = service.upload_file(file, note_id=note_id, is_cover=is_cover)

    # Log activity
    log_service.log_file_uploaded(
        file_id=uploaded_file.id,
        note_id=note_id,
        ip_address=get_client_ip(request),
    )

    return file_to_response(uploaded_file, service)


@router.get("/files/{file_id}")
async def download_file(
    file_id: int,
    service: FileService = Depends(get_file_service),
) -> Response:
    """ファイルをダウンロード"""
    content, filename, content_type = service.download_file(file_id)

    # Encode filename for Content-Disposition header
    encoded_filename = filename.encode("utf-8").decode("latin-1", errors="replace")

    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{encoded_filename}"',
            "Content-Length": str(len(content)),
        },
    )


@router.get("/files/{file_id}/preview")
async def preview_file(
    file_id: int,
    service: FileService = Depends(get_file_service),
) -> Response:
    """ファイルをプレビュー表示用に取得（画像・PDF）"""
    content, filename, content_type = service.download_file(file_id)

    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "public, max-age=86400",  # 1 day cache
        },
    )


@router.delete("/files/{file_id}", response_model=MessageResponse)
async def delete_file(
    file_id: int,
    request: Request,
    note_id: Optional[int] = Query(None, description="ノートからの紐付けを解除"),
    service: FileService = Depends(get_file_service),
    log_service: ActivityLogService = Depends(get_activity_log_service),
) -> MessageResponse:
    """ファイルを削除"""
    service.delete_file(file_id, note_id=note_id)

    # Log activity
    log_service.log_file_deleted(
        file_id=file_id,
        note_id=note_id,
        ip_address=get_client_ip(request),
    )

    return MessageResponse(message="ファイルを削除しました")
