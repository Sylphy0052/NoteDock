from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, or_
from typing import Optional, List, Tuple
from datetime import datetime
from uuid import UUID

from app.models.drawing import Drawing
from app.models.drawing_share import DrawingShare
from app.models.drawing_comment import DrawingComment
from app.models.drawing_history import DrawingHistory
from app.db.base import now_jst


class DrawingRepository:
    """Repository for Drawing database operations."""

    def __init__(self, db: Session):
        self.db = db

    # === Drawing CRUD ===

    def get_by_id(
        self,
        drawing_id: UUID,
        include_deleted: bool = False
    ) -> Optional[Drawing]:
        """Get a drawing by ID."""
        query = (
            select(Drawing)
            .options(
                joinedload(Drawing.shares),
                joinedload(Drawing.comments),
            )
            .where(Drawing.id == drawing_id)
        )
        if not include_deleted:
            query = query.where(Drawing.deleted_at.is_(None))

        result = self.db.execute(query)
        return result.unique().scalar_one_or_none()

    def get_list(
        self,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
        owner_id: Optional[UUID] = None,
        is_public: Optional[bool] = None,
        include_deleted: bool = False,
    ) -> Tuple[List[Drawing], int]:
        """Get paginated list of drawings."""
        query = select(Drawing)

        # Exclude deleted by default
        if not include_deleted:
            query = query.where(Drawing.deleted_at.is_(None))

        # Search filter
        if q:
            search_term = f"%{q}%"
            query = query.where(
                or_(
                    Drawing.name.ilike(search_term),
                    Drawing.description.ilike(search_term),
                )
            )

        # Owner filter
        if owner_id is not None:
            query = query.where(Drawing.owner_id == owner_id)

        # Public filter
        if is_public is not None:
            query = query.where(Drawing.is_public == is_public)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar() or 0

        # Order by updated_at desc
        query = query.order_by(Drawing.updated_at.desc())

        # Pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = self.db.execute(query)
        drawings = list(result.scalars().all())

        return drawings, total

    def create(self, drawing: Drawing) -> Drawing:
        """Create a new drawing."""
        self.db.add(drawing)
        self.db.commit()
        self.db.refresh(drawing)
        return drawing

    def update(self, drawing: Drawing) -> Drawing:
        """Update a drawing."""
        drawing.updated_at = now_jst()
        self.db.commit()
        self.db.refresh(drawing)
        return drawing

    def soft_delete(self, drawing: Drawing) -> Drawing:
        """Soft delete a drawing."""
        drawing.deleted_at = now_jst()
        self.db.commit()
        return drawing

    def hard_delete(self, drawing: Drawing) -> None:
        """Permanently delete a drawing."""
        self.db.delete(drawing)
        self.db.commit()

    # === Share Operations ===

    def get_share_by_token(self, token: str) -> Optional[DrawingShare]:
        """Get a share by token."""
        query = (
            select(DrawingShare)
            .options(joinedload(DrawingShare.drawing))
            .where(DrawingShare.share_token == token)
        )
        result = self.db.execute(query)
        return result.unique().scalar_one_or_none()

    def get_share_by_id(self, share_id: UUID) -> Optional[DrawingShare]:
        """Get a share by ID."""
        query = (
            select(DrawingShare)
            .options(joinedload(DrawingShare.drawing))
            .where(DrawingShare.id == share_id)
        )
        result = self.db.execute(query)
        return result.unique().scalar_one_or_none()

    def get_shares_by_drawing(
        self,
        drawing_id: UUID
    ) -> List[DrawingShare]:
        """Get all shares for a drawing."""
        query = (
            select(DrawingShare)
            .where(DrawingShare.drawing_id == drawing_id)
            .order_by(DrawingShare.created_at.desc())
        )
        result = self.db.execute(query)
        return list(result.scalars().all())

    def create_share(self, share: DrawingShare) -> DrawingShare:
        """Create a share link."""
        self.db.add(share)
        self.db.commit()
        self.db.refresh(share)
        return share

    def update_share(self, share: DrawingShare) -> DrawingShare:
        """Update a share."""
        share.updated_at = now_jst()
        self.db.commit()
        self.db.refresh(share)
        return share

    def delete_share(self, share: DrawingShare) -> None:
        """Delete a share."""
        self.db.delete(share)
        self.db.commit()

    # === Comment Operations ===

    def get_comments_by_drawing(
        self,
        drawing_id: UUID,
        include_resolved: bool = True
    ) -> List[DrawingComment]:
        """Get all comments for a drawing."""
        query = (
            select(DrawingComment)
            .where(DrawingComment.drawing_id == drawing_id)
        )
        if not include_resolved:
            query = query.where(DrawingComment.resolved.is_(False))

        query = query.order_by(DrawingComment.created_at.desc())
        result = self.db.execute(query)
        return list(result.scalars().all())

    def get_comment_by_id(
        self,
        comment_id: UUID
    ) -> Optional[DrawingComment]:
        """Get a comment by ID."""
        query = select(DrawingComment).where(DrawingComment.id == comment_id)
        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def create_comment(self, comment: DrawingComment) -> DrawingComment:
        """Create a comment."""
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def update_comment(self, comment: DrawingComment) -> DrawingComment:
        """Update a comment."""
        comment.updated_at = now_jst()
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def delete_comment(self, comment: DrawingComment) -> None:
        """Delete a comment."""
        self.db.delete(comment)
        self.db.commit()

    # === History Operations ===

    def get_history_by_drawing(
        self,
        drawing_id: UUID,
        limit: int = 100
    ) -> List[DrawingHistory]:
        """Get history for a drawing."""
        query = (
            select(DrawingHistory)
            .where(DrawingHistory.drawing_id == drawing_id)
            .order_by(DrawingHistory.version.desc())
            .limit(limit)
        )
        result = self.db.execute(query)
        return list(result.scalars().all())

    def get_history_by_version(
        self,
        drawing_id: UUID,
        version: int
    ) -> Optional[DrawingHistory]:
        """Get a specific history entry by version."""
        query = (
            select(DrawingHistory)
            .where(
                DrawingHistory.drawing_id == drawing_id,
                DrawingHistory.version == version
            )
        )
        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def get_latest_snapshot(
        self,
        drawing_id: UUID,
        before_version: int
    ) -> Optional[DrawingHistory]:
        """Get the latest snapshot before a given version."""
        query = (
            select(DrawingHistory)
            .where(
                DrawingHistory.drawing_id == drawing_id,
                DrawingHistory.version < before_version,
                DrawingHistory.shapes_snapshot.isnot(None)
            )
            .order_by(DrawingHistory.version.desc())
            .limit(1)
        )
        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def create_history(self, history: DrawingHistory) -> DrawingHistory:
        """Create a history entry."""
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        return history

    def get_next_version(self, drawing_id: UUID) -> int:
        """Get the next version number for a drawing."""
        query = (
            select(func.max(DrawingHistory.version))
            .where(DrawingHistory.drawing_id == drawing_id)
        )
        result = self.db.execute(query).scalar()
        return (result or 0) + 1
