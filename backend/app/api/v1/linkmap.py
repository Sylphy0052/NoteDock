from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.services.linkmap_service import LinkmapService


router = APIRouter()


class LinkNode(BaseModel):
    id: int
    title: str
    is_pinned: bool = False
    tag_ids: List[int] = []
    folder_id: Optional[int] = None


class LinkEdge(BaseModel):
    from_note_id: int
    to_note_id: int


class LinkmapResponse(BaseModel):
    nodes: List[LinkNode]
    edges: List[LinkEdge]


def get_linkmap_service(db: Session = Depends(get_db)) -> LinkmapService:
    return LinkmapService(db)


@router.get("/linkmap", response_model=LinkmapResponse)
def get_full_linkmap(
    service: LinkmapService = Depends(get_linkmap_service),
) -> LinkmapResponse:
    """全体リンクマップを取得"""
    graph = service.get_full_linkmap()
    return LinkmapResponse(
        nodes=[
            LinkNode(
                id=n.id,
                title=n.title,
                is_pinned=n.is_pinned,
                tag_ids=n.tag_ids,
                folder_id=n.folder_id
            )
            for n in graph.nodes
        ],
        edges=[LinkEdge(from_note_id=e.from_id, to_note_id=e.to_id) for e in graph.edges],
    )


@router.get("/linkmap/{note_id}", response_model=LinkmapResponse)
def get_neighborhood_linkmap(
    note_id: int,
    depth: int = Query(2, ge=1, le=3, description="探索する深さ"),
    service: LinkmapService = Depends(get_linkmap_service),
) -> LinkmapResponse:
    """特定ノートの近傍リンクマップを取得"""
    graph = service.get_neighborhood_linkmap(note_id, depth=depth)
    return LinkmapResponse(
        nodes=[
            LinkNode(
                id=n.id,
                title=n.title,
                is_pinned=n.is_pinned,
                tag_ids=n.tag_ids,
                folder_id=n.folder_id
            )
            for n in graph.nodes
        ],
        edges=[LinkEdge(from_note_id=e.from_id, to_note_id=e.to_id) for e in graph.edges],
    )
