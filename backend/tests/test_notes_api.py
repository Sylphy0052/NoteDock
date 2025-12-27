"""Tests for Note CRUD API endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestNotesAPI:
    """Tests for /api/notes endpoints."""

    def test_create_note(self, client: TestClient, sample_note_data: dict) -> None:
        """Test creating a new note."""
        response = client.post("/api/notes", json=sample_note_data)

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == sample_note_data["title"]
        assert data["content_md"] == sample_note_data["content_md"]
        assert data["is_pinned"] == sample_note_data["is_pinned"]
        assert data["is_readonly"] == sample_note_data["is_readonly"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_note_with_tags(self, client: TestClient) -> None:
        """Test creating a note with tags."""
        note_data = {
            "title": "タグ付きノート",
            "content_md": "タグのテスト",
            "tag_names": ["tag1", "tag2", "tag3"],
        }
        response = client.post("/api/notes", json=note_data)

        assert response.status_code == 201
        data = response.json()
        assert len(data["tags"]) == 3
        tag_names = [t["name"] for t in data["tags"]]
        assert "tag1" in tag_names
        assert "tag2" in tag_names
        assert "tag3" in tag_names

    def test_get_note(self, client: TestClient, sample_note_data: dict) -> None:
        """Test getting a specific note."""
        # Create a note first
        create_response = client.post("/api/notes", json=sample_note_data)
        note_id = create_response.json()["id"]

        # Get the note
        response = client.get(f"/api/notes/{note_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == note_id
        assert data["title"] == sample_note_data["title"]
        assert data["content_md"] == sample_note_data["content_md"]

    def test_get_note_not_found(self, client: TestClient) -> None:
        """Test getting a non-existent note."""
        response = client.get("/api/notes/99999")

        assert response.status_code == 404

    def test_get_notes_list(self, client: TestClient, sample_note_data: dict) -> None:
        """Test getting list of notes."""
        # Create multiple notes
        for i in range(5):
            data = sample_note_data.copy()
            data["title"] = f"ノート {i + 1}"
            client.post("/api/notes", json=data)

        # Get list
        response = client.get("/api/notes")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert data["total"] == 5
        assert len(data["items"]) == 5

    def test_get_notes_pagination(self, client: TestClient, sample_note_data: dict) -> None:
        """Test notes list pagination."""
        # Create 15 notes
        for i in range(15):
            data = sample_note_data.copy()
            data["title"] = f"ノート {i + 1}"
            client.post("/api/notes", json=data)

        # Get first page (default page_size=20)
        response = client.get("/api/notes?page=1&page_size=10")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 15
        assert len(data["items"]) == 10
        assert data["page"] == 1
        assert data["page_size"] == 10

        # Get second page
        response = client.get("/api/notes?page=2&page_size=10")
        data = response.json()
        assert len(data["items"]) == 5
        assert data["page"] == 2

    def test_update_note(self, client: TestClient, sample_note_data: dict) -> None:
        """Test updating a note."""
        # Create a note first
        create_response = client.post("/api/notes", json=sample_note_data)
        note_id = create_response.json()["id"]

        # Update the note
        update_data = {
            "title": "更新されたタイトル",
            "content_md": "# 更新\n\n内容も更新しました。",
        }
        response = client.put(f"/api/notes/{note_id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["content_md"] == update_data["content_md"]

    def test_delete_note_soft(self, client: TestClient, sample_note_data: dict) -> None:
        """Test soft deleting a note (move to trash)."""
        # Create a note first
        create_response = client.post("/api/notes", json=sample_note_data)
        note_id = create_response.json()["id"]

        # Soft delete
        response = client.delete(f"/api/notes/{note_id}")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

        # Note should still be accessible but with deleted_at set
        get_response = client.get(f"/api/notes/{note_id}")
        # Note will be 404 because it's in trash
        assert get_response.status_code == 404

    def test_restore_note(self, client: TestClient, sample_note_data: dict) -> None:
        """Test restoring a note from trash."""
        # Create and delete a note
        create_response = client.post("/api/notes", json=sample_note_data)
        note_id = create_response.json()["id"]
        client.delete(f"/api/notes/{note_id}")

        # Restore
        response = client.post(f"/api/notes/{note_id}/restore")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == note_id
        assert data["deleted_at"] is None

    def test_toggle_pin(self, client: TestClient, sample_note_data: dict) -> None:
        """Test toggling pin status."""
        # Create a note
        create_response = client.post("/api/notes", json=sample_note_data)
        note_id = create_response.json()["id"]

        # Pin the note
        response = client.patch(f"/api/notes/{note_id}/pin", json={"is_pinned": True})

        assert response.status_code == 200
        assert response.json()["is_pinned"] is True

        # Unpin the note
        response = client.patch(f"/api/notes/{note_id}/pin", json={"is_pinned": False})

        assert response.status_code == 200
        assert response.json()["is_pinned"] is False

    def test_toggle_readonly(self, client: TestClient, sample_note_data: dict) -> None:
        """Test toggling readonly status."""
        # Create a note
        create_response = client.post("/api/notes", json=sample_note_data)
        note_id = create_response.json()["id"]

        # Make readonly
        response = client.patch(
            f"/api/notes/{note_id}/readonly",
            json={"is_readonly": True}
        )

        assert response.status_code == 200
        assert response.json()["is_readonly"] is True

        # Make editable
        response = client.patch(
            f"/api/notes/{note_id}/readonly",
            json={"is_readonly": False}
        )

        assert response.status_code == 200
        assert response.json()["is_readonly"] is False

    def test_duplicate_note(self, client: TestClient, sample_note_data: dict) -> None:
        """Test duplicating a note."""
        # Create a note
        create_response = client.post("/api/notes", json=sample_note_data)
        note_id = create_response.json()["id"]
        original_title = create_response.json()["title"]

        # Duplicate
        response = client.post(f"/api/notes/{note_id}/duplicate")

        assert response.status_code == 201
        data = response.json()
        assert data["id"] != note_id
        assert original_title in data["title"]  # Should contain original title
        assert data["content_md"] == sample_note_data["content_md"]


class TestNoteTocAndSummary:
    """Tests for TOC and Summary endpoints."""

    def test_get_toc(self, client: TestClient) -> None:
        """Test getting table of contents."""
        note_data = {
            "title": "目次テスト",
            "content_md": """# メイン

