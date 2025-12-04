from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional, List

from app.models import Folder


class FolderRepository:
    """Repository for Folder database operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, folder_id: int) -> Optional[Folder]:
        """Get a folder by ID."""
        return self.db.get(Folder, folder_id)

    def get_all(self) -> List[Folder]:
        """Get all folders."""
        query = select(Folder).order_by(Folder.name)
        result = self.db.execute(query)
        return list(result.scalars().all())

    def get_root_folders(self) -> List[Folder]:
        """Get all root folders (no parent)."""
        query = (
            select(Folder)
            .where(Folder.parent_id.is_(None))
            .order_by(Folder.name)
        )
        result = self.db.execute(query)
        return list(result.scalars().all())

    def get_children(self, parent_id: int) -> List[Folder]:
        """Get all children of a folder."""
        query = (
            select(Folder)
            .where(Folder.parent_id == parent_id)
            .order_by(Folder.name)
        )
        result = self.db.execute(query)
        return list(result.scalars().all())

    def get_depth(self, folder: Folder) -> int:
        """Get the depth of a folder in the hierarchy."""
        depth = 1
        current = folder
        while current.parent_id is not None:
            current = self.get_by_id(current.parent_id)
            if current is None:
                break
            depth += 1
        return depth

    def create(self, name: str, parent_id: Optional[int] = None) -> Folder:
        """Create a new folder."""
        folder = Folder(name=name, parent_id=parent_id)
        self.db.add(folder)
        self.db.commit()
        self.db.refresh(folder)
        return folder

    def update(self, folder: Folder, name: Optional[str] = None, parent_id: Optional[int] = None) -> Folder:
        """Update a folder."""
        if name is not None:
            folder.name = name
        if parent_id is not None:
            folder.parent_id = parent_id
        self.db.commit()
        self.db.refresh(folder)
        return folder

    def delete(self, folder: Folder) -> None:
        """Delete a folder (cascade deletes children)."""
        self.db.delete(folder)
        self.db.commit()

    def can_add_child(self, parent_id: Optional[int]) -> bool:
        """Check if a child can be added (max 3 levels)."""
        if parent_id is None:
            return True

        parent = self.get_by_id(parent_id)
        if parent is None:
            return False

        return self.get_depth(parent) < 3

    def get_by_name_and_parent(
        self,
        name: str,
        parent_id: Optional[int] = None,
    ) -> Optional[Folder]:
        """Get a folder by name and parent ID."""
        if parent_id is None:
            query = select(Folder).where(
                Folder.name == name,
                Folder.parent_id.is_(None),
            )
        else:
            query = select(Folder).where(
                Folder.name == name,
                Folder.parent_id == parent_id,
            )
        result = self.db.execute(query)
        return result.scalar_one_or_none()
