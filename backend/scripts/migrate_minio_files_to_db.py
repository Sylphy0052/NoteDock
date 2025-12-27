#!/usr/bin/env python3
"""
MinIOに保存されている既存ファイルをDBに登録するマイグレーションスクリプト

Usage:
    docker-compose exec backend python scripts/migrate_minio_files_to_db.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import mimetypes
from datetime import datetime

from app.db.session import SessionLocal
from app.models.file import File
from app.utils.s3 import get_minio_client


def guess_mime_type(filename: str) -> str:
    """Guess MIME type from filename."""
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"


def get_original_name(key: str) -> str:
    """Extract original filename from storage key."""
    # Key format: prefix/uuid.ext or prefix/subprefix/uuid.ext
    return key.rsplit("/", 1)[-1]


def migrate_files():
    """Migrate existing MinIO files to database."""
    minio = get_minio_client()
    db = SessionLocal()

    try:
        # Get all existing stored_keys from DB
        existing_keys = set(
            row[0] for row in db.query(File.stored_key).all()
        )
        print(f"既存のDBレコード数: {len(existing_keys)}")

        # List all objects in MinIO bucket
        objects = minio.client.list_objects(minio.bucket, recursive=True)

        added_count = 0
        skipped_count = 0
        error_count = 0

        for obj in objects:
            key = obj.object_name

            # Skip if already in DB
            if key in existing_keys:
                skipped_count += 1
                continue

            try:
                # Get file info from MinIO
                stat = minio.client.stat_object(minio.bucket, key)

                # Create file record
                original_name = get_original_name(key)
                mime_type = stat.content_type or guess_mime_type(original_name)
                size_bytes = stat.size
                created_at = stat.last_modified or datetime.now()

                file = File(
                    original_name=original_name,
                    stored_key=key,
                    mime_type=mime_type,
                    size_bytes=size_bytes,
                    created_at=created_at,
                )

                db.add(file)
                db.commit()

                added_count += 1
                print(f"追加: {key} ({mime_type}, {size_bytes} bytes)")

            except Exception as e:
                error_count += 1
                print(f"エラー: {key} - {e}")
                db.rollback()

        print(f"\n=== 結果 ===")
        print(f"追加: {added_count} 件")
        print(f"スキップ (既存): {skipped_count} 件")
        print(f"エラー: {error_count} 件")

    finally:
        db.close()


if __name__ == "__main__":
    print("MinIOファイルをDBにマイグレーション中...\n")
    migrate_files()
    print("\n完了しました。")
