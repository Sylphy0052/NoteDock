from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional, List

from app.models import Tag


class TagRepository:
    """Repository for Tag database operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, tag_id: int) -> Optional[Tag]:
        """Get a tag by ID."""
        return self.db.get(Tag, tag_id)

    def get_by_name(self, name: str) -> Optional[Tag]:
        """Get a tag by name."""
        query = select(Tag).where(Tag.name == name)
        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def get_or_create(self, name: str) -> Tag:
        """Get existing tag or create new one."""
        tag = self.get_by_name(name)
        if tag:
            return tag

        tag = Tag(name=name)
        self.db.add(tag)
        self.db.commit()
        self.db.refresh(tag)
        return tag

    def get_or_create_many(self, names: List[str]) -> List[Tag]:
        """Get or create multiple tags."""
        tags = []
        for name in names:
            if name.strip():
                tags.append(self.get_or_create(name.strip()))
        return tags

    def get_all(self) -> List[Tag]:
        """Get all tags."""
        query = select(Tag).order_by(Tag.name)
        result = self.db.execute(query)
        return list(result.scalars().all())

    def suggest(self, query: str, limit: int = 10) -> List[Tag]:
        """Suggest tags based on partial match."""
        search_term = f"%{query}%"
        stmt = (
            select(Tag)
            .where(Tag.name.ilike(search_term))
            .order_by(Tag.name)
            .limit(limit)
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def delete(self, tag: Tag) -> None:
        """Delete a tag."""
        self.db.delete(tag)
        self.db.commit()
