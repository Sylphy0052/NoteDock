"""Tests for Company Pydantic schemas."""
import pytest
from datetime import datetime, timezone
from pydantic import ValidationError


class TestCompanySchemas:
    """Tests for Company schemas."""

    def test_company_create_valid(self) -> None:
        """Test creating a valid CompanyCreate schema."""
        from app.schemas.company import CompanyCreate

        company = CompanyCreate(name="テスト会社")
        assert company.name == "テスト会社"

    def test_company_create_name_required(self) -> None:
        """Test that name is required for CompanyCreate."""
        from app.schemas.company import CompanyCreate

        with pytest.raises(ValidationError) as exc_info:
            CompanyCreate()  # type: ignore
        assert "name" in str(exc_info.value)

    def test_company_create_name_min_length(self) -> None:
        """Test that name must have at least 1 character."""
        from app.schemas.company import CompanyCreate

        with pytest.raises(ValidationError) as exc_info:
            CompanyCreate(name="")
        assert "min_length" in str(exc_info.value).lower() or "at least 1" in str(exc_info.value).lower()

    def test_company_create_name_max_length(self) -> None:
        """Test that name must not exceed 255 characters."""
        from app.schemas.company import CompanyCreate

        with pytest.raises(ValidationError) as exc_info:
            CompanyCreate(name="a" * 256)
        assert "max_length" in str(exc_info.value).lower() or "at most 255" in str(exc_info.value).lower()

    def test_company_update_all_fields_optional(self) -> None:
        """Test that all fields in CompanyUpdate are optional."""
        from app.schemas.company import CompanyUpdate

        # Empty update is valid
        update = CompanyUpdate()
        assert update.name is None

    def test_company_update_with_name(self) -> None:
        """Test CompanyUpdate with name."""
        from app.schemas.company import CompanyUpdate

        update = CompanyUpdate(name="新しい会社名")
        assert update.name == "新しい会社名"

    def test_company_response_from_model(self) -> None:
        """Test CompanyResponse creation from model attributes."""
        from app.schemas.company import CompanyResponse

        now = datetime.now(timezone.utc)
        response = CompanyResponse(
            id=1,
            name="テスト会社",
            created_at=now,
            updated_at=now,
            project_count=5
        )
        assert response.id == 1
        assert response.name == "テスト会社"
        assert response.project_count == 5

    def test_company_response_project_count_default(self) -> None:
        """Test that project_count defaults to 0."""
        from app.schemas.company import CompanyResponse

        now = datetime.now(timezone.utc)
        response = CompanyResponse(
            id=1,
            name="テスト会社",
            created_at=now,
            updated_at=now
        )
        assert response.project_count == 0
