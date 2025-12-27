"""Tests for Company API endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestCompanyAPI:
    """Tests for Company API endpoints."""

    def test_create_company(self, client: TestClient) -> None:
        """Test creating a company via API."""
        response = client.post(
            "/api/companies",
            json={"name": "APIテスト会社"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "APIテスト会社"
        assert "id" in data
        assert "created_at" in data

    def test_create_company_invalid_name(self, client: TestClient) -> None:
        """Test creating a company with invalid name."""
        response = client.post(
            "/api/companies",
            json={"name": ""}
        )
        assert response.status_code == 400  # Validation error

    def test_get_companies(self, client: TestClient) -> None:
        """Test getting all companies."""
        # Create some companies first
        client.post("/api/companies", json={"name": "一覧テスト会社A"})
        client.post("/api/companies", json={"name": "一覧テスト会社B"})

        response = client.get("/api/companies")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_get_company(self, client: TestClient) -> None:
        """Test getting a single company."""
        # Create a company first
        create_response = client.post(
            "/api/companies",
            json={"name": "取得テスト会社"}
        )
        company_id = create_response.json()["id"]

        response = client.get(f"/api/companies/{company_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "取得テスト会社"

    def test_get_company_not_found(self, client: TestClient) -> None:
        """Test getting a non-existent company."""
        response = client.get("/api/companies/99999")
        assert response.status_code == 404

    def test_update_company(self, client: TestClient) -> None:
        """Test updating a company."""
        # Create a company first
        create_response = client.post(
            "/api/companies",
            json={"name": "更新前会社"}
        )
        company_id = create_response.json()["id"]

        response = client.put(
            f"/api/companies/{company_id}",
            json={"name": "更新後会社"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "更新後会社"

    def test_delete_company(self, client: TestClient) -> None:
        """Test deleting a company."""
        # Create a company first
        create_response = client.post(
            "/api/companies",
            json={"name": "削除テスト会社"}
        )
        company_id = create_response.json()["id"]

        response = client.delete(f"/api/companies/{company_id}")
        assert response.status_code == 200

        # Verify it's deleted
        get_response = client.get(f"/api/companies/{company_id}")
        assert get_response.status_code == 404

    def test_search_companies(self, client: TestClient) -> None:
        """Test searching companies."""
        # Create companies first
        client.post("/api/companies", json={"name": "株式会社検索テスト"})
        client.post("/api/companies", json={"name": "検索テスト商事"})
        client.post("/api/companies", json={"name": "XYZ株式会社"})

        response = client.get("/api/companies/search?q=検索テスト")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
