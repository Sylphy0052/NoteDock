"""Tests for ASK API service.

This module contains both unit tests (with mocked HTTP) and integration tests
that actually call the ASK API.

To run only unit tests:
    pytest tests/test_ask_service.py -m "not integration"

To run integration tests (requires ASK_API_KEY in .env):
    pytest tests/test_ask_service.py -m integration -v
"""

import json
import os
from pathlib import Path
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Load .env from project root for integration tests
_project_root = Path(__file__).parent.parent.parent
_env_file = _project_root / ".env"
if _env_file.exists():
    with open(_env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())

# Fallback defaults for unit tests
os.environ.setdefault("ASK_API_URL", "https://api.example.com")
os.environ.setdefault("ASK_API_KEY", "test-api-key")
os.environ.setdefault("ASK_PROJECT_ID", "0")
os.environ.setdefault("ASK_DEFAULT_MODEL", "gpt-4o-mini")
os.environ.setdefault("ASK_ENABLED", "false")

from app.schemas.ai import (
    ChatFileResponse,
    ChatFileStatusResponse,
    FileStatus,
    ModelVariant,
    SASTokenResponse,
    StreamEvent,
)
from app.services.ask_service import (
    AskAPIError,
    AskService,
    AskServiceError,
    FileProcessingError,
    FileUploadError,
)


# ============================================================================
# Unit Tests (Mocked HTTP)
# ============================================================================


