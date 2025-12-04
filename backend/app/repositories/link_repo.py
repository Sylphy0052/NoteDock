from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from typing import List, Set

from app.models import NoteLink, Note


class LinkRepository:
    """Repository for NoteLink database operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_all_links(self) -> List[NoteLink]:
        """Get all note links."""
        query = select(NoteLink)
        result = self.db.execute(query)
        return list(result.scalars().all())

    def get_outgoing_links(self, note_id: int) -> List[NoteLink]:
        """Get links from a specific note."""
        query = select(NoteLink).where(NoteLink.from_note_id == note_id)
        result = self.db.execute(query)
        return list(result.scalars().all())

    def get_incoming_links(self, note_id: int) -> List[NoteLink]:
        """Get links to a specific note."""
        query = select(NoteLink).where(NoteLink.to_note_id == note_id)
        result = self.db.execute(query)
        return list(result.scalars().all())

    def update_links_for_note(self, note_id: int, target_ids: Set[int]) -> None:
        """Update links for a note based on parsed content."""
        # Delete existing outgoing links
        self.db.execute(
            delete(NoteLink).where(NoteLink.from_note_id == note_id)
        )

        # Create new links
        for target_id in target_ids:
            link = NoteLink(from_note_id=note_id, to_note_id=target_id)
            self.db.add(link)

        self.db.commit()

    def delete_links_for_note(self, note_id: int) -> None:
        """Delete all links from/to a note."""
        self.db.execute(
            delete(NoteLink).where(
                (NoteLink.from_note_id == note_id) |
                (NoteLink.to_note_id == note_id)
            )
        )
        self.db.commit()
