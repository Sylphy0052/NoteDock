"""Tests for Notes API with Project support."""
import pytest
from fastapi.testclient import TestClient


class TestNotesAPIProjectSupport:
    """Tests for Notes API project-related functionality."""

    def test_create_note_with_project_id(self, client: TestClient) -> None:
        """Test creating a note with project_id."""
        # Create a project first
        project_response = client.post(
            "/api/projects",
            json={"name": "API用プロジェクト"}
        )
        project_id = project_response.json()["id"]

        # Create note with project_id
        response = client.post(
            "/api/notes",
            json={
                "title": "プロジェクト付きノート",
                "content_md": "テスト内容",
                "project_id": project_id
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["project_id"] == project_id
        assert data["project"] is not None
        assert data["project"]["name"] == "API用プロジェクト"

    def test_create_note_without_project_id(self, client: TestClient) -> None:
        """Test creating a note without project_id."""
        response = client.post(
            "/api/notes",
            json={
                "title": "プロジェクトなしノート",
                "content_md": "テスト"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["project_id"] is None
        assert data["project"] is None

    def test_get_notes_filter_by_project(self, client: TestClient) -> None:
        """Test filtering notes by project_id."""
        # Create two projects
        proj1 = client.post("/api/projects", json={"name": "フィルタプロジェクト1"})
        proj2 = client.post("/api/projects", json={"name": "フィルタプロジェクト2"})
        project1_id = proj1.json()["id"]
        project2_id = proj2.json()["id"]

        # Create notes for different projects
        client.post("/api/notes", json={"title": "プロジェクト1ノート1", "project_id": project1_id})
        client.post("/api/notes", json={"title": "プロジェクト1ノート2", "project_id": project1_id})
        client.post("/api/notes", json={"title": "プロジェクト2ノート", "project_id": project2_id})
        client.post("/api/notes", json={"title": "プロジェクトなしノート"})

        # Filter by project1
        response = client.get(f"/api/notes?project_id={project1_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        for item in data["items"]:
            assert item["project_id"] == project1_id

    def test_get_notes_without_project_filter(self, client: TestClient) -> None:
        """Test getting all notes without project filter."""
        # Create project and notes
        proj = client.post("/api/projects", json={"name": "全件取得テストプロジェクト"})
        project_id = proj.json()["id"]

        client.post("/api/notes", json={"title": "プロジェクト付き", "project_id": project_id})
        client.post("/api/notes", json={"title": "プロジェクトなし"})

        response = client.get("/api/notes")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 2

    def test_get_note_includes_project_info(self, client: TestClient) -> None:
        """Test that single note response includes project info."""
        # Create company and project
        company = client.post("/api/companies", json={"name": "ノート詳細用会社"})
        company_id = company.json()["id"]

        proj = client.post(
            "/api/projects",
            json={"name": "ノート詳細用プロジェクト", "company_id": company_id}
        )
        project_id = proj.json()["id"]

        # Create note
        note = client.post(
            "/api/notes",
            json={"title": "詳細テストノート", "project_id": project_id}
        )
        note_id = note.json()["id"]

        # Get note detail
        response = client.get(f"/api/notes/{note_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == project_id
        assert data["project"]["name"] == "ノート詳細用プロジェクト"
        assert data["project"]["company"]["name"] == "ノート詳細用会社"

    def test_update_note_project_id(self, client: TestClient) -> None:
        """Test updating a note's project_id."""
        # Create projects
        proj1 = client.post("/api/projects", json={"name": "更新前プロジェクト"})
        proj2 = client.post("/api/projects", json={"name": "更新後プロジェクト"})
        project1_id = proj1.json()["id"]
        project2_id = proj2.json()["id"]

        # Create note with project1
        note = client.post(
            "/api/notes",
            json={"title": "更新テストノート", "project_id": project1_id}
        )
        note_id = note.json()["id"]

        # Update to project2
        response = client.put(
            f"/api/notes/{note_id}",
            json={"project_id": project2_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == project2_id
        assert data["project"]["name"] == "更新後プロジェクト"

    def test_note_summary_includes_project_info(self, client: TestClient) -> None:
        """Test that note list items include project info."""
        proj = client.post("/api/projects", json={"name": "サマリー用プロジェクト"})
        project_id = proj.json()["id"]

        client.post(
            "/api/notes",
            json={"title": "サマリーテストノート", "project_id": project_id}
        )

        response = client.get(f"/api/notes?project_id={project_id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 1
        item = data["items"][0]
        assert item["project_id"] == project_id
        assert item["project_name"] == "サマリー用プロジェクト"

    def test_filter_by_folder_and_project(self, client: TestClient) -> None:
        """Test filtering notes by both folder and project."""
        # Create folder and project
        folder = client.post("/api/folders", json={"name": "フィルタ用フォルダ"})
        folder_id = folder.json()["id"]

        proj = client.post("/api/projects", json={"name": "フィルタ用プロジェクト"})
        project_id = proj.json()["id"]

        # Create notes
        client.post(
            "/api/notes",
            json={"title": "両方一致", "folder_id": folder_id, "project_id": project_id}
        )
        client.post(
            "/api/notes",
            json={"title": "フォルダのみ", "folder_id": folder_id}
        )
        client.post(
            "/api/notes",
            json={"title": "プロジェクトのみ", "project_id": project_id}
        )

        # Filter by both
        response = client.get(f"/api/notes?folder_id={folder_id}&project_id={project_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "両方一致"
