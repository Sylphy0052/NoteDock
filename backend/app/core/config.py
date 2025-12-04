from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "NoteDock"
    app_env: str = "development"
    app_debug: bool = True

    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "notedock"
    db_password: str = "notedock"
    db_name: str = "notedock"

    # MinIO
    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "notedock"
    minio_secret_key: str = "notedock-secret"
    minio_bucket: str = "notedock-files"

    # Discord
    discord_webhook_url: str = ""

    @property
    def database_url(self) -> str:
        """Get the database connection URL."""
        return f"postgresql+psycopg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def minio_secure(self) -> bool:
        """Check if MinIO endpoint uses HTTPS."""
        return self.minio_endpoint.startswith("https://")

    @property
    def minio_host(self) -> str:
        """Extract host from MinIO endpoint."""
        endpoint = self.minio_endpoint.replace("https://", "").replace("http://", "")
        return endpoint

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
