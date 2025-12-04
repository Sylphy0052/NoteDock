"""Tests for Comments API endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestCommentsAPI:
    """Tests for /api/notes/{id}/comments endpoints."""

    @pytest.fixture
    def note_id(self, client: TestClient, sample_note_data: dict) -> int:
        """Create a note and return its ID."""
        response = client.post("/api/notes", json=sample_note_data)
        return response.json()["id"]

    def test_create_comment(
        self, client: TestClient, note_id: int, sample_comment_data: dict
    ) -> None:
        """Test creating a new comment."""
        response = client.post(
            f"/api/notes/{note_id}/comments",
            json=sample_comment_data
        )

        assert response.status_code == 201
        data = response.json()
        assert data["content"] == sample_comment_data["content"]
        assert data["display_name"] == sample_comment_data["display_name"]
        assert "id" in data
        assert "created_at" in data

    def test_create_reply_comment(
        self, client: TestClient, note_id: int, sample_comment_data: dict
    ) -> None:
        """Test creating a reply to a comment."""
        # Create parent comment
        parent_response = client.post(
            f"/api/notes/{note_id}/comments",
            json=sample_comment_data
        )
        parent_id = parent_response.json()["id"]

        # Create reply
        reply_data = {
            "content": "これは返信コメントです。",
            "display_name": "返信ユーザー",
            "parent_id": parent_id,
        }
        response = client.post(
            f"/api/notes/{note_id}/comments",
            json=reply_data
        )

        assert response.status_code == 201
        data = response.json()
        assert data["parent_id"] == parent_id
        assert data["content"] == reply_data["content"]

    def test_get_comments(
        self, client: TestClient, note_id: int, sample_comment_data: dict
    ) -> None:
        """Test getting all comments for a note."""
        # Create multiple comments
        for i in range(3):
            data = sample_comment_data.copy()
            data["content"] = f"コメント {i + 1}"
            client.post(f"/api/notes/{note_id}/comments", json=data)

        # Get comments
        response = client.get(f"/api/notes/{note_id}/comments")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3

    def test_get_comments_threaded(
        self, client: TestClient, note_id: int, sample_comment_data: dict
    ) -> None:
        """Test getting comments with thread structure."""
        # Create parent comment
        parent_response = client.post(
            f"/api/notes/{note_id}/comments",
            json=sample_comment_data
        )
        parent_id = parent_response.json()["id"]

        # Create replies
        for i in range(2):
            reply_data = {
                "content": f"返信 {i + 1}",
                "display_name": "返信者",
                "parent_id": parent_id,
            }
            client.post(f"/api/notes/{note_id}/comments", json=reply_data)

        # Get comments
        response = client.get(f"/api/notes/{note_id}/comments")

        assert response.status_code == 200
        data = response.json()
        # Parent comment should have replies
        parent_comment = next((c for c in data if c["id"] == parent_id), None)
        if parent_comment and "replies" in parent_comment:
            assert len(parent_comment["replies"]) == 2

    def test_update_comment(
        self, client: TestClient, note_id: int, sample_comment_data: dict
    ) -> None:
        """Test updating a comment."""
        # Create a comment
        create_response = client.post(
            f"/api/notes/{note_id}/comments",
            json=sample_comment_data
        )
        comment_id = create_response.json()["id"]

        # Update the comment
        update_data = {"content": "更新されたコメント内容"}
        response = client.put(
            f"/api/comments/{comment_id}",
            json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == update_data["content"]

    def test_delete_comment(
        self, client: TestClient, note_id: int, sample_comment_data: dict
    ) -> None:
        """Test deleting a comment."""
        # Create a comment
        create_response = client.post(
            f"/api/notes/{note_id}/comments",
            json=sample_comment_data
        )
        comment_id = create_response.json()["id"]

        # Delete the comment
        response = client.delete(f"/api/comments/{comment_id}")

        assert response.status_code == 200

        # Verify comment is deleted
        get_response = client.get(f"/api/notes/{note_id}/comments")
        comments = get_response.json()
        assert not any(c["id"] == comment_id for c in comments)

    def test_get_comments_empty(self, client: TestClient, note_id: int) -> None:
        """Test getting comments when none exist."""
        response = client.get(f"/api/notes/{note_id}/comments")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
