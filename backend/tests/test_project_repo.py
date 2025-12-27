"""Tests for ProjectRepository."""
import pytest
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.project import Project
from app.models.note import Note


class TestProjectRepository:
    """Tests for ProjectRepository."""

    def test_create_project(self, db: Session) -> None:
        """Test creating a project."""
        from app.repositories.project_repo import ProjectRepository

        repo = ProjectRepository(db)
        project = repo.create(name="テストプロジェクト")

        assert project.id is not None
        assert project.name == "テストプロジェクト"
        assert project.company_id is None

    def test_create_project_with_company(self, db: Session) -> None:
        """Test creating a project with a company."""
        from app.repositories.project_repo import ProjectRepository
        from app.repositories.company_repo import CompanyRepository

        company_repo = CompanyRepository(db)
        company = company_repo.create(name="テスト会社")

        repo = ProjectRepository(db)
        project = repo.create(name="会社付きプロジェクト", company_id=company.id)

        assert project.id is not None
        assert project.name == "会社付きプロジェクト"
        assert project.company_id == company.id

    def test_get_by_id(self, db: Session) -> None:
        """Test getting a project by ID."""
        from app.repositories.project_repo import ProjectRepository

        repo = ProjectRepository(db)
        created = repo.create(name="取得テストプロジェクト")

        found = repo.get_by_id(created.id)
        assert found is not None
        assert found.name == "取得テストプロジェクト"

    def test_get_by_id_not_found(self, db: Session) -> None:
        """Test getting a non-existent project."""
        from app.repositories.project_repo import ProjectRepository

        repo = ProjectRepository(db)
        found = repo.get_by_id(99999)
        assert found is None

    def test_get_all(self, db: Session) -> None:
        """Test getting all projects."""
        from app.repositories.project_repo import ProjectRepository

        repo = ProjectRepository(db)
        repo.create(name="プロジェクトA")
        repo.create(name="プロジェクトB")
        repo.create(name="プロジェクトC")

        projects = repo.get_all()
        assert len(projects) == 3

    def test_get_all_ordered_by_name(self, db: Session) -> None:
        """Test that projects are ordered by name."""
        from app.repositories.project_repo import ProjectRepository

        repo = ProjectRepository(db)
        repo.create(name="Cプロジェクト")
        repo.create(name="Aプロジェクト")
        repo.create(name="Bプロジェクト")

        projects = repo.get_all()
        assert projects[0].name == "Aプロジェクト"
        assert projects[1].name == "Bプロジェクト"
        assert projects[2].name == "Cプロジェクト"

    def test_get_by_company(self, db: Session) -> None:
        """Test getting projects by company."""
        from app.repositories.project_repo import ProjectRepository
        from app.repositories.company_repo import CompanyRepository

        company_repo = CompanyRepository(db)
        company1 = company_repo.create(name="会社1")
        company2 = company_repo.create(name="会社2")

        repo = ProjectRepository(db)
        repo.create(name="プロジェクト1-1", company_id=company1.id)
        repo.create(name="プロジェクト1-2", company_id=company1.id)
        repo.create(name="プロジェクト2-1", company_id=company2.id)

        projects = repo.get_by_company(company1.id)
        assert len(projects) == 2

    def test_update(self, db: Session) -> None:
        """Test updating a project."""
        from app.repositories.project_repo import ProjectRepository

        repo = ProjectRepository(db)
        project = repo.create(name="更新前")

        updated = repo.update(project, name="更新後")
        assert updated.name == "更新後"

    def test_update_company(self, db: Session) -> None:
        """Test updating a project's company."""
        from app.repositories.project_repo import ProjectRepository
        from app.repositories.company_repo import CompanyRepository

        company_repo = CompanyRepository(db)
        company = company_repo.create(name="新会社")

        repo = ProjectRepository(db)
        project = repo.create(name="会社変更テスト")

        updated = repo.update(project, company_id=company.id)
        assert updated.company_id == company.id

    def test_delete(self, db: Session) -> None:
        """Test deleting a project."""
        from app.repositories.project_repo import ProjectRepository

        repo = ProjectRepository(db)
        project = repo.create(name="削除テスト")
        project_id = project.id

        repo.delete(project)
        assert repo.get_by_id(project_id) is None

    def test_search_by_name(self, db: Session) -> None:
        """Test searching projects by name."""
        from app.repositories.project_repo import ProjectRepository

        repo = ProjectRepository(db)
        repo.create(name="検索対象プロジェクトA")
        repo.create(name="検索対象プロジェクトB")
        repo.create(name="別のプロジェクト")

        results = repo.search_by_name("検索対象")
        assert len(results) == 2

    def test_get_note_count(self, db: Session) -> None:
        """Test getting note count for a project."""
        from app.repositories.project_repo import ProjectRepository

        repo = ProjectRepository(db)
        project = repo.create(name="ノート数テスト")

        # Create notes for the project
        note1 = Note(title="ノート1", content_md="", project_id=project.id)
        note2 = Note(title="ノート2", content_md="", project_id=project.id)
        db.add_all([note1, note2])
        db.commit()

        count = repo.get_note_count(project.id)
        assert count == 2

    def test_get_projects_with_no_company(self, db: Session) -> None:
        """Test getting projects without company."""
        from app.repositories.project_repo import ProjectRepository
        from app.repositories.company_repo import CompanyRepository

        company_repo = CompanyRepository(db)
        company = company_repo.create(name="会社")

        repo = ProjectRepository(db)
        repo.create(name="会社なしプロジェクト1")
        repo.create(name="会社なしプロジェクト2")
        repo.create(name="会社ありプロジェクト", company_id=company.id)

        projects = repo.get_projects_without_company()
        assert len(projects) == 2
