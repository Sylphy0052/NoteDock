"""Repository for template operations."""

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.template import Template


class TemplateRepository:
    """Repository for template database operations."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_all(self) -> list[Template]:
        """Get all templates ordered by is_system desc, then name."""
        stmt = select(Template).order_by(
            Template.is_system.desc(),
            Template.name
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_by_id(self, template_id: int) -> Optional[Template]:
        """Get a template by ID."""
        return self.db.get(Template, template_id)

    def get_system_templates(self) -> list[Template]:
        """Get only system templates."""
        stmt = select(Template).where(Template.is_system == True).order_by(Template.name)
        return list(self.db.execute(stmt).scalars().all())

    def get_user_templates(self) -> list[Template]:
        """Get only user-created templates."""
        stmt = select(Template).where(Template.is_system == False).order_by(Template.name)
        return list(self.db.execute(stmt).scalars().all())

    def create(
        self,
        name: str,
        description: str,
        content: str,
        is_system: bool = False,
    ) -> Template:
        """Create a new template."""
        template = Template(
            name=name,
            description=description,
            content=content,
            is_system=is_system,
        )
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def update(
        self,
        template: Template,
        name: Optional[str] = None,
        description: Optional[str] = None,
        content: Optional[str] = None,
    ) -> Template:
        """Update an existing template."""
        if name is not None:
            template.name = name
        if description is not None:
            template.description = description
        if content is not None:
            template.content = content
        self.db.commit()
        self.db.refresh(template)
        return template

    def delete(self, template: Template) -> None:
        """Delete a template."""
        self.db.delete(template)
        self.db.commit()
