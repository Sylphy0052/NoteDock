from minio import Minio
from minio.error import S3Error
from typing import Optional, BinaryIO
from io import BytesIO
import uuid

from app.core.config import get_settings
from app.core.logging import log_error, log_info

settings = get_settings()


class MinIOClient:
    """MinIO S3-compatible storage client wrapper."""

    def __init__(self) -> None:
        self.client = Minio(
            settings.minio_host,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        self.bucket = settings.minio_bucket

    def ensure_bucket_exists(self) -> None:
        """Ensure the bucket exists, create if not."""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
                log_info(f"Created bucket: {self.bucket}")
        except S3Error as e:
            log_error(f"Failed to ensure bucket exists: {e}")
            raise

    def generate_key(self, prefix: str, original_name: str) -> str:
        """Generate a unique storage key."""
        ext = ""
        if "." in original_name:
            ext = "." + original_name.rsplit(".", 1)[-1].lower()
        unique_id = uuid.uuid4().hex
        return f"{prefix}/{unique_id}{ext}"

    def upload_file(
        self,
        file_data: BinaryIO,
        key: str,
        content_type: str,
        size: int,
    ) -> str:
        """Upload a file to MinIO."""
        try:
            self.client.put_object(
                self.bucket,
                key,
                file_data,
                size,
                content_type=content_type,
            )
            log_info(f"Uploaded file: {key}")
            return key
        except S3Error as e:
            log_error(f"Failed to upload file: {e}")
            raise

    def upload_bytes(
        self,
        data: bytes,
        key: str,
        content_type: str,
    ) -> str:
        """Upload bytes to MinIO."""
        file_data = BytesIO(data)
        return self.upload_file(file_data, key, content_type, len(data))

    def download_file(self, key: str) -> bytes:
        """Download a file from MinIO."""
        try:
            response = self.client.get_object(self.bucket, key)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as e:
            log_error(f"Failed to download file: {e}")
            raise

    def get_file_stream(self, key: str) -> BinaryIO:
        """Get a file stream from MinIO."""
        try:
            response = self.client.get_object(self.bucket, key)
            return response
        except S3Error as e:
            log_error(f"Failed to get file stream: {e}")
            raise

    def delete_file(self, key: str) -> None:
        """Delete a file from MinIO."""
        try:
            self.client.remove_object(self.bucket, key)
            log_info(f"Deleted file: {key}")
        except S3Error as e:
            log_error(f"Failed to delete file: {e}")
            raise

    def file_exists(self, key: str) -> bool:
        """Check if a file exists in MinIO."""
        try:
            self.client.stat_object(self.bucket, key)
            return True
        except S3Error:
            return False

    def get_presigned_url(self, key: str, expires_hours: int = 1) -> str:
        """Get a presigned URL for file access."""
        from datetime import timedelta
        try:
            url = self.client.presigned_get_object(
                self.bucket,
                key,
                expires=timedelta(hours=expires_hours),
            )
            return url
        except S3Error as e:
            log_error(f"Failed to get presigned URL: {e}")
            raise


# Singleton instance
_minio_client: Optional[MinIOClient] = None


def get_minio_client() -> MinIOClient:
    """Get or create MinIO client instance."""
    global _minio_client
    if _minio_client is None:
        _minio_client = MinIOClient()
    return _minio_client
