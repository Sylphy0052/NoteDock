"""Tests for Project Pydantic schemas."""
import pytest
from datetime import datetime
from pydantic import ValidationError

from app.schemas.project import (
    ProjectBase,
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectSummary,
)
from app.schemas.company import CompanyResponse


class TestProjectSchemas:
    """Tests for Project schemas."""

    def test_project_base_valid(self) -> None:
        """Test ProjectBase with valid data."""
        schema = ProjectBase(name="テストプロジェクト")
        assert schema.name == "テストプロジェクト"
        assert schema.company_id is None

    def test_project_base_with_company(self) -> None:
        """Test ProjectBase with company_id."""
        schema = ProjectBase(name="テストプロジェクト", company_id=1)
        assert schema.name == "テストプロジェクト"
        assert schema.company_id == 1

    def test_project_base_empty_name(self) -> None:
        """Test ProjectBase with empty name fails."""
        with pytest.raises(ValidationError):
            ProjectBase(name="")

    def test_project_base_name_too_long(self) -> None:
        """Test ProjectBase with too long name fails."""
        with pytest.raises(ValidationError):
            ProjectBase(name="a" * 256)

    def test_project_create_valid(self) -> None:
        """Test ProjectCreate with valid data."""
        schema = ProjectCreate(name="新規プロジェクト", company_id=1)
        assert schema.name == "新規プロジェクト"
        assert schema.company_id == 1

    def test_project_update_partial(self) -> None:
        """Test ProjectUpdate with partial data."""
        schema = ProjectUpdate(name="更新後プロジェクト")
        assert schema.name == "更新後プロジェクト"
        assert schema.company_id is None

    def test_project_update_company_only(self) -> None:
        """Test ProjectUpdate with company_id only."""
        schema = ProjectUpdate(company_id=2)
        assert schema.name is None
        assert schema.company_id == 2

    def test_project_update_empty(self) -> None:
        """Test ProjectUpdate with no data."""
        schema = ProjectUpdate()
        assert schema.name is None
        assert schema.company_id is None

    def test_project_response_basic(self) -> None:
        """Test ProjectResponse with basic data."""
        now = datetime.now()
        schema = ProjectResponse(
            id=1,
            name="レスポンステスト",
            company_id=None,
            company=None,
            created_at=now,
            updated_at=now,
            note_count=0
        )
        assert schema.id == 1
        assert schema.name == "レスポンステスト"
        assert schema.company is None
        assert schema.note_count == 0

    def test_project_response_with_company(self) -> None:
        """Test ProjectResponse with company."""
        now = datetime.now()
        company = CompanyResponse(
            id=1,
            name="テスト会社",
            created_at=now,
            updated_at=now,
            project_count=5
        )
        schema = ProjectResponse(
            id=1,
            name="会社付きプロジェクト",
            company_id=1,
            company=company,
            created_at=now,
            updated_at=now,
            note_count=10
        )
        assert schema.id == 1
        assert schema.company is not None
        assert schema.company.name == "テスト会社"
        assert schema.note_count == 10

    def test_project_summary(self) -> None:
        """Test ProjectSummary."""
        schema = ProjectSummary(
            id=1,
            name="サマリーテスト",
            company_name="テスト会社"
        )
        assert schema.id == 1
        assert schema.name == "サマリーテスト"
        assert schema.company_name == "テスト会社"

    def test_project_summary_no_company(self) -> None:
        """Test ProjectSummary without company."""
        schema = ProjectSummary(id=2, name="会社なしプロジェクト")
        assert schema.id == 2
        assert schema.name == "会社なしプロジェクト"
        assert schema.company_name is None
