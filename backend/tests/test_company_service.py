"""Tests for CompanyService."""
import pytest
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ConflictError
from app.models.company import Company
from app.models.project import Project


class TestCompanyService:
    """Tests for CompanyService."""

    def test_create_company(self, db: Session) -> None:
        """Test creating a company."""
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate

        service = CompanyService(db)
        data = CompanyCreate(name="テスト会社")
        company = service.create_company(data)

        assert company.id is not None
        assert company.name == "テスト会社"

    def test_create_company_duplicate_name(self, db: Session) -> None:
        """Test creating a company with duplicate name raises error."""
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate

        service = CompanyService(db)
        data = CompanyCreate(name="重複テスト会社")
        service.create_company(data)

        with pytest.raises(ConflictError):
            service.create_company(data)

    def test_get_company(self, db: Session) -> None:
        """Test getting a company by ID."""
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate

        service = CompanyService(db)
        created = service.create_company(CompanyCreate(name="取得テスト"))
        found = service.get_company(created.id)

        assert found.id == created.id
        assert found.name == "取得テスト"

    def test_get_company_not_found(self, db: Session) -> None:
        """Test getting a non-existent company raises error."""
        from app.services.company_service import CompanyService

        service = CompanyService(db)
        with pytest.raises(NotFoundError):
            service.get_company(99999)

    def test_get_all_companies(self, db: Session) -> None:
        """Test getting all companies."""
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate

        service = CompanyService(db)
        service.create_company(CompanyCreate(name="会社A"))
        service.create_company(CompanyCreate(name="会社B"))

        companies = service.get_all_companies()
        assert len(companies) >= 2

    def test_update_company(self, db: Session) -> None:
        """Test updating a company."""
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate, CompanyUpdate

        service = CompanyService(db)
        company = service.create_company(CompanyCreate(name="更新前"))

        updated = service.update_company(company.id, CompanyUpdate(name="更新後"))
        assert updated.name == "更新後"

    def test_update_company_not_found(self, db: Session) -> None:
        """Test updating a non-existent company raises error."""
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyUpdate

        service = CompanyService(db)
        with pytest.raises(NotFoundError):
            service.update_company(99999, CompanyUpdate(name="テスト"))

    def test_delete_company(self, db: Session) -> None:
        """Test deleting a company."""
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate

        service = CompanyService(db)
        company = service.create_company(CompanyCreate(name="削除テスト"))
        company_id = company.id

        service.delete_company(company_id)

        with pytest.raises(NotFoundError):
            service.get_company(company_id)

    def test_delete_company_not_found(self, db: Session) -> None:
        """Test deleting a non-existent company raises error."""
        from app.services.company_service import CompanyService

        service = CompanyService(db)
        with pytest.raises(NotFoundError):
            service.delete_company(99999)

    def test_search_companies(self, db: Session) -> None:
        """Test searching companies by name."""
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate

        service = CompanyService(db)
        service.create_company(CompanyCreate(name="株式会社テスト"))
        service.create_company(CompanyCreate(name="テスト商事"))
        service.create_company(CompanyCreate(name="XYZ株式会社"))

        results = service.search_companies("テスト")
        assert len(results) == 2

    def test_get_company_with_project_count(self, db: Session) -> None:
        """Test getting company response with project count."""
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate

        service = CompanyService(db)
        company = service.create_company(CompanyCreate(name="プロジェクト数テスト"))

        # Add projects
        project1 = Project(name="プロジェクト1", company_id=company.id)
        project2 = Project(name="プロジェクト2", company_id=company.id)
        db.add_all([project1, project2])
        db.commit()

        response = service.get_company_response(company.id)
        assert response.project_count == 2
