"""Tests for Note schema with Project information."""
import pytest
from datetime import datetime
from pydantic import ValidationError

from app.schemas.note import (
    NoteBase,
    NoteCreate,
    NoteUpdate,
    NoteSummary,
    NoteResponse,
)
from app.schemas.project import ProjectResponse


class TestNoteBaseWithProject:
    """Tests for NoteBase schema with project_id."""

    def test_note_base_with_project_id(self) -> None:
        """Test creating NoteBase with project_id."""
        note = NoteBase(
            title="プロジェクト付きノート",
            content_md="テスト内容",
            project_id=1
        )
        assert note.project_id == 1

    def test_note_base_without_project_id(self) -> None:
        """Test creating NoteBase without project_id (should default to None)."""
        note = NoteBase(title="プロジェクトなしノート")
        assert note.project_id is None


class TestNoteCreateWithProject:
    """Tests for NoteCreate schema with project_id."""

    def test_note_create_with_project_id(self) -> None:
        """Test creating NoteCreate with project_id."""
        note = NoteCreate(
            title="新規ノート",
            content_md="内容",
            project_id=5
        )
        assert note.project_id == 5

    def test_note_create_inherits_project_id(self) -> None:
        """Test that NoteCreate inherits project_id from NoteBase."""
        note = NoteCreate(
            title="継承テスト",
            project_id=10,
            tag_names=["タグ1"]
        )
        assert note.project_id == 10
        assert note.tag_names == ["タグ1"]


class TestNoteUpdateWithProject:
    """Tests for NoteUpdate schema with project_id."""

    def test_note_update_with_project_id(self) -> None:
        """Test updating note with project_id."""
        update = NoteUpdate(project_id=3)
        assert update.project_id == 3

    def test_note_update_project_id_none(self) -> None:
        """Test that project_id can be unset (None)."""
        update = NoteUpdate(title="更新タイトル")
        assert update.project_id is None

    def test_note_update_change_project(self) -> None:
        """Test changing project_id in update."""
        update = NoteUpdate(title="プロジェクト変更", project_id=7)
        assert update.title == "プロジェクト変更"
        assert update.project_id == 7


class TestNoteSummaryWithProject:
    """Tests for NoteSummary schema with project information."""

    def test_note_summary_with_project_id(self) -> None:
        """Test NoteSummary includes project_id."""
        summary = NoteSummary(
            id=1,
            title="サマリーテスト",
            updated_at=datetime.now(),
            project_id=2
        )
        assert summary.project_id == 2

    def test_note_summary_without_project(self) -> None:
        """Test NoteSummary without project_id."""
        summary = NoteSummary(
            id=1,
            title="プロジェクトなし",
            updated_at=datetime.now()
        )
        assert summary.project_id is None

    def test_note_summary_with_project_name(self) -> None:
        """Test NoteSummary includes project_name for display."""
        summary = NoteSummary(
            id=1,
            title="プロジェクト名付き",
            updated_at=datetime.now(),
            project_id=3,
            project_name="テストプロジェクト"
        )
        assert summary.project_name == "テストプロジェクト"


class TestNoteResponseWithProject:
    """Tests for NoteResponse schema with project information."""

    def test_note_response_with_project_id(self) -> None:
        """Test NoteResponse includes project_id."""
        response = NoteResponse(
            id=1,
            title="レスポンステスト",
            content_md="内容",
            is_pinned=False,
            is_readonly=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            project_id=4
        )
        assert response.project_id == 4

    def test_note_response_with_project_object(self) -> None:
        """Test NoteResponse includes full project object."""
        project = ProjectResponse(
            id=5,
            name="フルプロジェクト",
            company_id=None,
            company=None,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            note_count=10
        )
        response = NoteResponse(
            id=1,
            title="プロジェクト付きレスポンス",
            content_md="内容",
            is_pinned=False,
            is_readonly=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            project_id=5,
            project=project
        )
        assert response.project is not None
        assert response.project.id == 5
        assert response.project.name == "フルプロジェクト"
        assert response.project.note_count == 10

    def test_note_response_without_project(self) -> None:
        """Test NoteResponse without project."""
        response = NoteResponse(
            id=1,
            title="プロジェクトなし",
            content_md="",
            is_pinned=False,
            is_readonly=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        assert response.project_id is None
        assert response.project is None

    def test_note_response_project_with_company(self) -> None:
        """Test NoteResponse with project that has company."""
        from app.schemas.company import CompanyResponse

        company = CompanyResponse(
            id=1,
            name="テスト会社",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            project_count=5
        )
        project = ProjectResponse(
            id=2,
            name="会社付きプロジェクト",
            company_id=1,
            company=company,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            note_count=3
        )
        response = NoteResponse(
            id=1,
            title="会社付きプロジェクトのノート",
            content_md="テスト",
            is_pinned=False,
            is_readonly=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            project_id=2,
            project=project
        )
        assert response.project.company is not None
        assert response.project.company.name == "テスト会社"
