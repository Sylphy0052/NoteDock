"""Repository for Company database operations."""
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import Optional, List

from app.models.company import Company
from app.models.project import Project


class CompanyRepository:
    """Repository for Company database operations."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, name: str) -> Company:
        """Create a new company."""
        company = Company(name=name)
        self.db.add(company)
        self.db.commit()
        self.db.refresh(company)
        return company

    def get_by_id(self, company_id: int) -> Optional[Company]:
        """Get a company by ID."""
        return self.db.get(Company, company_id)

    def get_all(self) -> List[Company]:
        """Get all companies ordered by name."""
        query = select(Company).order_by(Company.name)
        result = self.db.execute(query)
        return list(result.scalars().all())

    def update(self, company: Company, name: Optional[str] = None) -> Company:
        """Update a company."""
        if name is not None:
            company.name = name
        self.db.commit()
        self.db.refresh(company)
        return company

    def delete(self, company: Company) -> None:
        """Delete a company."""
        self.db.delete(company)
        self.db.commit()

    def search_by_name(self, query: str) -> List[Company]:
        """Search companies by name (partial match)."""
        stmt = (
            select(Company)
            .where(Company.name.ilike(f"%{query}%"))
            .order_by(Company.name)
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def get_project_count(self, company_id: int) -> int:
        """Get the number of projects for a company."""
        stmt = (
            select(func.count(Project.id))
            .where(Project.company_id == company_id)
        )
        result = self.db.execute(stmt)
        return result.scalar() or 0
