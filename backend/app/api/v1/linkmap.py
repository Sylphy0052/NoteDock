from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.db.session import get_db
from app.services.linkmap_service import LinkmapService


router = APIRouter()


class LinkNode(BaseModel):
    id: int
    title: str
    is_pinned: bool = False


class LinkEdge(BaseModel):
    from_id: int = None
    to_id: int = None

    # Alias for JSON output
    class Config:
        populate_by_name = True

    def model_dump(self, **kwargs):
        d = super().model_dump(**kwargs)
        # Rename to match spec (from/to)
        return {"from": d["from_id"], "to": d["to_id"]}


class LinkmapResponse(BaseModel):
    nodes: List[LinkNode]
    edges: List[dict]  # Using dict to allow "from" key


def get_linkmap_service(db: Session = Depends(get_db)) -> LinkmapService:
    return LinkmapService(db)


@router.get("/linkmap", response_model=LinkmapResponse)
def get_full_linkmap(
    service: LinkmapService = Depends(get_linkmap_service),
) -> LinkmapResponse:
    """全体リンクマップを取得"""
    graph = service.get_full_linkmap()
    return LinkmapResponse(
        nodes=[LinkNode(id=n.id, title=n.title, is_pinned=n.is_pinned) for n in graph.nodes],
        edges=[{"from": e.from_id, "to": e.to_id} for e in graph.edges],
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
        nodes=[LinkNode(id=n.id, title=n.title, is_pinned=n.is_pinned) for n in graph.nodes],
        edges=[{"from": e.from_id, "to": e.to_id} for e in graph.edges],
    )
