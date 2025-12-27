"""Tests for Project model."""
import pytest
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.project import Project


class TestProjectModel:
    """Tests for Project SQLAlchemy model."""

    def test_create_project_without_company(self, db: Session) -> None:
        """Test creating a project without a company."""
        project = Project(name="独立プロジェクト")
        db.add(project)
        db.commit()
        db.refresh(project)

        assert project.id is not None
        assert project.name == "独立プロジェクト"
        assert project.company_id is None
        assert project.company is None
        assert project.created_at is not None
        assert project.updated_at is not None

    def test_create_project_with_company(self, db: Session) -> None:
        """Test creating a project with a company."""
        company = Company(name="テスト会社")
        db.add(company)
        db.commit()

        project = Project(name="会社プロジェクト", company_id=company.id)
        db.add(project)
        db.commit()
        db.refresh(project)

        assert project.id is not None
        assert project.name == "会社プロジェクト"
        assert project.company_id == company.id
        assert project.company is not None
        assert project.company.name == "テスト会社"

    def test_project_has_timestamps(self, db: Session) -> None:
        """Test that project has created_at and updated_at timestamps."""
        project = Project(name="タイムスタンプテスト")
        db.add(project)
        db.commit()
        db.refresh(project)

        assert project.created_at is not None
        assert project.updated_at is not None
        assert project.created_at <= project.updated_at

    def test_project_name_required(self, db: Session) -> None:
        """Test that project name is required."""
        from sqlalchemy.exc import IntegrityError

        project = Project(name=None)  # type: ignore
        db.add(project)
        with pytest.raises(IntegrityError):
            db.commit()

    def test_company_projects_relationship(self, db: Session) -> None:
        """Test that company.projects contains related projects."""
        company = Company(name="プロジェクト関連テスト会社")
        db.add(company)
        db.commit()

        project1 = Project(name="プロジェクト1", company_id=company.id)
        project2 = Project(name="プロジェクト2", company_id=company.id)
        db.add_all([project1, project2])
        db.commit()
        db.refresh(company)

        assert len(company.projects) == 2
        assert project1 in company.projects
        assert project2 in company.projects

    def test_delete_company_sets_project_company_null(self, db: Session) -> None:
        """Test that deleting a company sets project.company_id to NULL."""
        company = Company(name="削除テスト会社")
        db.add(company)
        db.commit()

        project = Project(name="関連プロジェクト", company_id=company.id)
        db.add(project)
        db.commit()
        project_id = project.id

        # Delete company
        db.delete(company)
        db.commit()

        # Refresh project
        db.expire_all()
        project = db.get(Project, project_id)
        assert project is not None
        assert project.company_id is None
