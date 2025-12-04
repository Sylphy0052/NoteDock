from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.db.session import get_db
from app.repositories.tag_repo import TagRepository


router = APIRouter()


class TagResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


def get_tag_repo(db: Session = Depends(get_db)) -> TagRepository:
    return TagRepository(db)


@router.get("/tags", response_model=List[TagResponse])
def get_tags(
    repo: TagRepository = Depends(get_tag_repo),
) -> List[TagResponse]:
    """タグ一覧を取得"""
    tags = repo.get_all()
    return [TagResponse.model_validate(tag) for tag in tags]


@router.get("/tags/suggest", response_model=List[TagResponse])
def suggest_tags(
    q: str = Query(..., min_length=1, description="検索キーワード"),
    limit: int = Query(10, ge=1, le=50),
    repo: TagRepository = Depends(get_tag_repo),
) -> List[TagResponse]:
    """タグをサジェスト"""
    tags = repo.suggest(q, limit=limit)
    return [TagResponse.model_validate(tag) for tag in tags]
