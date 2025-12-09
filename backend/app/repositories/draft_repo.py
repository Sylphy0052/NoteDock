"""Repository for note draft operations."""

import json
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from app.models.note_draft import NoteDraft


class DraftRepository:
    """Repository for note draft database operations."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_note_id(self, note_id: int) -> Optional[NoteDraft]:
        """Get a draft by note ID."""
        stmt = select(NoteDraft).where(NoteDraft.note_id == note_id)
        return self.db.execute(stmt).scalars().first()

    def get_by_session_id(self, session_id: str) -> Optional[NoteDraft]:
        """Get a draft by session ID (for new notes)."""
        stmt = select(NoteDraft).where(
            NoteDraft.session_id == session_id,
            NoteDraft.note_id.is_(None)
        )
        return self.db.execute(stmt).scalars().first()

    def get_draft(self, session_id: str, note_id: Optional[int] = None) -> Optional[NoteDraft]:
        """Get a draft by session_id and optional note_id."""
        if note_id is not None:
            # For existing notes, prefer note_id match
            draft = self.get_by_note_id(note_id)
            if draft:
                return draft
        # For new notes or fallback, use session_id
        return self.get_by_session_id(session_id)

    def save(
        self,
        session_id: str,
        title: str,
        content_md: str,
        tags: list[str],
        folder_id: Optional[int] = None,
        note_id: Optional[int] = None,
    ) -> NoteDraft:
        """Save or update a draft."""
        # Try to find existing draft
        existing = self.get_draft(session_id, note_id)

        if existing:
            # Update existing draft
            existing.title = title
            existing.content_md = content_md
            existing.tags_json = json.dumps(tags)
            existing.folder_id = folder_id
            if note_id is not None:
                existing.note_id = note_id
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            # Create new draft
            draft = NoteDraft(
                session_id=session_id,
                note_id=note_id,
                title=title,
                content_md=content_md,
                tags_json=json.dumps(tags),
                folder_id=folder_id,
            )
            self.db.add(draft)
            self.db.commit()
            self.db.refresh(draft)
            return draft

    def delete_by_note_id(self, note_id: int) -> bool:
        """Delete drafts associated with a note."""
        stmt = select(NoteDraft).where(NoteDraft.note_id == note_id)
        drafts = self.db.execute(stmt).scalars().all()
        for draft in drafts:
            self.db.delete(draft)
        self.db.commit()
        return len(drafts) > 0

    def delete_by_session_id(self, session_id: str) -> bool:
        """Delete drafts by session ID."""
        stmt = select(NoteDraft).where(NoteDraft.session_id == session_id)
        drafts = self.db.execute(stmt).scalars().all()
        for draft in drafts:
            self.db.delete(draft)
        self.db.commit()
        return len(drafts) > 0

    def delete(self, draft: NoteDraft) -> None:
        """Delete a specific draft."""
        self.db.delete(draft)
        self.db.commit()
