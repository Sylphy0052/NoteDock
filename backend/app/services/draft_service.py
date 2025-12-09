"""Service for note draft operations."""

import json
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.note_draft import NoteDraft
from app.repositories.draft_repo import DraftRepository
from app.schemas.draft import DraftSave, DraftResponse


class DraftService:
    """Service for note draft business logic."""

    def __init__(self, db: Session) -> None:
        self.repo = DraftRepository(db)

    def _to_response(self, draft: NoteDraft) -> DraftResponse:
        """Convert NoteDraft model to response schema."""
        return DraftResponse(
            id=draft.id,
            note_id=draft.note_id,
            session_id=draft.session_id,
            title=draft.title,
            content_md=draft.content_md,
            folder_id=draft.folder_id,
            tags=json.loads(draft.tags_json),
            saved_at=draft.saved_at,
        )

    def get_draft(
        self,
        session_id: str,
        note_id: Optional[int] = None,
    ) -> Optional[DraftResponse]:
        """Get a draft by session_id and optional note_id."""
        draft = self.repo.get_draft(session_id, note_id)
        if draft:
            return self._to_response(draft)
        return None

    def get_draft_by_note_id(self, note_id: int) -> Optional[DraftResponse]:
        """Get a draft by note_id."""
        draft = self.repo.get_by_note_id(note_id)
        if draft:
            return self._to_response(draft)
        return None

    def save_draft(self, data: DraftSave) -> DraftResponse:
        """Save or update a draft."""
        draft = self.repo.save(
            session_id=data.session_id,
            title=data.title,
            content_md=data.content_md,
            tags=data.tags,
            folder_id=data.folder_id,
            note_id=data.note_id,
        )
        return self._to_response(draft)

    def delete_draft(
        self,
        session_id: str,
        note_id: Optional[int] = None,
    ) -> bool:
        """Delete a draft."""
        if note_id is not None:
            return self.repo.delete_by_note_id(note_id)
        return self.repo.delete_by_session_id(session_id)

    def delete_draft_by_note_id(self, note_id: int) -> bool:
        """Delete drafts associated with a note (called when note is saved)."""
        return self.repo.delete_by_note_id(note_id)
