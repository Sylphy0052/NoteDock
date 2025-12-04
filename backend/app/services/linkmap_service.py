from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Set, Dict, Any
from dataclasses import dataclass

from app.models import Note, NoteLink
from app.repositories.link_repo import LinkRepository
from app.repositories.note_repo import NoteRepository
from app.utils.markdown import extract_note_links
from app.core.errors import NotFoundError


@dataclass
class GraphNode:
    id: int
    title: str
    is_pinned: bool = False


@dataclass
class GraphEdge:
    from_id: int
    to_id: int


@dataclass
class LinkGraph:
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class LinkmapService:
    """Service for linkmap operations."""

    def __init__(self, db: Session):
        self.db = db
        self.link_repo = LinkRepository(db)
        self.note_repo = NoteRepository(db)

    def get_full_linkmap(self) -> LinkGraph:
        """Get the full linkmap with all notes and links."""
        # Get all non-deleted notes
        notes, _ = self.note_repo.get_list(page=1, page_size=10000)

        # Get all links
        links = self.link_repo.get_all_links()

        # Build node list
        note_ids = {n.id for n in notes}
        nodes = [
            GraphNode(id=n.id, title=n.title, is_pinned=n.is_pinned)
            for n in notes
        ]

        # Build edge list (only include links where both notes exist)
        edges = [
            GraphEdge(from_id=link.from_note_id, to_id=link.to_note_id)
            for link in links
            if link.from_note_id in note_ids and link.to_note_id in note_ids
        ]

        return LinkGraph(nodes=nodes, edges=edges)

    def get_neighborhood_linkmap(self, note_id: int, depth: int = 2) -> LinkGraph:
        """Get linkmap for a specific note and its neighbors."""
        # Verify note exists
        center_note = self.note_repo.get_by_id(note_id)
        if not center_note:
            raise NotFoundError("ノート", note_id)

        # Collect note IDs within depth
        visited: Set[int] = set()
        current_level: Set[int] = {note_id}

        for _ in range(depth):
            next_level: Set[int] = set()
            for nid in current_level:
                if nid in visited:
                    continue
                visited.add(nid)

                # Get outgoing and incoming links
                outgoing = self.link_repo.get_outgoing_links(nid)
                incoming = self.link_repo.get_incoming_links(nid)

                for link in outgoing:
                    next_level.add(link.to_note_id)
                for link in incoming:
                    next_level.add(link.from_note_id)

            current_level = next_level - visited

        visited.update(current_level)

        # Get notes for all visited IDs
        notes = []
        for nid in visited:
            note = self.note_repo.get_by_id(nid)
            if note and not note.is_deleted:
                notes.append(note)

        note_ids = {n.id for n in notes}

        # Build nodes
        nodes = [
            GraphNode(id=n.id, title=n.title, is_pinned=n.is_pinned)
            for n in notes
        ]

        # Build edges (only between visited notes)
        edges = []
        for nid in visited:
            outgoing = self.link_repo.get_outgoing_links(nid)
            for link in outgoing:
                if link.to_note_id in note_ids:
                    edges.append(GraphEdge(from_id=link.from_note_id, to_id=link.to_note_id))

        return LinkGraph(nodes=nodes, edges=edges)

    def update_note_links(self, note_id: int, content: str) -> None:
        """Parse content and update note links."""
        # Extract note IDs from content
        linked_ids = extract_note_links(content)

        # Filter to only existing notes
        existing_ids: Set[int] = set()
        for lid in linked_ids:
            note = self.note_repo.get_by_id(lid)
            if note and not note.is_deleted:
                existing_ids.add(lid)

        # Update links
        self.link_repo.update_links_for_note(note_id, existing_ids)
