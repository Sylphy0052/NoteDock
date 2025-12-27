"""Tests for Company model."""
import pytest
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.project import Project  # noqa: F401 - needed for SQLAlchemy registry


class TestCompanyModel:
    """Tests for Company SQLAlchemy model."""

    def test_create_company(self, db: Session) -> None:
        """Test creating a company."""
        company = Company(name="テスト会社")
        db.add(company)
        db.commit()
        db.refresh(company)

        assert company.id is not None
        assert company.name == "テスト会社"
        assert company.created_at is not None
        assert company.updated_at is not None

    def test_company_has_timestamps(self, db: Session) -> None:
        """Test that company has created_at and updated_at timestamps."""
        company = Company(name="タイムスタンプテスト")
        db.add(company)
        db.commit()
        db.refresh(company)

        assert company.created_at is not None
        assert company.updated_at is not None
        assert company.created_at <= company.updated_at

    def test_company_name_required(self, db: Session) -> None:
        """Test that company name is required."""
        from sqlalchemy.exc import IntegrityError

        company = Company(name=None)  # type: ignore
        db.add(company)
        with pytest.raises(IntegrityError):
            db.commit()

    def test_company_projects_relationship(self, db: Session) -> None:
        """Test that company has projects relationship."""
        company = Company(name="プロジェクト関連テスト")
        db.add(company)
        db.commit()
        db.refresh(company)

        # projects relationship should exist and be empty initially
        assert hasattr(company, "projects")
        assert company.projects == []
