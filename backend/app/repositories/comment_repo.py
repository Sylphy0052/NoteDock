from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional, List

from app.models import Comment


class CommentRepository:
    """Repository for Comment database operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, comment_id: int) -> Optional[Comment]:
        """Get a comment by ID."""
        return self.db.get(Comment, comment_id)

    def get_by_note(self, note_id: int) -> List[Comment]:
        """Get all top-level comments for a note."""
        query = (
            select(Comment)
            .where(Comment.note_id == note_id)
            .where(Comment.parent_id.is_(None))
            .order_by(Comment.created_at.asc())
        )
        result = self.db.execute(query)
        return list(result.scalars().all())

    def create(
        self,
        note_id: int,
        content: str,
        display_name: str,
        parent_id: Optional[int] = None,
    ) -> Comment:
        """Create a new comment."""
        comment = Comment(
            note_id=note_id,
            content=content,
            display_name=display_name,
            parent_id=parent_id,
        )
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def update(self, comment: Comment, content: str) -> Comment:
        """Update a comment's content."""
        from app.db.base import now_jst
        comment.content = content
        comment.updated_at = now_jst()
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def delete(self, comment: Comment) -> None:
        """Delete a comment (cascade deletes replies)."""
        self.db.delete(comment)
        self.db.commit()
