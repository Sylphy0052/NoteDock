"""Tests for AI API endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch

from app.main import app
from app.schemas.ai import StreamEvent


client = TestClient(app)


class TestAIStatusEndpoint:
    """Tests for GET /api/ai/status endpoint."""

    def test_status_when_disabled(self) -> None:
        """Test status endpoint when AI is disabled."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = False
            mock_service.default_model = "gpt-4o-mini"
            mock_get_service.return_value = mock_service

            response = client.get("/api/ai/status")

            assert response.status_code == 200
            data = response.json()
            assert data["enabled"] is False
            assert data["defaultModel"] == "gpt-4o-mini"

    def test_status_when_enabled(self) -> None:
        """Test status endpoint when AI is enabled."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = True
            mock_service.default_model = "claude-3-5-sonnet"
            mock_get_service.return_value = mock_service

            response = client.get("/api/ai/status")

            assert response.status_code == 200
            data = response.json()
            assert data["enabled"] is True
            assert data["defaultModel"] == "claude-3-5-sonnet"


class TestAIGenerateEndpoint:
    """Tests for POST /api/ai/generate endpoint."""

    def test_generate_when_disabled(self) -> None:
        """Test generate endpoint when AI is disabled."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = False
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/ai/generate",
                json={"prompt": "Write a test article"},
            )

            assert response.status_code == 503
            assert "not enabled" in response.json()["detail"]

    def test_generate_success(self) -> None:
        """Test generate endpoint with successful streaming response."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = True

            async def mock_chat(*args, **kwargs):
                yield StreamEvent(type="add_message_token", token="Hello")
                yield StreamEvent(type="add_message_token", token=" World")
                yield StreamEvent(type="add_bot_message_id", id="123")

            mock_service.chat = mock_chat
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/ai/generate",
                json={"prompt": "Test prompt"},
            )

            assert response.status_code == 200
            assert response.headers["content-type"] == "application/x-ndjson"

            lines = response.text.strip().split("\n")
            assert len(lines) == 3


class TestAIAssistEndpoint:
    """Tests for POST /api/ai/assist endpoint."""

    def test_assist_when_disabled(self) -> None:
        """Test assist endpoint when AI is disabled."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = False
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/ai/assist",
                json={"content": "Some text", "mode": "improve"},
            )

            assert response.status_code == 503
            assert "not enabled" in response.json()["detail"]

    def test_assist_improve_mode(self) -> None:
        """Test assist endpoint with improve mode."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = True

            async def mock_chat(*args, **kwargs):
                yield StreamEvent(type="add_message_token", token="Improved")

            mock_service.chat = mock_chat
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/ai/assist",
                json={"content": "Fix this", "mode": "improve"},
            )

            assert response.status_code == 200

    def test_assist_translate_mode(self) -> None:
        """Test assist endpoint with translate mode."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = True

            async def mock_chat(*args, **kwargs):
                yield StreamEvent(type="add_message_token", token="Translated")

            mock_service.chat = mock_chat
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/ai/assist",
                json={
                    "content": "Hello",
                    "mode": "translate",
                    "targetLanguage": "Japanese",
                },
            )

            assert response.status_code == 200


class TestAISummarizeEndpoint:
    """Tests for POST /api/ai/summarize endpoint."""

    def test_summarize_when_disabled(self) -> None:
        """Test summarize endpoint when AI is disabled."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = False
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/ai/summarize",
                json={"noteId": 1},
            )

            assert response.status_code == 503
            assert "not enabled" in response.json()["detail"]

    def test_summarize_note_not_found(self) -> None:
        """Test summarize endpoint when note not found."""
        with (
            patch("app.api.v1.ai.get_ask_service") as mock_get_service,
            patch("app.api.v1.ai.get_note_service") as mock_get_note_service,
        ):
            mock_ask_service = MagicMock()
            mock_ask_service._is_enabled.return_value = True
            mock_get_service.return_value = mock_ask_service

            # Simulate note not found exception
            from app.core.errors import NotFoundError

            mock_note_service = MagicMock()
            mock_note_service.get_note.side_effect = NotFoundError("Note", 999)
            mock_get_note_service.return_value = mock_note_service

            response = client.post(
                "/api/ai/summarize",
                json={"noteId": 999},
            )

            assert response.status_code == 404


class TestAIAskEndpoint:
    """Tests for POST /api/ai/ask endpoint."""

    def test_ask_when_disabled(self) -> None:
        """Test ask endpoint when AI is disabled."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = False
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/ai/ask",
                json={"noteId": 1, "question": "What is this about?"},
            )

            assert response.status_code == 503
            assert "not enabled" in response.json()["detail"]


