from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Any, List

from app.db.session import get_db
from app.services.comment_service import CommentService
from app.services.discord_service import get_discord_service
from app.repositories.note_repo import NoteRepository
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse
from app.schemas.common import MessageResponse


router = APIRouter()


def get_comment_service(db: Session = Depends(get_db)) -> CommentService:
    return CommentService(db)


def comment_to_response(comment: Any) -> CommentResponse:
    """Convert Comment model to response schema with nested replies."""
    return CommentResponse(
        id=comment.id,
        note_id=comment.note_id,
        parent_id=comment.parent_id,
        display_name=comment.display_name,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=[comment_to_response(reply) for reply in comment.replies],
    )


@router.get("/notes/{note_id}/comments", response_model=List[CommentResponse])
def get_comments(
    note_id: int,
    service: CommentService = Depends(get_comment_service),
) -> List[CommentResponse]:
    """ノートのコメント一覧を取得（スレッド構造）"""
    comments = service.get_comments_for_note(note_id)
    return [comment_to_response(c) for c in comments]


@router.post("/notes/{note_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    note_id: int,
    data: CommentCreate,
    background_tasks: BackgroundTasks,
    service: CommentService = Depends(get_comment_service),
    db: Session = Depends(get_db),
) -> CommentResponse:
    """コメントを投稿"""
    comment = service.create_comment(note_id, data)

    # Get note title for Discord notification
    note_repo = NoteRepository(db)
    note = note_repo.get_by_id(note_id)
    note_title = note.title if note else "不明なノート"

    # Discord notification (background task)
    discord_service = get_discord_service()

    async def send_notification() -> None:
        await discord_service.notify_comment_posted(
            note_id=note_id,
            note_title=note_title,
            display_name=comment.display_name,
            comment_preview=comment.content,
        )

    background_tasks.add_task(send_notification)

    return comment_to_response(comment)


@router.put("/comments/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    data: CommentUpdate,
    service: CommentService = Depends(get_comment_service),
) -> CommentResponse:
    """コメントを編集"""
    comment = service.update_comment(comment_id, data)
    return comment_to_response(comment)


@router.delete("/comments/{comment_id}", response_model=MessageResponse)
def delete_comment(
    comment_id: int,
    service: CommentService = Depends(get_comment_service),
) -> MessageResponse:
    """コメントを削除"""
    service.delete_comment(comment_id)
    return MessageResponse(message="コメントを削除しました")
