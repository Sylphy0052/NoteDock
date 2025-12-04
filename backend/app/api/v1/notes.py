from datetime import datetime
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Any, Optional, List

from app.db.session import get_db
from app.services.note_service import NoteService
from app.services.discord_service import get_discord_service
from app.schemas.note import (
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    NoteSummary,
    NoteListResponse,
    NotePinUpdate,
    NoteReadonlyUpdate,
    NoteSummaryHover,
    TagResponse,
    FolderResponse,
    FileResponse,
)
from app.schemas.common import MessageResponse
from app.utils.markdown import extract_toc, generate_summary
from pydantic import BaseModel


router = APIRouter()


def get_note_service(db: Session = Depends(get_db)) -> NoteService:
    return NoteService(db)


def note_to_summary(note: Any) -> NoteSummary:
    """Convert Note model to NoteSummary schema."""
    return NoteSummary(
        id=note.id,
        title=note.title,
        updated_at=note.updated_at,
        tags=[TagResponse(id=t.id, name=t.name) for t in note.tags],
        folder_id=note.folder_id,
        is_pinned=note.is_pinned,
        is_readonly=note.is_readonly,
        cover_file_url=f"/api/files/{note.cover_file_id}/preview" if note.cover_file_id else None,
    )


def note_to_response(note: Any) -> NoteResponse:
    """Convert Note model to NoteResponse schema."""
    return NoteResponse(
        id=note.id,
        title=note.title,
        content_md=note.content_md,
        folder_id=note.folder_id,
        folder=FolderResponse(
            id=note.folder.id,
            name=note.folder.name,
            parent_id=note.folder.parent_id
        ) if note.folder else None,
        is_pinned=note.is_pinned,
        is_readonly=note.is_readonly,
        cover_file_id=note.cover_file_id,
        cover_file_url=f"/api/files/{note.cover_file_id}/preview" if note.cover_file_id else None,
        created_at=note.created_at,
        updated_at=note.updated_at,
        deleted_at=note.deleted_at,
        tags=[TagResponse(id=t.id, name=t.name) for t in note.tags],
        files=[
            FileResponse(
                id=f.id,
                original_name=f.original_name,
                mime_type=f.mime_type,
                size_bytes=f.size_bytes
            ) for f in note.files
        ],
    )