class TestAISuggestTagsEndpoint:
    """Tests for POST /api/ai/suggest-tags endpoint."""

    def test_suggest_tags_when_disabled(self) -> None:
        """Test suggest-tags endpoint when AI is disabled."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = False
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/ai/suggest-tags",
                json={"title": "Test", "content": "Test content"},
            )

            assert response.status_code == 503
            assert "not enabled" in response.json()["detail"]

    def test_suggest_tags_validation_error_empty_title(self) -> None:
        """Test suggest-tags endpoint with empty title."""
        response = client.post(
            "/api/ai/suggest-tags",
            json={"title": "", "content": "Test content"},
        )

        # App uses custom error handling, returns 400 for validation errors
        assert response.status_code in (400, 422)

    def test_suggest_tags_validation_error_empty_content(self) -> None:
        """Test suggest-tags endpoint with empty content."""
        response = client.post(
            "/api/ai/suggest-tags",
            json={"title": "Test", "content": ""},
        )

        # App uses custom error handling, returns 400 for validation errors
        assert response.status_code in (400, 422)

    def test_suggest_tags_max_suggestions_validation(self) -> None:
        """Test suggest-tags endpoint with invalid maxSuggestions."""
        response = client.post(
            "/api/ai/suggest-tags",
            json={"title": "Test", "content": "Test content", "maxSuggestions": 15},
        )

        # App uses custom error handling, returns 400 for validation errors
        assert response.status_code in (400, 422)

    def test_suggest_tags_success(self) -> None:
        """Test successful tag suggestion with existing and new tags."""
        with (
            patch("app.api.v1.ai.get_ask_service") as mock_get_service,
            patch("app.api.v1.ai.get_tag_repo") as mock_get_tag_repo,
        ):
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = True

            # Mock AI response
            ai_response = '{"tags": [{"name": "Docker", "reason": "Dockerに関する内容"}, {"name": "Tips", "reason": "実用的なノウハウ"}]}'
            mock_service.chat_simple = AsyncMock(return_value=(ai_response, None))
            mock_get_service.return_value = mock_service

            # Mock existing tags
            mock_tag_repo = MagicMock()
            mock_tag = MagicMock()
            mock_tag.name = "Tips"
            mock_tag_repo.get_all.return_value = [mock_tag]
            mock_get_tag_repo.return_value = mock_tag_repo

            response = client.post(
                "/api/ai/suggest-tags",
                json={
                    "title": "Dockerの使い方",
                    "content": "Docker networking tips",
                    "maxSuggestions": 5,
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "suggestions" in data
            assert len(data["suggestions"]) == 2

            # Check first suggestion (new tag)
            docker_tag = next((s for s in data["suggestions"] if s["name"] == "Docker"), None)
            assert docker_tag is not None
            assert docker_tag["isExisting"] is False

            # Check second suggestion (existing tag)
            tips_tag = next((s for s in data["suggestions"] if s["name"] == "Tips"), None)
            assert tips_tag is not None
            assert tips_tag["isExisting"] is True

    def test_suggest_tags_invalid_json_returns_empty(self) -> None:
        """Test suggest-tags endpoint returns empty list when AI returns invalid JSON."""
        with (
            patch("app.api.v1.ai.get_ask_service") as mock_get_service,
            patch("app.api.v1.ai.get_tag_repo") as mock_get_tag_repo,
        ):
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = True

            # Mock AI returning invalid JSON - parser gracefully handles this
            mock_service.chat_simple = AsyncMock(return_value=("invalid json", None))
            mock_get_service.return_value = mock_service

            # Mock existing tags
            mock_tag_repo = MagicMock()
            mock_tag_repo.get_all.return_value = []
            mock_get_tag_repo.return_value = mock_tag_repo

            response = client.post(
                "/api/ai/suggest-tags",
                json={"title": "Test", "content": "Test content"},
            )

            # Parser gracefully returns empty list for invalid JSON
            assert response.status_code == 200
            data = response.json()
            assert data["suggestions"] == []


class TestAIProjectAskEndpoint:
    """Tests for POST /api/ai/project/ask endpoint."""

    def test_project_ask_when_disabled(self) -> None:
        """Test project ask endpoint when AI is disabled."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = False
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/ai/project/ask",
                json={"projectId": 1, "question": "What is this project about?"},
            )

            assert response.status_code == 503
            assert "not enabled" in response.json()["detail"]

    def test_project_ask_project_not_found(self) -> None:
        """Test project ask endpoint when project not found."""
        with (
            patch("app.api.v1.ai.get_ask_service") as mock_get_service,
            patch("app.api.v1.ai.get_project_service") as mock_get_project_service,
        ):
            mock_ask_service = MagicMock()
            mock_ask_service._is_enabled.return_value = True
            mock_get_service.return_value = mock_ask_service

            # Simulate project not found exception
            from app.core.errors import NotFoundError

            mock_project_service = MagicMock()
            mock_project_service.get_project.side_effect = NotFoundError("Project", 999)
            mock_get_project_service.return_value = mock_project_service

            response = client.post(
                "/api/ai/project/ask",
                json={"projectId": 999, "question": "What is this project about?"},
            )

            assert response.status_code == 404

    def test_project_ask_success(self) -> None:
        """Test project ask endpoint with successful streaming response."""
        with (
            patch("app.api.v1.ai.get_ask_service") as mock_get_service,
            patch("app.api.v1.ai.get_project_service") as mock_get_project_service,
        ):
            mock_ask_service = MagicMock()
            mock_ask_service._is_enabled.return_value = True
            mock_get_service.return_value = mock_ask_service

            # Mock project service
            mock_project_service = MagicMock()
            mock_project = MagicMock()
            mock_project.name = "Test Project"
            mock_project_service.get_project.return_value = mock_project
            mock_project_service.build_ai_context.return_value = "Project context"
            mock_get_project_service.return_value = mock_project_service

            # Mock streaming response via stream_chat_response
            with patch("app.api.v1.ai.stream_chat_response") as mock_stream:
                async def mock_generator():
                    yield '{"type": "add_message_token", "token": "Hello"}\n'
                    yield '{"type": "add_message_token", "token": " World"}\n'

                mock_stream.return_value = mock_generator()

                response = client.post(
                    "/api/ai/project/ask",
                    json={"projectId": 1, "question": "What is this project about?"},
                )

                assert response.status_code == 200
                assert response.headers["content-type"] == "application/x-ndjson"


class TestFileUploadEndpoint:
    """Tests for POST /api/ai/upload-file endpoint."""

    def test_upload_when_disabled(self) -> None:
        """Test upload endpoint when AI is disabled."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = False
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/ai/upload-file",
                files={"file": ("test.txt", b"test content", "text/plain")},
                data={"chat_id": "test-chat-id"},
            )

            assert response.status_code == 503
            assert "not enabled" in response.json()["detail"]

    def test_upload_no_filename(self) -> None:
        """Test upload endpoint with no filename."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = True
            mock_get_service.return_value = mock_service

            # Send file with empty filename
            # FastAPI may return 422 for invalid file
            response = client.post(
                "/api/ai/upload-file",
                files={"file": ("", b"test content", "text/plain")},
                data={"chat_id": "test-chat-id"},
            )

            # Empty filename: validation error (422) or our check (400)
            assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_upload_success(self) -> None:
        """Test successful file upload."""
        with patch("app.api.v1.ai.get_ask_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service._is_enabled.return_value = True
            mock_service.upload_file = AsyncMock(return_value="file-123")
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/ai/upload-file",
                files={"file": ("test.txt", b"test content", "text/plain")},
                data={"chat_id": "test-chat-id"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["fileId"] == "file-123"
