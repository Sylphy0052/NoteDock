"""API endpoints for note drafts."""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.draft_service import DraftService
from app.schemas.draft import DraftSave, DraftResponse, DraftCheckResponse
from app.schemas.common import MessageResponse


router = APIRouter()


def get_draft_service(db: Session = Depends(get_db)) -> DraftService:
    return DraftService(db)


@router.get("/drafts", response_model=DraftCheckResponse)
def check_draft(
    session_id: str = Query(..., description="セッションID"),
    note_id: Optional[int] = Query(None, description="ノートID（既存ノートの場合）"),
    service: DraftService = Depends(get_draft_service),
) -> DraftCheckResponse:
    """ドラフトの存在を確認"""
    draft = service.get_draft(session_id, note_id)
    return DraftCheckResponse(
        has_draft=draft is not None,
        draft=draft,
    )


@router.get("/drafts/note/{note_id}", response_model=DraftCheckResponse)
def check_draft_by_note(
    note_id: int,
    service: DraftService = Depends(get_draft_service),
) -> DraftCheckResponse:
    """ノートIDでドラフトを確認"""
    draft = service.get_draft_by_note_id(note_id)
    return DraftCheckResponse(
        has_draft=draft is not None,
        draft=draft,
    )


@router.post("/drafts", response_model=DraftResponse)
def save_draft(
    data: DraftSave,
    service: DraftService = Depends(get_draft_service),
) -> DraftResponse:
    """ドラフトを保存"""
    return service.save_draft(data)


@router.delete("/drafts", response_model=MessageResponse)
def delete_draft(
    session_id: str = Query(..., description="セッションID"),
    note_id: Optional[int] = Query(None, description="ノートID（既存ノートの場合）"),
    service: DraftService = Depends(get_draft_service),
) -> MessageResponse:
    """ドラフトを削除"""
    deleted = service.delete_draft(session_id, note_id)
    if deleted:
        return MessageResponse(message="ドラフトを削除しました")
    return MessageResponse(message="削除するドラフトがありません")


@router.delete("/drafts/note/{note_id}", response_model=MessageResponse)
def delete_draft_by_note(
    note_id: int,
    service: DraftService = Depends(get_draft_service),
) -> MessageResponse:
    """ノートIDでドラフトを削除（ノート保存時に呼ばれる）"""
    deleted = service.delete_draft_by_note_id(note_id)
    if deleted:
        return MessageResponse(message="ドラフトを削除しました")
    return MessageResponse(message="削除するドラフトがありません")
