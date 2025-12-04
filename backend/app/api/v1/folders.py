from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.repositories.folder_repo import FolderRepository
from app.core.errors import NotFoundError, ValidationError
from app.schemas.common import MessageResponse


router = APIRouter()


class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[int] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    parent_id: Optional[int] = None


class FolderResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True


class FolderTreeItem(BaseModel):
    id: int
    name: str
    parent_id: Optional[int] = None
    children: List["FolderTreeItem"] = []

    class Config:
        from_attributes = True


FolderTreeItem.model_rebuild()


def get_folder_repo(db: Session = Depends(get_db)) -> FolderRepository:
    return FolderRepository(db)


def build_folder_tree(folders: list, parent_id: Optional[int] = None) -> List[FolderTreeItem]:
    """Build a tree structure from flat folder list."""
    tree = []
    for folder in folders:
        if folder.parent_id == parent_id:
            item = FolderTreeItem(
                id=folder.id,
                name=folder.name,
                parent_id=folder.parent_id,
                children=build_folder_tree(folders, folder.id)
            )
            tree.append(item)
    return tree


@router.get("/folders", response_model=List[FolderTreeItem])
def get_folders(
    repo: FolderRepository = Depends(get_folder_repo),
) -> List[FolderTreeItem]:
    """フォルダ一覧をツリー構造で取得"""
    folders = repo.get_all()
    return build_folder_tree(folders)


@router.get("/folders/{folder_id}", response_model=FolderResponse)
def get_folder(
    folder_id: int,
    repo: FolderRepository = Depends(get_folder_repo),
) -> FolderResponse:
    """フォルダ詳細を取得"""
    folder = repo.get_by_id(folder_id)
    if not folder:
        raise NotFoundError("フォルダ", folder_id)
    return FolderResponse.model_validate(folder)


@router.post("/folders", response_model=FolderResponse, status_code=201)
def create_folder(
    data: FolderCreate,
    repo: FolderRepository = Depends(get_folder_repo),
) -> FolderResponse:
    """フォルダを作成（最大3階層）"""
    if not repo.can_add_child(data.parent_id):
        raise ValidationError("フォルダは最大3階層までです")

    if data.parent_id is not None:
        parent = repo.get_by_id(data.parent_id)
        if not parent:
            raise NotFoundError("親フォルダ", data.parent_id)

    folder = repo.create(name=data.name, parent_id=data.parent_id)
    return FolderResponse.model_validate(folder)


@router.put("/folders/{folder_id}", response_model=FolderResponse)
def update_folder(
    folder_id: int,
    data: FolderUpdate,
    repo: FolderRepository = Depends(get_folder_repo),
) -> FolderResponse:
    """フォルダを更新"""
    folder = repo.get_by_id(folder_id)
    if not folder:
        raise NotFoundError("フォルダ", folder_id)

    if data.parent_id is not None:
        if data.parent_id == folder_id:
            raise ValidationError("フォルダは自身を親にできません")
        if not repo.can_add_child(data.parent_id):
            raise ValidationError("フォルダは最大3階層までです")

    folder = repo.update(folder, name=data.name, parent_id=data.parent_id)
    return FolderResponse.model_validate(folder)


@router.delete("/folders/{folder_id}", response_model=MessageResponse)
def delete_folder(
    folder_id: int,
    repo: FolderRepository = Depends(get_folder_repo),
) -> MessageResponse:
    """フォルダを削除（配下のフォルダも削除）"""
    folder = repo.get_by_id(folder_id)
    if not folder:
        raise NotFoundError("フォルダ", folder_id)

    repo.delete(folder)
    return MessageResponse(message="フォルダを削除しました")