class TestAskServiceUnit:
    """Unit tests for AskService with mocked HTTP responses."""

    @pytest.fixture
    def service(self) -> AskService:
        """Create a service instance for testing."""
        return AskService()

    @pytest.fixture
    def mock_httpx_client(self):
        """Create a mock httpx AsyncClient."""
        with patch("httpx.AsyncClient") as mock:
            yield mock

    # --- SAS Token Tests ---

    @pytest.mark.asyncio
    async def test_get_sas_token_success(
        self, service: AskService, mock_httpx_client: MagicMock
    ) -> None:
        """Test successful SAS token retrieval."""
        # Arrange
        expected_response = {
            "accountName": "stllmdevpub",
            "containerName": "test-container",
            "blobName": "abc123-file.png",
            "sasToken": "se=2025-12-12T19%3A52%3A32Z&sp=w&sv=2024-08-04",
            "endPoint": "https://stllmdevpub.blob.core.windows.net/",
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = expected_response

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_httpx_client.return_value = mock_client

        # Act
        result = await service.get_sas_token("test-chat-id", "image/png")

        # Assert
        assert isinstance(result, SASTokenResponse)
        assert result.blob_name == expected_response["blobName"]
        expected_url = (
            f"{expected_response['endPoint']}"
            f"{expected_response['containerName']}/"
            f"{expected_response['blobName']}?"
            f"{expected_response['sasToken']}"
        )
        assert result.sas_url == expected_url

    @pytest.mark.asyncio
    async def test_get_sas_token_api_error(
        self, service: AskService, mock_httpx_client: MagicMock
    ) -> None:
        """Test SAS token retrieval with API error."""
        # Arrange
        mock_response = AsyncMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_httpx_client.return_value = mock_client

        # Act & Assert
        with pytest.raises(AskAPIError) as exc_info:
            await service.get_sas_token("test-chat-id", "image/png")

        assert exc_info.value.status_code == 401
        assert "Failed to get SAS token" in exc_info.value.message

    # --- File Upload Tests ---

    @pytest.mark.asyncio
    async def test_upload_file_to_blob_success(
        self, service: AskService, mock_httpx_client: MagicMock
    ) -> None:
        """Test successful file upload to blob storage."""
        # Arrange
        mock_response = AsyncMock()
        mock_response.status_code = 201

        mock_client = AsyncMock()
        mock_client.put.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_httpx_client.return_value = mock_client

        # Act
        await service.upload_file_to_blob(
            sas_url="https://blob.azure.com/file?sas=token",
            file_data=b"test file content",
            content_type="image/png",
        )

        # Assert - no exception means success
        mock_client.put.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_file_to_blob_failure(
        self, service: AskService, mock_httpx_client: MagicMock
    ) -> None:
        """Test file upload failure."""
        # Arrange
        mock_response = AsyncMock()
        mock_response.status_code = 403

        mock_client = AsyncMock()
        mock_client.put.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_httpx_client.return_value = mock_client

        # Act & Assert
        with pytest.raises(FileUploadError):
            await service.upload_file_to_blob(
                sas_url="https://blob.azure.com/file?sas=token",
                file_data=b"test",
                content_type="image/png",
            )

    # --- Chat File Registration Tests ---

    @pytest.mark.asyncio
    async def test_register_chat_file_success(
        self, service: AskService, mock_httpx_client: MagicMock
    ) -> None:
        """Test successful chat file registration."""
        # Arrange
        expected_response = {
            "fileId": "file-uuid-123",
            "status": "PROCESSING",
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = expected_response

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_httpx_client.return_value = mock_client

        # Act
        result = await service.register_chat_file(
            blob_name="blob-123",
            chat_id="chat-456",
            content_type="image/png",
            original_filename="test.png",
        )

        # Assert
        assert isinstance(result, ChatFileResponse)
        assert result.file_id == "file-uuid-123"
        assert result.status == FileStatus.PROCESSING

    # --- File Status Tests ---

    @pytest.mark.asyncio
    async def test_check_file_status_done(
        self, service: AskService, mock_httpx_client: MagicMock
    ) -> None:
        """Test file status check when done."""
        # Arrange
        expected_response = {
            "fileId": "file-123",
            "status": "DONE",
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = expected_response

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_httpx_client.return_value = mock_client

        # Act
        result = await service.check_file_status("file-123")

        # Assert
        assert result.status == FileStatus.DONE

    @pytest.mark.asyncio
    async def test_check_file_status_error(
        self, service: AskService, mock_httpx_client: MagicMock
    ) -> None:
        """Test file status check when error."""
        # Arrange
        expected_response = {
            "fileId": "file-123",
            "status": "ERROR",
            "errorMessage": "File format not supported",
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = expected_response

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_httpx_client.return_value = mock_client

        # Act
        result = await service.check_file_status("file-123")

        # Assert
        assert result.status == FileStatus.ERROR
        assert result.error_message == "File format not supported"

    # --- Wait for File Ready Tests ---

    @pytest.mark.asyncio
    async def test_wait_for_file_ready_success(self, service: AskService) -> None:
        """Test waiting for file to be ready."""
        # Arrange
        with patch.object(service, "check_file_status") as mock_check:
            mock_check.return_value = ChatFileStatusResponse(
                file_id="file-123",
                status=FileStatus.DONE,
            )

            # Act
            result = await service.wait_for_file_ready("file-123", timeout_seconds=5)

            # Assert
            assert result is True

    @pytest.mark.asyncio
    async def test_wait_for_file_ready_error(self, service: AskService) -> None:
        """Test waiting for file that errors."""
        # Arrange
        with patch.object(service, "check_file_status") as mock_check:
            mock_check.return_value = ChatFileStatusResponse(
                file_id="file-123",
                status=FileStatus.ERROR,
                error_message="Processing failed",
            )

            # Act & Assert
            with pytest.raises(FileProcessingError):
                await service.wait_for_file_ready("file-123", timeout_seconds=5)


class TestStreamEventParsing:
    """Test parsing of stream events."""

    def test_parse_progress_message(self) -> None:
        """Test parsing progress message event."""
        data = {"type": "add_progress_message", "message": "Searching documents..."}
        event = StreamEvent(**data)
        assert event.type == "add_progress_message"
        assert event.message == "Searching documents..."

    def test_parse_token_event(self) -> None:
        """Test parsing token event."""
        data = {"type": "add_message_token", "token": "Hello"}
        event = StreamEvent(**data)
        assert event.type == "add_message_token"
        assert event.token == "Hello"

    def test_parse_replace_message(self) -> None:
        """Test parsing replace message event."""
        data = {"type": "replace_message", "message": "Full response text"}
        event = StreamEvent(**data)
        assert event.type == "replace_message"
        assert event.message == "Full response text"

    def test_parse_bot_message_id(self) -> None:
        """Test parsing bot message ID event."""
        data = {"type": "add_bot_message_id", "id": "msg-uuid-123"}
        event = StreamEvent(**data)
        assert event.type == "add_bot_message_id"
        assert event.id == "msg-uuid-123"


# ============================================================================
# Integration Tests (Actual API Calls)
# ============================================================================


@pytest.mark.integration
class TestAskServiceIntegration:
    """Integration tests that actually call the ASK API.

    These tests require:
    - ASK_API_KEY environment variable to be set
    - ASK_PROJECT_ID environment variable to be set
    - Network access to ASK API

    Run with: pytest tests/test_ask_service.py -m integration -v
    """

    @pytest.fixture
    def service(self) -> AskService:
        """Create a service instance for testing."""
        service = AskService()

        # Skip if not configured
        if not service._is_enabled():
            pytest.skip("ASK API not configured (set ASK_API_KEY and ASK_PROJECT_ID)")

        return service

    @pytest.mark.asyncio
    async def test_simple_chat(self, service: AskService) -> None:
        """Test a simple chat without file attachments."""
        # Act
        response_text, message_id = await service.chat_simple(
            user_input="1+1は何ですか？短く答えてください。",
            template="あなたは数学の先生です。簡潔に回答してください。",
        )

        # Assert
        assert response_text, "Response should not be empty"
        assert "2" in response_text, f"Response should contain '2': {response_text}"
        print(f"\nResponse: {response_text}")
        print(f"Message ID: {message_id}")

    @pytest.mark.asyncio
    async def test_chat_streaming(self, service: AskService) -> None:
        """Test streaming chat response."""
        # Act
        tokens = []
        full_message = ""

        async for event in service.chat(
            user_input="こんにちは",
            template="フレンドリーに挨拶を返してください。",
        ):
            if event.type == "add_message_token" and event.token:
                tokens.append(event.token)
            elif event.type == "replace_message" and event.message:
                full_message = event.message

        # Assert
        assert len(tokens) > 0 or full_message, "Should receive tokens or message"
        print(f"\nReceived {len(tokens)} tokens")
        print(f"Full message: {full_message}")

    @pytest.mark.asyncio
    async def test_multi_turn_conversation(self, service: AskService) -> None:
        """Test multi-turn conversation using parentId."""
        chat_id = str(uuid.uuid4())

        # Turn 1
        response1, message_id1 = await service.chat_simple(
            user_input="私の名前は田中です。覚えておいてください。",
            chat_id=chat_id,
        )

        assert message_id1, "Should receive message ID for turn 1"
        print(f"\nTurn 1 response: {response1}")
        print(f"Turn 1 message ID: {message_id1}")

        # Turn 2 - should remember context
        response2, message_id2 = await service.chat_simple(
            user_input="私の名前は何ですか？",
            chat_id=chat_id,
            parent_id=message_id1,
        )

        assert "田中" in response2, f"Should remember name: {response2}"
        print(f"\nTurn 2 response: {response2}")

    @pytest.mark.asyncio
    async def test_get_sas_token_real(self, service: AskService) -> None:
        """Test getting a real SAS token."""
        chat_id = str(uuid.uuid4())

        # Act
        result = await service.get_sas_token(chat_id, "image/png")

        # Assert
        assert result.sas_url, "Should receive SAS URL"
        assert result.blob_name, "Should receive blob name"
        assert "blob.core.windows.net" in result.sas_url or "azure" in result.sas_url.lower()

        print(f"\nSAS URL: {result.sas_url[:50]}...")
        print(f"Blob name: {result.blob_name}")

    @pytest.mark.asyncio
    async def test_file_upload_and_chat(self, service: AskService) -> None:
        """Test uploading a file and using it in chat.

        This is a full end-to-end test of file attachment.
        """
        chat_id = str(uuid.uuid4())

        # Create a simple test image (1x1 PNG)
        # This is the smallest valid PNG file
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # 8-bit RGB
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82,
        ])

        try:
            # Step 1: Get SAS token
            sas_response = await service.get_sas_token(chat_id, "image/png")
            print(f"\n1. Got SAS token: {sas_response.blob_name}")

            # Step 2: Upload to blob
            await service.upload_file_to_blob(
                sas_response.sas_url,
                png_data,
                "image/png",
            )
            print("2. Uploaded to blob storage")

            # Step 3: Register file
            file_response = await service.register_chat_file(
                blob_name=sas_response.blob_name,
                chat_id=chat_id,
                content_type="image/png",
                original_filename="test.png",
            )
            print(f"3. Registered file: {file_response.file_id}")

            # Step 4: Wait for processing
            is_ready = await service.wait_for_file_ready(
                file_response.file_id,
                timeout_seconds=30,
            )
            assert is_ready, "File should be ready"
            print("4. File is ready")

            # Step 5: Chat with file
            response, _ = await service.chat_simple(
                user_input="この画像には何が写っていますか？",
                chat_id=chat_id,
                chat_file_ids=[file_response.file_id],
                template="画像について説明してください。",
            )
            print(f"5. Chat response: {response}")

            assert response, "Should receive response"

        except AskAPIError as e:
            print(f"API Error: {e.status_code} - {e.message}")
            if e.details:
                print(f"Details: {e.details}")
            raise


# ============================================================================
# Test Fixtures and Helpers
# ============================================================================


@pytest.fixture
def sample_stream_response() -> list[str]:
    """Sample NDJSON stream response from ASK API."""
    return [
        '{"type": "add_progress_message", "message": "Processing..."}',
        '{"type": "add_message_token", "token": "Hello"}',
        '{"type": "add_message_token", "token": " world"}',
        '{"type": "add_message_token", "token": "!"}',
        '{"type": "replace_message", "message": "Hello world!"}',
        '{"type": "add_bot_message_id", "id": "msg-123"}',
    ]


def test_sample_stream_parsing(sample_stream_response: list[str]) -> None:
    """Test parsing sample stream response."""
    events = []
    for line in sample_stream_response:
        data = json.loads(line)
        event = StreamEvent(**data)
        events.append(event)

    assert len(events) == 6

    # Check progress message
    assert events[0].type == "add_progress_message"
    assert events[0].message == "Processing..."

    # Check tokens
    assert events[1].type == "add_message_token"
    assert events[1].token == "Hello"

    # Check replace message
    assert events[4].type == "replace_message"
    assert events[4].message == "Hello world!"

    # Check bot message ID
    assert events[5].type == "add_bot_message_id"
    assert events[5].id == "msg-123"
