"""Service for template operations."""

from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.template import Template
from app.repositories.template_repo import TemplateRepository
from app.schemas.template import TemplateCreate, TemplateUpdate


class TemplateService:
    """Service for template business logic."""

    def __init__(self, db: Session) -> None:
        self.repo = TemplateRepository(db)

    def get_all(self) -> list[Template]:
        """Get all templates."""
        return self.repo.get_all()

    def get_by_id(self, template_id: int) -> Template:
        """Get a template by ID."""
        template = self.repo.get_by_id(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="テンプレートが見つかりません")
        return template

    def create(self, data: TemplateCreate) -> Template:
        """Create a new user template."""
        return self.repo.create(
            name=data.name,
            description=data.description,
            content=data.content,
            is_system=False,  # User templates are never system templates
        )

    def update(self, template_id: int, data: TemplateUpdate) -> Template:
        """Update a template."""
        template = self.get_by_id(template_id)

        # System templates cannot be modified by users
        if template.is_system:
            raise HTTPException(
                status_code=403,
                detail="システムテンプレートは変更できません"
            )

        return self.repo.update(
            template=template,
            name=data.name,
            description=data.description,
            content=data.content,
        )

    def delete(self, template_id: int) -> None:
        """Delete a template."""
        template = self.get_by_id(template_id)

        # System templates cannot be deleted
        if template.is_system:
            raise HTTPException(
                status_code=403,
                detail="システムテンプレートは削除できません"
            )

        self.repo.delete(template)
