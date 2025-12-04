from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from app.db.session import get_db
from app.services.note_service import NoteService
from app.schemas.note import NoteSummary, NoteListResponse, TagResponse


router = APIRouter()


class QuickSearchResult(BaseModel):
    id: int
    title: str
    tags: List[str] = []


def get_note_service(db: Session = Depends(get_db)) -> NoteService:
    return NoteService(db)


@router.get("/search", response_model=NoteListResponse)
def search_notes(
    q: Optional[str] = Query(None, description="検索キーワード"),
    tag: Optional[str] = Query(None, description="タグでフィルタ"),
    folder_id: Optional[int] = Query(None, description="フォルダIDでフィルタ"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: NoteService = Depends(get_note_service),
) -> NoteListResponse:
    """ノートを検索（タイトル、本文、タグ対象）"""
    notes, total = service.get_notes(
        page=page,
        page_size=page_size,
        q=q,
        tag=tag,
        folder_id=folder_id,
    )
    return NoteListResponse(
        items=[
            NoteSummary(
                id=note.id,
                title=note.title,
                updated_at=note.updated_at,
                tags=[TagResponse(id=t.id, name=t.name) for t in note.tags],
                folder_id=note.folder_id,
                is_pinned=note.is_pinned,
                is_readonly=note.is_readonly,
                cover_file_url=f"/api/files/{note.cover_file_id}/preview" if note.cover_file_id else None,
            )
            for note in notes
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/search/quick", response_model=List[QuickSearchResult])
def quick_search(
    q: str = Query(..., min_length=1, description="検索キーワード"),
    limit: int = Query(10, ge=1, le=50),
    service: NoteService = Depends(get_note_service),
) -> List[QuickSearchResult]:
    """クイックオープン用の軽量検索（タイトル + タグのみ）"""
    notes, _ = service.get_notes(page=1, page_size=limit, q=q)
    return [
        QuickSearchResult(
            id=note.id,
            title=note.title,
            tags=[t.name for t in note.tags],
        )
        for note in notes
    ]