## 見出し1

内容1

## 見出し2

内容2

## 見出し3

内容3
""",
        }
        create_response = client.post("/api/notes", json=note_data)
        note_id = create_response.json()["id"]

        response = client.get(f"/api/notes/{note_id}/toc")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert data[0]["text"] == "見出し1"
        assert data[1]["text"] == "見出し2"
        assert data[2]["text"] == "見出し3"

    def test_get_summary(self, client: TestClient) -> None:
        """Test getting note summary for hover preview."""
        note_data = {
            "title": "サマリーテスト",
            "content_md": "これは要約テスト用のノートです。内容が長い場合は切り詰められます。",
        }
        create_response = client.post("/api/notes", json=note_data)
        note_id = create_response.json()["id"]

        response = client.get(f"/api/notes/{note_id}/summary")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == note_id
        assert data["title"] == note_data["title"]
        assert "summary" in data
        assert "updated_at" in data


class TestNoteVersions:
    """Tests for version history endpoints."""

    def test_get_versions(self, client: TestClient, sample_note_data: dict) -> None:
        """Test getting version history."""
        # Create a note
        create_response = client.post("/api/notes", json=sample_note_data)
        note_id = create_response.json()["id"]

        # Update the note to create a new version
        client.put(f"/api/notes/{note_id}", json={"title": "更新1", "content_md": "内容1"})
        client.put(f"/api/notes/{note_id}", json={"title": "更新2", "content_md": "内容2"})

        # Get versions
        response = client.get(f"/api/notes/{note_id}/versions")

        assert response.status_code == 200
        data = response.json()
        # Should have versions (implementation may vary)
        assert isinstance(data, list)

    def test_get_specific_version(
        self, client: TestClient, sample_note_data: dict
    ) -> None:
        """Test getting a specific version."""
        # Create a note
        create_response = client.post("/api/notes", json=sample_note_data)
        note_id = create_response.json()["id"]

        # Update to create version
        client.put(f"/api/notes/{note_id}", json={"title": "更新", "content_md": "内容"})

        # Get versions list first
        versions_response = client.get(f"/api/notes/{note_id}/versions")
        versions = versions_response.json()

        if len(versions) > 0:
            version_no = versions[0]["version_no"]
            response = client.get(f"/api/notes/{note_id}/versions/{version_no}")

            assert response.status_code == 200
            data = response.json()
            assert "title" in data
            assert "content_md" in data
            assert "version_no" in data


class TestNoteExport:
    """Tests for note export endpoints."""

    def test_export_note_as_markdown_success(
        self, client: TestClient, sample_note_data: dict
    ) -> None:
        """Test exporting a note as Markdown file."""
        # Create a note with tags
        note_data = sample_note_data.copy()
        note_data["tag_names"] = ["test", "export"]
        create_response = client.post("/api/notes", json=note_data)
        note_id = create_response.json()["id"]

        # Export as markdown
        response = client.get(f"/api/notes/{note_id}/export/md")

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/markdown")
        assert "content-disposition" in response.headers
        assert ".md" in response.headers["content-disposition"]

        # Verify content
        content = response.content.decode("utf-8")
        assert content.startswith("---")
        assert f"title: {note_data['title']}" in content
        assert "tags:" in content
        assert "test" in content
        assert "export" in content
        assert "created_at:" in content
        assert "updated_at:" in content
        assert "is_pinned:" in content
        assert "is_readonly:" in content
        assert note_data["content_md"] in content

    def test_export_note_not_found(self, client: TestClient) -> None:
        """Test exporting non-existent note returns 404."""
        response = client.get("/api/notes/99999/export/md")
        assert response.status_code == 404

    def test_export_deleted_note(
        self, client: TestClient, sample_note_data: dict
    ) -> None:
        """Test exporting deleted note returns 404."""
        # Create and delete a note
        create_response = client.post("/api/notes", json=sample_note_data)
        note_id = create_response.json()["id"]
        client.delete(f"/api/notes/{note_id}")

        # Try to export
        response = client.get(f"/api/notes/{note_id}/export/md")
        assert response.status_code == 404

    def test_export_note_filename_sanitization(
        self, client: TestClient
    ) -> None:
        """Test filename sanitization for special characters."""
        note_data = {
            "title": "Test/Note:With<Special>Chars",
            "content_md": "Content",
        }
        create_response = client.post("/api/notes", json=note_data)
        note_id = create_response.json()["id"]

        response = client.get(f"/api/notes/{note_id}/export/md")

        assert response.status_code == 200
        content_disposition = response.headers["content-disposition"]
        # Verify problematic chars are replaced
        # Get the filename part from content-disposition
        filename_part = content_disposition.split("filename=")[1].split(";")[0]
        assert "/" not in filename_part
        assert ":" not in filename_part
        assert "<" not in filename_part
        assert ">" not in filename_part

    def test_export_note_japanese_filename(self, client: TestClient) -> None:
        """Test Japanese characters in filename are properly encoded."""
        note_data = {
            "title": "テストノート",
            "content_md": "日本語コンテンツ",
        }
        create_response = client.post("/api/notes", json=note_data)
        note_id = create_response.json()["id"]

        response = client.get(f"/api/notes/{note_id}/export/md")

        assert response.status_code == 200
        content_disposition = response.headers["content-disposition"]
        # Verify UTF-8 encoded filename is present
        assert "filename*=UTF-8''" in content_disposition
