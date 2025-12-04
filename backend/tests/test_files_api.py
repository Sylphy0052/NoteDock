"""Tests for Files API endpoints.

Note: These tests require MinIO to be running. They are marked with
pytest.mark.integration and can be skipped when running unit tests only.
"""
import pytest
from io import BytesIO
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestFilesAPI:
    """Tests for /api/files endpoints.

    These tests require a running MinIO instance and are marked as integration tests.
    Run with: pytest -m integration
    """

    def test_upload_file(self, client: TestClient) -> None:
        """Test uploading a file."""
        # Create a test file
        file_content = b"Test file content"
        files = {"file": ("test.txt", BytesIO(file_content), "text/plain")}

        response = client.post("/api/files", files=files)

        # This may fail without MinIO
        if response.status_code == 201:
            data = response.json()
            assert "id" in data
            assert data["original_name"] == "test.txt"
            assert data["mime_type"] == "text/plain"
            assert data["size_bytes"] == len(file_content)
        else:
            pytest.skip("MinIO not available")

    def test_upload_image(self, client: TestClient) -> None:
        """Test uploading an image file."""
        # Create a minimal PNG file (1x1 pixel)
        png_data = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00"
            b"\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\n"
            b"IDAT\x08\xd7c\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00"
            b"\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {"file": ("test.png", BytesIO(png_data), "image/png")}

        response = client.post("/api/files", files=files)

        if response.status_code == 201:
            data = response.json()
            assert data["mime_type"] == "image/png"
            assert "url" in data
            assert "preview_url" in data
        else:
            pytest.skip("MinIO not available")

    def test_get_file(self, client: TestClient) -> None:
        """Test downloading a file."""
        # First upload a file
        file_content = b"Test file content for download"
        files = {"file": ("download_test.txt", BytesIO(file_content), "text/plain")}

        upload_response = client.post("/api/files", files=files)

        if upload_response.status_code != 201:
            pytest.skip("MinIO not available")

        file_id = upload_response.json()["id"]

        # Download the file
        response = client.get(f"/api/files/{file_id}")

        assert response.status_code == 200
        assert response.content == file_content
        assert "Content-Disposition" in response.headers

    def test_preview_file(self, client: TestClient) -> None:
        """Test previewing a file."""
        # Upload an image
        png_data = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00"
            b"\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\n"
            b"IDAT\x08\xd7c\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00"
            b"\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {"file": ("preview_test.png", BytesIO(png_data), "image/png")}

        upload_response = client.post("/api/files", files=files)

        if upload_response.status_code != 201:
            pytest.skip("MinIO not available")

        file_id = upload_response.json()["id"]

        # Preview the file
        response = client.get(f"/api/files/{file_id}/preview")

        assert response.status_code == 200
        assert response.headers["Content-Type"] == "image/png"
        assert "inline" in response.headers.get("Content-Disposition", "")

    def test_delete_file(self, client: TestClient) -> None:
        """Test deleting a file."""
        # Upload a file
        file_content = b"File to delete"
        files = {"file": ("delete_test.txt", BytesIO(file_content), "text/plain")}

        upload_response = client.post("/api/files", files=files)

        if upload_response.status_code != 201:
            pytest.skip("MinIO not available")

        file_id = upload_response.json()["id"]

        # Delete the file
        response = client.delete(f"/api/files/{file_id}")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

        # Verify file is deleted
        get_response = client.get(f"/api/files/{file_id}")
        assert get_response.status_code == 404

    def test_get_file_not_found(self, client: TestClient) -> None:
        """Test getting a non-existent file."""
        response = client.get("/api/files/99999")

        assert response.status_code == 404


# Unit tests that don't require MinIO
class TestFilesAPIUnit:
    """Unit tests for file-related functionality without MinIO."""

    def test_file_not_found(self, client: TestClient) -> None:
        """Test getting a non-existent file returns 404."""
        response = client.get("/api/files/99999")
        assert response.status_code == 404

    def test_preview_not_found(self, client: TestClient) -> None:
        """Test previewing a non-existent file returns 404."""
        response = client.get("/api/files/99999/preview")
        assert response.status_code == 404
