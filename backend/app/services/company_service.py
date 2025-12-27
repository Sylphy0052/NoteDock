"""Service for Company operations."""
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.company import Company
from app.repositories.company_repo import CompanyRepository
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from app.core.errors import NotFoundError, ConflictError


class CompanyService:
    """Service for company business logic."""

    def __init__(self, db: Session):
        self.db = db
        self.company_repo = CompanyRepository(db)

    def create_company(self, data: CompanyCreate) -> Company:
        """Create a new company.

        Args:
            data: Company creation data.

        Returns:
            Created company.

        Raises:
            ConflictError: If company with the same name already exists.
        """
        # Check for duplicate name
        existing = self.company_repo.search_by_name(data.name)
        for company in existing:
            if company.name == data.name:
                raise ConflictError(
                    f"会社名「{data.name}」は既に使用されています",
                    details={"name": data.name}
                )

        return self.company_repo.create(name=data.name)

    def get_company(self, company_id: int) -> Company:
        """Get a company by ID.

        Args:
            company_id: Company ID.

        Returns:
            Company instance.

        Raises:
            NotFoundError: If company not found.
        """
        company = self.company_repo.get_by_id(company_id)
        if not company:
            raise NotFoundError("会社", company_id)
        return company

    def get_all_companies(self) -> List[Company]:
        """Get all companies ordered by name.

        Returns:
            List of companies.
        """
        return self.company_repo.get_all()

    def update_company(self, company_id: int, data: CompanyUpdate) -> Company:
        """Update a company.

        Args:
            company_id: Company ID.
            data: Update data.

        Returns:
            Updated company.

        Raises:
            NotFoundError: If company not found.
        """
        company = self.get_company(company_id)
        return self.company_repo.update(company, name=data.name)

    def delete_company(self, company_id: int) -> None:
        """Delete a company.

        Args:
            company_id: Company ID.

        Raises:
            NotFoundError: If company not found.
        """
        company = self.get_company(company_id)
        self.company_repo.delete(company)

    def search_companies(self, query: str) -> List[Company]:
        """Search companies by name.

        Args:
            query: Search query.

        Returns:
            List of matching companies.
        """
        return self.company_repo.search_by_name(query)

    def get_company_response(self, company_id: int) -> CompanyResponse:
        """Get company response with project count.

        Args:
            company_id: Company ID.

        Returns:
            CompanyResponse with project_count.

        Raises:
            NotFoundError: If company not found.
        """
        company = self.get_company(company_id)
        project_count = self.company_repo.get_project_count(company_id)

        return CompanyResponse(
            id=company.id,
            name=company.name,
            created_at=company.created_at,
            updated_at=company.updated_at,
            project_count=project_count
        )

    def get_all_companies_with_count(self) -> List[CompanyResponse]:
        """Get all companies with project counts.

        Returns:
            List of CompanyResponse with project_count.
        """
        companies = self.company_repo.get_all()
        result = []
        for company in companies:
            project_count = self.company_repo.get_project_count(company.id)
            result.append(CompanyResponse(
                id=company.id,
                name=company.name,
                created_at=company.created_at,
                updated_at=company.updated_at,
                project_count=project_count
            ))
        return result
