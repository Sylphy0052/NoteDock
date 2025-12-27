"""Tests for Project API endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestProjectAPI:
    """Tests for Project API endpoints."""

    def test_create_project(self, client: TestClient) -> None:
        """Test creating a project via API."""
        response = client.post(
            "/api/projects",
            json={"name": "APIテストプロジェクト"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "APIテストプロジェクト"
        assert "id" in data
        assert "created_at" in data

    def test_create_project_with_company(self, client: TestClient) -> None:
        """Test creating a project with a company."""
        # Create company first
        company_response = client.post(
            "/api/companies",
            json={"name": "プロジェクト用会社"}
        )
        company_id = company_response.json()["id"]

        response = client.post(
            "/api/projects",
            json={"name": "会社付きプロジェクト", "company_id": company_id}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["company_id"] == company_id
        assert data["company"]["name"] == "プロジェクト用会社"

    def test_create_project_invalid_name(self, client: TestClient) -> None:
        """Test creating a project with invalid name."""
        response = client.post(
            "/api/projects",
            json={"name": ""}
        )
        assert response.status_code == 400  # Validation error

    def test_get_projects(self, client: TestClient) -> None:
        """Test getting all projects."""
        # Create some projects first
        client.post("/api/projects", json={"name": "一覧テストプロジェクトA"})
        client.post("/api/projects", json={"name": "一覧テストプロジェクトB"})

        response = client.get("/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_get_project(self, client: TestClient) -> None:
        """Test getting a single project."""
        # Create a project first
        create_response = client.post(
            "/api/projects",
            json={"name": "取得テストプロジェクト"}
        )
        project_id = create_response.json()["id"]

        response = client.get(f"/api/projects/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "取得テストプロジェクト"

    def test_get_project_not_found(self, client: TestClient) -> None:
        """Test getting a non-existent project."""
        response = client.get("/api/projects/99999")
        assert response.status_code == 404

    def test_update_project(self, client: TestClient) -> None:
        """Test updating a project."""
        # Create a project first
        create_response = client.post(
            "/api/projects",
            json={"name": "更新前プロジェクト"}
        )
        project_id = create_response.json()["id"]

        response = client.put(
            f"/api/projects/{project_id}",
            json={"name": "更新後プロジェクト"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "更新後プロジェクト"

    def test_delete_project(self, client: TestClient) -> None:
        """Test deleting a project."""
        # Create a project first
        create_response = client.post(
            "/api/projects",
            json={"name": "削除テストプロジェクト"}
        )
        project_id = create_response.json()["id"]

        response = client.delete(f"/api/projects/{project_id}")
        assert response.status_code == 200

        # Verify it's deleted
        get_response = client.get(f"/api/projects/{project_id}")
        assert get_response.status_code == 404

    def test_search_projects(self, client: TestClient) -> None:
        """Test searching projects."""
        # Create projects first
        client.post("/api/projects", json={"name": "検索対象プロジェクト1"})
        client.post("/api/projects", json={"name": "検索対象プロジェクト2"})
        client.post("/api/projects", json={"name": "他プロジェクト"})

        response = client.get("/api/projects/search?q=検索対象")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2

    def test_get_project_summary(self, client: TestClient) -> None:
        """Test getting project summary for hover preview."""
        # Create company and project
        company_response = client.post(
            "/api/companies",
            json={"name": "サマリー用会社"}
        )
        company_id = company_response.json()["id"]

        create_response = client.post(
            "/api/projects",
            json={"name": "サマリーテストプロジェクト", "company_id": company_id}
        )
        project_id = create_response.json()["id"]

        response = client.get(f"/api/projects/{project_id}/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "サマリーテストプロジェクト"
        assert data["company_name"] == "サマリー用会社"

    def test_get_projects_by_company(self, client: TestClient) -> None:
        """Test getting projects filtered by company."""
        # Create company and projects
        company_response = client.post(
            "/api/companies",
            json={"name": "フィルタ用会社"}
        )
        company_id = company_response.json()["id"]

        client.post("/api/projects", json={"name": "会社プロジェクト1", "company_id": company_id})
        client.post("/api/projects", json={"name": "会社プロジェクト2", "company_id": company_id})
        client.post("/api/projects", json={"name": "他のプロジェクト"})

        response = client.get(f"/api/projects?company_id={company_id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        for project in data:
            assert project["company_id"] == company_id
