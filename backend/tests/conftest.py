"""Pytest configuration and fixtures."""
import os
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["APP_ENV"] = "test"
os.environ["APP_DEBUG"] = "false"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
# Use environment variables if set, otherwise use defaults for unit tests
os.environ.setdefault("MINIO_ENDPOINT", "localhost:9000")
os.environ.setdefault("MINIO_ACCESS_KEY", "notedock")
os.environ.setdefault("MINIO_SECRET_KEY", "notedock-secret")
os.environ.setdefault("MINIO_BUCKET", "notedock-files")
os.environ.setdefault("DISCORD_WEBHOOK_URL", "")

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
