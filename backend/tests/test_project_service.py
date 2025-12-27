"""Tests for ProjectService."""
import pytest
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.project import Project
from app.models.note import Note
from app.schemas.project import ProjectCreate, ProjectUpdate


class TestProjectService:
    """Tests for ProjectService."""

    def test_create_project(self, db: Session) -> None:
        """Test creating a project."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        data = ProjectCreate(name="新規プロジェクト")
        project = service.create_project(data)

        assert project.id is not None
        assert project.name == "新規プロジェクト"
        assert project.company_id is None

    def test_create_project_with_company(self, db: Session) -> None:
        """Test creating a project with a company."""
        from app.services.project_service import ProjectService
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate

        company_service = CompanyService(db)
        company = company_service.create_company(CompanyCreate(name="テスト会社"))

        service = ProjectService(db)
        data = ProjectCreate(name="会社付きプロジェクト", company_id=company.id)
        project = service.create_project(data)

        assert project.id is not None
        assert project.company_id == company.id

    def test_create_project_duplicate_name_allowed(self, db: Session) -> None:
        """Test that duplicate project names are allowed."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        data1 = ProjectCreate(name="同名プロジェクト")
        data2 = ProjectCreate(name="同名プロジェクト")

        project1 = service.create_project(data1)
        project2 = service.create_project(data2)

        assert project1.id != project2.id
        assert project1.name == project2.name

    def test_get_project(self, db: Session) -> None:
        """Test getting a project by ID."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        created = service.create_project(ProjectCreate(name="取得テスト"))

        project = service.get_project(created.id)
        assert project.name == "取得テスト"

    def test_get_project_not_found(self, db: Session) -> None:
        """Test getting a non-existent project raises NotFoundError."""
        from app.services.project_service import ProjectService
        from app.core.errors import NotFoundError

        service = ProjectService(db)
        with pytest.raises(NotFoundError):
            service.get_project(99999)

    def test_get_all_projects(self, db: Session) -> None:
        """Test getting all projects."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        service.create_project(ProjectCreate(name="プロジェクトA"))
        service.create_project(ProjectCreate(name="プロジェクトB"))

        projects = service.get_all_projects()
        assert len(projects) == 2

    def test_update_project(self, db: Session) -> None:
        """Test updating a project."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        created = service.create_project(ProjectCreate(name="更新前"))

        updated = service.update_project(created.id, ProjectUpdate(name="更新後"))
        assert updated.name == "更新後"

    def test_update_project_company(self, db: Session) -> None:
        """Test updating a project's company."""
        from app.services.project_service import ProjectService
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate

        company_service = CompanyService(db)
        company = company_service.create_company(CompanyCreate(name="新会社"))

        service = ProjectService(db)
        created = service.create_project(ProjectCreate(name="会社変更テスト"))

        updated = service.update_project(created.id, ProjectUpdate(company_id=company.id))
        assert updated.company_id == company.id

    def test_delete_project(self, db: Session) -> None:
        """Test deleting a project."""
        from app.services.project_service import ProjectService
        from app.core.errors import NotFoundError

        service = ProjectService(db)
        created = service.create_project(ProjectCreate(name="削除テスト"))
        project_id = created.id

        service.delete_project(project_id)

        with pytest.raises(NotFoundError):
            service.get_project(project_id)

    def test_search_projects(self, db: Session) -> None:
        """Test searching projects by name."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        service.create_project(ProjectCreate(name="検索対象プロジェクト1"))
        service.create_project(ProjectCreate(name="検索対象プロジェクト2"))
        service.create_project(ProjectCreate(name="別プロジェクト"))

        results = service.search_projects("検索対象")
        assert len(results) == 2

    def test_get_project_response(self, db: Session) -> None:
        """Test getting project response with note count."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        project = service.create_project(ProjectCreate(name="レスポンステスト"))

        # Add notes
        note1 = Note(title="ノート1", content_md="", project_id=project.id)
        note2 = Note(title="ノート2", content_md="", project_id=project.id)
        db.add_all([note1, note2])
        db.commit()

        response = service.get_project_response(project.id)
        assert response.id == project.id
        assert response.name == "レスポンステスト"
        assert response.note_count == 2

    def test_get_all_projects_with_count(self, db: Session) -> None:
        """Test getting all projects with note counts."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        project1 = service.create_project(ProjectCreate(name="プロジェクト1"))
        project2 = service.create_project(ProjectCreate(name="プロジェクト2"))

        # Add notes to project1
        note = Note(title="ノート", content_md="", project_id=project1.id)
        db.add(note)
        db.commit()

        responses = service.get_all_projects_with_count()
        assert len(responses) == 2

        # Find projects by name
        p1 = next(p for p in responses if p.name == "プロジェクト1")
        p2 = next(p for p in responses if p.name == "プロジェクト2")
        assert p1.note_count == 1
        assert p2.note_count == 0

    def test_get_project_summary(self, db: Session) -> None:
        """Test getting project summary for hover preview."""
        from app.services.project_service import ProjectService
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate

        company_service = CompanyService(db)
        company = company_service.create_company(CompanyCreate(name="サマリー会社"))

        service = ProjectService(db)
        project = service.create_project(
            ProjectCreate(name="サマリーテスト", company_id=company.id)
        )

        summary = service.get_project_summary(project.id)
        assert summary.id == project.id
        assert summary.name == "サマリーテスト"
        assert summary.company_name == "サマリー会社"

    def test_get_project_summary_no_company(self, db: Session) -> None:
        """Test getting project summary without company."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        project = service.create_project(ProjectCreate(name="会社なしサマリー"))

        summary = service.get_project_summary(project.id)
        assert summary.id == project.id
        assert summary.company_name is None

    def test_get_projects_by_company(self, db: Session) -> None:
        """Test getting projects by company."""
        from app.services.project_service import ProjectService
        from app.services.company_service import CompanyService
        from app.schemas.company import CompanyCreate

        company_service = CompanyService(db)
        company = company_service.create_company(CompanyCreate(name="絞り込み会社"))

        service = ProjectService(db)
        service.create_project(ProjectCreate(name="会社プロジェクト1", company_id=company.id))
        service.create_project(ProjectCreate(name="会社プロジェクト2", company_id=company.id))
        service.create_project(ProjectCreate(name="他プロジェクト"))

        projects = service.get_projects_by_company(company.id)
        assert len(projects) == 2

    def test_get_project_notes(self, db: Session) -> None:
        """Test getting notes for a project."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        project = service.create_project(ProjectCreate(name="ノート取得テスト"))

        # Add notes
        note1 = Note(title="ノート1", content_md="内容1", project_id=project.id)
        note2 = Note(title="ノート2", content_md="内容2", project_id=project.id)
        db.add_all([note1, note2])
        db.commit()

        notes = service.get_project_notes(project.id)
        assert len(notes) == 2

    def test_get_project_notes_empty(self, db: Session) -> None:
        """Test getting notes for a project with no notes."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        project = service.create_project(ProjectCreate(name="空プロジェクト"))

        notes = service.get_project_notes(project.id)
        assert len(notes) == 0

    def test_build_ai_context(self, db: Session) -> None:
        """Test building AI context from project notes."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        project = service.create_project(ProjectCreate(name="AIコンテキストテスト"))

        # Add notes
        note1 = Note(title="ノート1", content_md="内容1", project_id=project.id)
        note2 = Note(title="ノート2", content_md="内容2", project_id=project.id)
        db.add_all([note1, note2])
        db.commit()

        context = service.build_ai_context(project.id)

        assert "AIコンテキストテスト" in context
        assert "ノート1" in context
        assert "内容1" in context
        assert "ノート2" in context
        assert "内容2" in context
        assert "ノート数: 2件" in context

    def test_build_ai_context_empty_project(self, db: Session) -> None:
        """Test building AI context for project with no notes."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        project = service.create_project(ProjectCreate(name="空のプロジェクト"))

        context = service.build_ai_context(project.id)

        assert "空のプロジェクト" in context
        assert "ノートがありません" in context

    def test_build_ai_context_max_notes(self, db: Session) -> None:
        """Test that build_ai_context respects max_notes limit."""
        from app.services.project_service import ProjectService

        service = ProjectService(db)
        project = service.create_project(ProjectCreate(name="多ノートプロジェクト"))

        # Add more notes than the limit
        for i in range(10):
            note = Note(
                title=f"ノート{i}",
                content_md=f"内容{i}",
                project_id=project.id
            )
            db.add(note)
        db.commit()

        # Limit to 5 notes
        context = service.build_ai_context(project.id, max_notes=5)

        # Should contain at most 5 notes
        assert "ノート数: 5件" in context
