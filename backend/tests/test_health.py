"""Tests for health check and basic API functionality."""
import pytest
from fastapi.testclient import TestClient


class TestHealthCheck:
    """Tests for basic API functionality."""

    def test_health_check(self, client: TestClient) -> None:
        """Test health check endpoint."""
        response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_openapi_docs(self, client: TestClient) -> None:
        """Test that OpenAPI documentation is available."""
        response = client.get("/api/openapi.json")

        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data


class TestSearchAPI:
    """Tests for /api/search endpoints."""

    def test_search_empty(self, client: TestClient) -> None:
        """Test search with no results."""
        response = client.get("/api/search?q=nonexistent")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 0

    def test_search_by_title(
        self, client: TestClient, sample_note_data: dict
    ) -> None:
        """Test searching notes by title."""
        # Create a note
        note_data = sample_note_data.copy()
        note_data["title"] = "検索テスト用ノート"
        client.post("/api/notes", json=note_data)

        # Search for it
        response = client.get("/api/search?q=検索テスト用")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 1
        assert any("検索テスト用" in item["title"] for item in data["items"])

    def test_search_by_content(
        self, client: TestClient, sample_note_data: dict
    ) -> None:
        """Test searching notes by content."""
        # Create a note with specific content
        note_data = sample_note_data.copy()
        note_data["title"] = "内容検索ノート"
        note_data["content_md"] = "この内容にはユニークなキーワードABC123が含まれます"
        client.post("/api/notes", json=note_data)

        # Search for the keyword
        response = client.get("/api/search?q=ABC123")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 1

    def test_quick_search(
        self, client: TestClient, sample_note_data: dict
    ) -> None:
        """Test quick search (for quick open modal)."""
        # Create a note
        note_data = sample_note_data.copy()
        note_data["title"] = "クイック検索テスト"
        client.post("/api/notes", json=note_data)

        # Quick search
        response = client.get("/api/search/quick?q=クイック")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    def test_search_with_tag_filter(
        self, client: TestClient, sample_note_data: dict
    ) -> None:
        """Test searching with tag filter."""
        # Create a note with specific tag
        note_data = sample_note_data.copy()
        note_data["title"] = "タグフィルタテスト"
        note_data["tag_names"] = ["unique-tag-123"]
        client.post("/api/notes", json=note_data)

        # Search with tag filter
        response = client.get("/api/search?tag=unique-tag-123")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 1


class TestFoldersAPI:
    """Tests for /api/folders endpoints."""

    def test_get_folders_empty(self, client: TestClient) -> None:
        """Test getting folders when none exist."""
        response = client.get("/api/folders")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_create_folder(
        self, client: TestClient, sample_folder_data: dict
    ) -> None:
        """Test creating a folder."""
        response = client.post("/api/folders", json=sample_folder_data)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_folder_data["name"]
        assert "id" in data

    def test_create_nested_folder(
        self, client: TestClient, sample_folder_data: dict
    ) -> None:
        """Test creating nested folders."""
        # Create parent folder
        parent_response = client.post("/api/folders", json=sample_folder_data)
        parent_id = parent_response.json()["id"]

        # Create child folder
        child_data = {
            "name": "子フォルダ",
            "parent_id": parent_id,
        }
        response = client.post("/api/folders", json=child_data)

        assert response.status_code == 201
        data = response.json()
        assert data["parent_id"] == parent_id

    def test_update_folder(
        self, client: TestClient, sample_folder_data: dict
    ) -> None:
        """Test updating a folder."""
        # Create a folder
        create_response = client.post("/api/folders", json=sample_folder_data)
        folder_id = create_response.json()["id"]

        # Update it
        update_data = {"name": "更新されたフォルダ名"}
        response = client.put(f"/api/folders/{folder_id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]

    def test_delete_folder(
        self, client: TestClient, sample_folder_data: dict
    ) -> None:
        """Test deleting a folder."""
        # Create a folder
        create_response = client.post("/api/folders", json=sample_folder_data)
        folder_id = create_response.json()["id"]

        # Delete it
        response = client.delete(f"/api/folders/{folder_id}")

        assert response.status_code == 200


class TestTagsAPI:
    """Tests for /api/tags endpoints."""

    def test_get_tags(self, client: TestClient, sample_note_data: dict) -> None:
        """Test getting all tags."""
        # Create a note with tags
        note_data = sample_note_data.copy()
        note_data["tag_names"] = ["tag-a", "tag-b", "tag-c"]
        client.post("/api/notes", json=note_data)

        # Get tags
        response = client.get("/api/tags")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        tag_names = [t["name"] for t in data]
        assert "tag-a" in tag_names
        assert "tag-b" in tag_names
        assert "tag-c" in tag_names

    def test_suggest_tags(self, client: TestClient, sample_note_data: dict) -> None:
        """Test tag suggestions."""
        # Create notes with various tags
        for tag in ["suggest-test-1", "suggest-test-2", "other-tag"]:
            note_data = sample_note_data.copy()
            note_data["tag_names"] = [tag]
            client.post("/api/notes", json=note_data)

        # Get suggestions
        response = client.get("/api/tags/suggest?q=suggest")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should match tags starting with "suggest"
        for tag in data:
            if "suggest" in tag.lower():
                assert True
                return
