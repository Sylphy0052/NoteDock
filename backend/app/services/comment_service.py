from sqlalchemy.orm import Session
from typing import List

from app.models import Comment
from app.repositories.comment_repo import CommentRepository
from app.repositories.note_repo import NoteRepository
from app.schemas.comment import CommentCreate, CommentUpdate
from app.core.errors import NotFoundError, ValidationError


class CommentService:
    """Service for comment operations."""

    def __init__(self, db: Session):
        self.db = db
        self.comment_repo = CommentRepository(db)
        self.note_repo = NoteRepository(db)

    def get_comment(self, comment_id: int) -> Comment:
        """Get a comment by ID."""
        comment = self.comment_repo.get_by_id(comment_id)
        if not comment:
            raise NotFoundError("コメント", comment_id)
        return comment

    def get_comments_for_note(self, note_id: int) -> List[Comment]:
        """Get all comments for a note (threaded structure)."""
        # Verify note exists
        note = self.note_repo.get_by_id(note_id)
        if not note:
            raise NotFoundError("ノート", note_id)

        return self.comment_repo.get_by_note(note_id)

    def create_comment(self, note_id: int, data: CommentCreate) -> Comment:
        """Create a new comment on a note."""
        # Verify note exists
        note = self.note_repo.get_by_id(note_id)
        if not note:
            raise NotFoundError("ノート", note_id)

        # Verify parent comment exists if specified
        if data.parent_id:
            parent = self.comment_repo.get_by_id(data.parent_id)
            if not parent:
                raise NotFoundError("親コメント", data.parent_id)
            if parent.note_id != note_id:
                raise ValidationError("親コメントは同じノートに属している必要があります")

        return self.comment_repo.create(
            note_id=note_id,
            content=data.content,
            display_name=data.display_name,
            parent_id=data.parent_id,
        )

    def update_comment(self, comment_id: int, data: CommentUpdate) -> Comment:
        """Update a comment."""
        comment = self.get_comment(comment_id)
        return self.comment_repo.update(comment, content=data.content)

    def delete_comment(self, comment_id: int) -> None:
        """Delete a comment and its replies."""
        comment = self.get_comment(comment_id)
        self.comment_repo.delete(comment)