@router.get("/notes", response_model=NoteListResponse)
def get_notes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="検索キーワード"),
    tag: Optional[str] = Query(None, description="タグでフィルタ"),
    folder_id: Optional[int] = Query(None, description="フォルダIDでフィルタ"),
    is_pinned: Optional[bool] = Query(None, description="ピン留め状態でフィルタ"),
    service: NoteService = Depends(get_note_service),
) -> NoteListResponse:
    """ノート一覧を取得"""
    notes, total = service.get_notes(
        page=page,
        page_size=page_size,
        q=q,
        tag=tag,
        folder_id=folder_id,
        is_pinned=is_pinned,
    )
    return NoteListResponse(
        items=[note_to_summary(note) for note in notes],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/notes/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """ノート詳細を取得"""
    note = service.get_note(note_id)
    return note_to_response(note)


@router.post("/notes", response_model=NoteResponse, status_code=201)
async def create_note(
    data: NoteCreate,
    background_tasks: BackgroundTasks,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """ノートを作成"""
    note = service.create_note(data)

    # Discord notification (background task)
    discord_service = get_discord_service()

    async def send_notification() -> None:
        await discord_service.notify_note_created(note.id, note.title)

    background_tasks.add_task(send_notification)

    return note_to_response(note)


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    data: NoteUpdate,
    background_tasks: BackgroundTasks,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """ノートを更新"""
    note = service.update_note(note_id, data)

    # Discord notification (background task)
    discord_service = get_discord_service()

    async def send_notification() -> None:
        await discord_service.notify_note_updated(note.id, note.title)

    background_tasks.add_task(send_notification)

    return note_to_response(note)


@router.delete("/notes/{note_id}", response_model=MessageResponse)
def delete_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> MessageResponse:
    """ノートをゴミ箱に移動"""
    service.delete_note(note_id)
    return MessageResponse(message="ノートをゴミ箱に移動しました")


@router.post("/notes/{note_id}/restore", response_model=NoteResponse)
def restore_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """ノートをゴミ箱から復元"""
    note = service.restore_note(note_id)
    return note_to_response(note)


@router.delete("/notes/{note_id}/permanent", response_model=MessageResponse)
def permanent_delete_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> MessageResponse:
    """ノートを完全に削除"""
    service.hard_delete_note(note_id)
    return MessageResponse(message="ノートを完全に削除しました")


@router.post("/notes/{note_id}/duplicate", response_model=NoteResponse, status_code=201)
def duplicate_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """ノートを複製"""
    note = service.duplicate_note(note_id)
    return note_to_response(note)


@router.patch("/notes/{note_id}/pin", response_model=NoteResponse)
def toggle_note_pin(
    note_id: int,
    data: NotePinUpdate,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """ノートのピン留め状態を変更"""
    note = service.toggle_pin(note_id, data.is_pinned)
    return note_to_response(note)


@router.patch("/notes/{note_id}/readonly", response_model=NoteResponse)
def toggle_note_readonly(
    note_id: int,
    data: NoteReadonlyUpdate,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """ノートの閲覧専用状態を変更"""
    note = service.toggle_readonly(note_id, data.is_readonly)
    return note_to_response(note)


# Trash endpoints
@router.get("/trash", response_model=NoteListResponse)
def get_trash(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: NoteService = Depends(get_note_service),
) -> NoteListResponse:
    """ゴミ箱のノート一覧を取得"""
    notes, total = service.get_notes(
        page=page,
        page_size=page_size,
        include_deleted=True,
    )
    return NoteListResponse(
        items=[note_to_summary(note) for note in notes],
        total=total,
        page=page,
        page_size=page_size,
    )


# TOC & Summary endpoints
class TocItem(BaseModel):
    id: str
    text: str


@router.get("/notes/{note_id}/toc", response_model=List[TocItem])
def get_note_toc(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> List[TocItem]:
    """ノートの目次（h2見出し）を取得"""
    note = service.get_note(note_id)
    toc_items = extract_toc(note.content_md)
    return [TocItem(id=item.id, text=item.text) for item in toc_items]


@router.get("/notes/{note_id}/summary", response_model=NoteSummaryHover)
def get_note_summary(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> NoteSummaryHover:
    """ノートのサマリーを取得（ホバープレビュー用）"""
    note = service.get_note(note_id)
    summary = generate_summary(note.content_md)
    return NoteSummaryHover(
        id=note.id,
        title=note.title,
        summary=summary,
        updated_at=note.updated_at,
    )


# Version endpoints
class NoteVersionResponse(BaseModel):
    id: int
    version_no: int
    title: str
    content_md: str
    created_at: datetime

    class Config:
        from_attributes = True


class NoteVersionBrief(BaseModel):
    id: int
    version_no: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/notes/{note_id}/versions", response_model=List[NoteVersionBrief])
def get_note_versions(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> List[NoteVersionBrief]:
    """ノートのバージョン履歴を取得"""
    versions = service.get_versions(note_id)
    return [
        NoteVersionBrief(
            id=v.id,
            version_no=v.version_no,
            title=v.title,
            created_at=v.created_at,
        )
        for v in versions
    ]


@router.get("/notes/{note_id}/versions/{version_no}", response_model=NoteVersionResponse)
def get_note_version(
    note_id: int,
    version_no: int,
    service: NoteService = Depends(get_note_service),
) -> NoteVersionResponse:
    """特定バージョンの内容を取得"""
    version = service.get_version(note_id, version_no)
    return NoteVersionResponse(
        id=version.id,
        version_no=version.version_no,
        title=version.title,
        content_md=version.content_md,
        created_at=version.created_at,
    )


@router.post("/notes/{note_id}/versions/{version_no}/restore", response_model=NoteResponse)
def restore_note_version(
    note_id: int,
    version_no: int,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """特定バージョンに復元"""
    note = service.restore_version(note_id, version_no)
    return note_to_response(note)
