"""Tests for CompanyRepository."""
import pytest
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.project import Project


class TestCompanyRepository:
    """Tests for CompanyRepository."""

    def test_create_company(self, db: Session) -> None:
        """Test creating a company."""
        from app.repositories.company_repo import CompanyRepository

        repo = CompanyRepository(db)
        company = repo.create(name="テスト会社")

        assert company.id is not None
        assert company.name == "テスト会社"

    def test_get_by_id(self, db: Session) -> None:
        """Test getting a company by ID."""
        from app.repositories.company_repo import CompanyRepository

        repo = CompanyRepository(db)
        created = repo.create(name="取得テスト会社")

        found = repo.get_by_id(created.id)
        assert found is not None
        assert found.name == "取得テスト会社"

    def test_get_by_id_not_found(self, db: Session) -> None:
        """Test getting a non-existent company."""
        from app.repositories.company_repo import CompanyRepository

        repo = CompanyRepository(db)
        found = repo.get_by_id(99999)
        assert found is None

    def test_get_all(self, db: Session) -> None:
        """Test getting all companies."""
        from app.repositories.company_repo import CompanyRepository

        repo = CompanyRepository(db)
        repo.create(name="会社A")
        repo.create(name="会社B")
        repo.create(name="会社C")

        companies = repo.get_all()
        assert len(companies) == 3

    def test_get_all_ordered_by_name(self, db: Session) -> None:
        """Test that companies are ordered by name."""
        from app.repositories.company_repo import CompanyRepository

        repo = CompanyRepository(db)
        repo.create(name="C会社")
        repo.create(name="A会社")
        repo.create(name="B会社")

        companies = repo.get_all()
        assert companies[0].name == "A会社"
        assert companies[1].name == "B会社"
        assert companies[2].name == "C会社"

    def test_update(self, db: Session) -> None:
        """Test updating a company."""
        from app.repositories.company_repo import CompanyRepository

        repo = CompanyRepository(db)
        company = repo.create(name="更新前")

        updated = repo.update(company, name="更新後")
        assert updated.name == "更新後"

    def test_delete(self, db: Session) -> None:
        """Test deleting a company."""
        from app.repositories.company_repo import CompanyRepository

        repo = CompanyRepository(db)
        company = repo.create(name="削除テスト")
        company_id = company.id

        repo.delete(company)
        assert repo.get_by_id(company_id) is None

    def test_search_by_name(self, db: Session) -> None:
        """Test searching companies by name."""
        from app.repositories.company_repo import CompanyRepository

        repo = CompanyRepository(db)
        repo.create(name="株式会社ABC")
        repo.create(name="ABC商事")
        repo.create(name="XYZ株式会社")

        results = repo.search_by_name("ABC")
        assert len(results) == 2

    def test_get_project_count(self, db: Session) -> None:
        """Test getting project count for a company."""
        from app.repositories.company_repo import CompanyRepository

        repo = CompanyRepository(db)
        company = repo.create(name="プロジェクト数テスト")

        # Create projects for the company
        project1 = Project(name="プロジェクト1", company_id=company.id)
        project2 = Project(name="プロジェクト2", company_id=company.id)
        db.add_all([project1, project2])
        db.commit()

        count = repo.get_project_count(company.id)
        assert count == 2
