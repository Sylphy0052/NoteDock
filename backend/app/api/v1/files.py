from fastapi import APIRouter, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.services.file_service import FileService
from app.schemas.file import FileUploadResponse
from app.schemas.common import MessageResponse


router = APIRouter()


def get_file_service(db: Session = Depends(get_db)) -> FileService:
    return FileService(db)


def file_to_response(file: any, service: FileService) -> FileUploadResponse:
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
    file: UploadFile = File(...),
    note_id: Optional[int] = Query(None, description="紐付けるノートID"),
    is_cover: bool = Query(False, description="カバー画像として設定"),
    service: FileService = Depends(get_file_service),
) -> FileUploadResponse:
    """ファイルをアップロード"""
    uploaded_file = service.upload_file(file, note_id=note_id, is_cover=is_cover)
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
    note_id: Optional[int] = Query(None, description="ノートからの紐付けを解除"),
    service: FileService = Depends(get_file_service),
) -> MessageResponse:
    """ファイルを削除"""
    service.delete_file(file_id, note_id=note_id)
    return MessageResponse(message="ファイルを削除しました")
