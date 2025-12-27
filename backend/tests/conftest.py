"""Pytest configuration and fixtures."""
import os
from pathlib import Path

# CRITICAL: Set environment variables BEFORE ANY imports
# This must be at the very top of the file

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

# Override for test environment
os.environ["APP_ENV"] = "test"
os.environ["APP_DEBUG"] = "false"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["MINIO_ENDPOINT"] = "http://localhost:9000"
os.environ["MINIO_ACCESS_KEY"] = "notedock"
os.environ["MINIO_SECRET_KEY"] = "notedock-secret"
os.environ["MINIO_BUCKET"] = "notedock-files"
os.environ["DISCORD_WEBHOOK_URL"] = ""

# ASK API - use setdefault to allow .env to override
os.environ.setdefault("ASK_API_URL", "https://api.example.com")
os.environ.setdefault("ASK_API_KEY", "")
os.environ.setdefault("ASK_PROJECT_ID", "0")
os.environ.setdefault("ASK_DEFAULT_MODEL", "gpt-4o-mini")
os.environ.setdefault("ASK_ENABLED", "false")

import pytest
from typing import Generator
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Create a mock for the Minio client from minio library
mock_minio_lib = MagicMock()
mock_minio_lib.bucket_exists.return_value = True
mock_minio_lib.get_object.return_value = MagicMock(read=lambda: b"mock file content")
mock_minio_lib.put_object.return_value = None
mock_minio_lib.remove_object.return_value = None
mock_minio_lib.stat_object.return_value = MagicMock()
mock_minio_lib.presigned_get_object.return_value = "http://mock-url"

# Patch the Minio class from minio library to prevent network calls
_minio_lib_patch = patch("minio.Minio", return_value=mock_minio_lib)
_minio_lib_patch.start()

from app.db.base import Base
from app.db.session import get_db
from app.main import app


# Create test database engine
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine
)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Create a fresh database for each test."""
    # Create all tables
    Base.metadata.create_all(bind=test_engine)

    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Drop all tables after each test
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """Create a test client with database session override."""
    def override_get_db() -> Generator[Session, None, None]:
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def sample_note_data() -> dict:
    """Sample note data for creating notes."""
    return {
        "title": "テストノート",
        "content_md": "# テスト\n\nこれはテストノートです。",
        "folder_id": None,
        "tag_names": ["test", "sample"],
        "is_pinned": False,
        "is_readonly": False,
    }


@pytest.fixture
def sample_folder_data() -> dict:
    """Sample folder data for creating folders."""
    return {
        "name": "テストフォルダ",
        "parent_id": None,
    }


@pytest.fixture
def sample_comment_data() -> dict:
    """Sample comment data for creating comments."""
    return {
        "content": "これはテストコメントです。",
        "display_name": "テストユーザー",
        "parent_id": None,
    }
