import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy.orm import Session
import bcrypt

from app.models.drawing import Drawing
from app.models.drawing_share import DrawingShare
from app.models.drawing_comment import DrawingComment
from app.models.drawing_history import DrawingHistory
from app.repositories.drawing_repo import DrawingRepository
from app.schemas.drawing import (
    DrawingCreate,
    DrawingUpdate,
    ShareCreate,
    CommentCreate,
    CommentUpdate,
)
from app.core.errors import NotFoundError, ValidationError, ConflictError
from app.db.base import now_jst


class DrawingService:
    """Service for Drawing business logic."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = DrawingRepository(db)

    # === Drawing CRUD ===

    def get_drawing(
        self,
        drawing_id: UUID,
        include_deleted: bool = False
    ) -> Drawing:
        """Get a drawing by ID."""
        drawing = self.repo.get_by_id(drawing_id, include_deleted)
        if not drawing:
            raise NotFoundError("描画", drawing_id)
        return drawing

    def get_drawings(
        self,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
        owner_id: Optional[UUID] = None,
        is_public: Optional[bool] = None,
    ) -> Tuple[List[Drawing], int]:
        """Get paginated list of drawings."""
        return self.repo.get_list(
            page=page,
            page_size=page_size,
            q=q,
            owner_id=owner_id,
            is_public=is_public,
        )

    def create_drawing(self, data: DrawingCreate) -> Drawing:
        """Create a new drawing."""
        drawing = Drawing(
            name=data.name,
            description=data.description,
            shapes=data.shapes,
            canvas_width=data.canvas_width,
            canvas_height=data.canvas_height,
            is_public=data.is_public,
            owner_name=data.owner_name,
        )
        return self.repo.create(drawing)

    def update_drawing(
        self,
        drawing_id: UUID,
        data: DrawingUpdate,
        actor_name: Optional[str] = None
    ) -> Drawing:
        """Update a drawing."""
        drawing = self.get_drawing(drawing_id)

        # Track changes for history
        changes = {}

        if data.name is not None:
            changes["name"] = {"old": drawing.name, "new": data.name}
            drawing.name = data.name

        if data.description is not None:
            drawing.description = data.description

        if data.shapes is not None:
            changes["shapes"] = {"count": len(data.shapes)}
            drawing.shapes = data.shapes

        if data.canvas_width is not None:
            drawing.canvas_width = data.canvas_width

        if data.canvas_height is not None:
            drawing.canvas_height = data.canvas_height

        if data.is_public is not None:
            drawing.is_public = data.is_public

        # Increment version
        drawing.version += 1

        # Create history entry if shapes changed
        if "shapes" in changes:
            self._create_history_entry(
                drawing_id=drawing.id,
                action_type="update_shapes",
                action_data=changes,
                actor_name=actor_name,
                shapes_snapshot=data.shapes if drawing.version % 10 == 0 else None
            )

        return self.repo.update(drawing)

    def delete_drawing(self, drawing_id: UUID) -> None:
        """Soft delete a drawing."""
        drawing = self.get_drawing(drawing_id)
        self.repo.soft_delete(drawing)

    # === Share Operations ===

    def create_share(
        self,
        drawing_id: UUID,
        data: ShareCreate
    ) -> DrawingShare:
        """Create a share link for a drawing."""
        # Verify drawing exists
        self.get_drawing(drawing_id)

        # Generate token
        token = secrets.token_urlsafe(48)

        # Hash password if provided
        password_hash = None
        if data.password:
            password_hash = bcrypt.hashpw(
                data.password.encode(),
                bcrypt.gensalt()
            ).decode()

        # Calculate expiration
        expires_at = None
        if data.expires_in_days:
            expires_at = now_jst() + timedelta(days=data.expires_in_days)

        share = DrawingShare(
            drawing_id=drawing_id,
            share_token=token,
            permission=data.permission,
            password_hash=password_hash,
            expires_at=expires_at,
        )

        return self.repo.create_share(share)

    def get_share_by_token(
        self,
        token: str,
        password: Optional[str] = None
    ) -> DrawingShare:
        """Get a share by token, validating password if required."""
        share = self.repo.get_share_by_token(token)
        if not share:
            raise NotFoundError("共有リンク", token)

        # Check expiration
        if share.is_expired:
            raise ValidationError("この共有リンクは有効期限が切れています")

        # Check password
        if share.password_hash:
            if not password:
                raise ValidationError("パスワードが必要です")
            if not bcrypt.checkpw(
                password.encode(),
                share.password_hash.encode()
            ):
                raise ValidationError("パスワードが正しくありません")

        # Update access info
        share.accessed_at = now_jst()
        share.access_count += 1
        self.repo.update_share(share)

        return share

    def get_shares(self, drawing_id: UUID) -> List[DrawingShare]:
        """Get all shares for a drawing."""
        self.get_drawing(drawing_id)
        return self.repo.get_shares_by_drawing(drawing_id)

    def delete_share(self, drawing_id: UUID, share_id: UUID) -> None:
        """Delete a share link."""
        share = self.repo.get_share_by_id(share_id)
        if not share or share.drawing_id != drawing_id:
            raise NotFoundError("共有リンク", share_id)
        self.repo.delete_share(share)

    # === Comment Operations ===

    def get_comments(
        self,
        drawing_id: UUID,
        include_resolved: bool = True
    ) -> List[DrawingComment]:
        """Get all comments for a drawing."""
        self.get_drawing(drawing_id)
        return self.repo.get_comments_by_drawing(
            drawing_id,
            include_resolved
        )

    def create_comment(
        self,
        drawing_id: UUID,
        data: CommentCreate
    ) -> DrawingComment:
        """Create a comment on a drawing."""
        self.get_drawing(drawing_id)

        comment = DrawingComment(
            drawing_id=drawing_id,
            content=data.content,
            shape_id=data.shape_id,
            position_x=data.position_x,
            position_y=data.position_y,
            author_name=data.author_name,
            author_color=data.author_color,
        )

        return self.repo.create_comment(comment)

    def update_comment(
        self,
        drawing_id: UUID,
        comment_id: UUID,
        data: CommentUpdate
    ) -> DrawingComment:
        """Update a comment."""
        comment = self.repo.get_comment_by_id(comment_id)
        if not comment or comment.drawing_id != drawing_id:
            raise NotFoundError("コメント", comment_id)

        if data.content is not None:
            comment.content = data.content

        if data.resolved is not None:
            comment.resolved = data.resolved

        return self.repo.update_comment(comment)

    def delete_comment(self, drawing_id: UUID, comment_id: UUID) -> None:
        """Delete a comment."""
        comment = self.repo.get_comment_by_id(comment_id)
        if not comment or comment.drawing_id != drawing_id:
            raise NotFoundError("コメント", comment_id)
        self.repo.delete_comment(comment)

    # === History Operations ===

    def get_history(
        self,
        drawing_id: UUID,
        limit: int = 100
    ) -> List[DrawingHistory]:
        """Get history for a drawing."""
        self.get_drawing(drawing_id)
        return self.repo.get_history_by_drawing(drawing_id, limit)

    def rollback_to_version(
        self,
        drawing_id: UUID,
        version: int,
        actor_name: Optional[str] = None
    ) -> Drawing:
        """Rollback a drawing to a specific version."""
        drawing = self.get_drawing(drawing_id)

        # Find the snapshot or reconstruct state
        snapshot = self.repo.get_latest_snapshot(drawing_id, version + 1)

        if not snapshot or not snapshot.shapes_snapshot:
            raise ValidationError(
                f"バージョン {version} へのロールバックはできません"
            )

        # Get all history entries between snapshot and target version
        history = self.repo.get_history_by_drawing(drawing_id)

        # Reconstruct state at target version
        shapes = snapshot.shapes_snapshot

        for entry in reversed(history):
            if entry.version <= snapshot.version:
                continue
            if entry.version > version:
                continue

            # Apply operation (simplified - in real impl would need full OT)
            if entry.action_type == "update_shapes":
                if "shapes" in entry.action_data:
                    shapes = entry.action_data.get("new_shapes", shapes)

        # Update drawing
        drawing.shapes = shapes
        drawing.version += 1

        # Create history entry for rollback
        self._create_history_entry(
            drawing_id=drawing.id,
            action_type="rollback",
            action_data={
                "target_version": version,
                "from_version": drawing.version - 1
            },
            actor_name=actor_name,
            shapes_snapshot=shapes
        )

        return self.repo.update(drawing)

    def _create_history_entry(
        self,
        drawing_id: UUID,
        action_type: str,
        action_data: dict,
        actor_name: Optional[str] = None,
        actor_color: Optional[str] = None,
        shapes_snapshot: Optional[list] = None
    ) -> DrawingHistory:
        """Create a history entry."""
        version = self.repo.get_next_version(drawing_id)

        history = DrawingHistory(
            drawing_id=drawing_id,
            action_type=action_type,
            action_data=action_data,
            actor_name=actor_name,
            actor_color=actor_color,
            shapes_snapshot=shapes_snapshot,
            version=version,
        )

        return self.repo.create_history(history)
