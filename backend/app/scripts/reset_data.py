#!/usr/bin/env python
"""
Data reset script for NoteDock.

This script removes all registered data from the database and MinIO storage.
USE WITH CAUTION - This operation is irreversible!

Usage:
    # Dry run (show what would be deleted)
    uv run python -m app.scripts.reset_data --dry-run

    # Actually reset data (requires confirmation)
    uv run python -m app.scripts.reset_data

    # Skip confirmation prompt
    uv run python -m app.scripts.reset_data --force
"""

import argparse
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from minio.error import S3Error

from app.db.session import SessionLocal
from app.utils.s3 import get_minio_client
from app.core.logging import log_info, log_warning, log_error
from app.models import (
    ActivityLog,
    Comment,
    File,
    Folder,
    Note,
    NoteDraft,
    NoteLink,
    NoteVersion,
    Tag,
    Template,
    note_files,
    note_tags,
)


def count_records(db) -> dict[str, int]:
    """Count records in each table."""
    counts = {
        "notes": db.query(Note).count(),
        "folders": db.query(Folder).count(),
        "tags": db.query(Tag).count(),
        "files": db.query(File).count(),
        "comments": db.query(Comment).count(),
        "note_versions": db.query(NoteVersion).count(),
        "note_links": db.query(NoteLink).count(),
        "note_drafts": db.query(NoteDraft).count(),
        "activity_logs": db.query(ActivityLog).count(),
        "templates": db.query(Template).count(),
        "note_tags": db.execute(text("SELECT COUNT(*) FROM note_tags")).scalar(),
        "note_files": db.execute(text("SELECT COUNT(*) FROM note_files")).scalar(),
    }
    return counts


def count_minio_files() -> int:
    """Count files in MinIO bucket."""
    try:
        minio_client = get_minio_client()
        if not minio_client.client.bucket_exists(minio_client.bucket):
            return 0

        count = 0
        objects = minio_client.client.list_objects(minio_client.bucket, recursive=True)
        for _ in objects:
            count += 1
        return count
    except S3Error as e:
        log_warning(f"Failed to count MinIO files: {e}")
        return -1


def delete_minio_files() -> int:
    """Delete all files from MinIO bucket."""
    try:
        minio_client = get_minio_client()
        if not minio_client.client.bucket_exists(minio_client.bucket):
            return 0

        deleted_count = 0
        objects = minio_client.client.list_objects(minio_client.bucket, recursive=True)
        for obj in objects:
            minio_client.client.remove_object(minio_client.bucket, obj.object_name)
            deleted_count += 1
            log_info(f"Deleted MinIO file: {obj.object_name}")

        return deleted_count
    except S3Error as e:
        log_error(f"Failed to delete MinIO files: {e}")
        raise


def reset_database(db) -> dict[str, int]:
    """
    Delete all data from the database.

    Deletion order respects foreign key constraints:
    1. ActivityLog (references notes)
    2. NoteVersion (references notes)
    3. NoteDraft (references notes)
    4. Comment (references notes)
    5. NoteLink (references notes)
    6. note_files (junction table)
    7. note_tags (junction table)
    8. File (references notes)
    9. Note (references folders)
    10. Tag (no dependencies)
    11. Folder (self-referential)
    12. Template (no dependencies)
    """
    deleted = {}

    # 1. ActivityLog
    count = db.query(ActivityLog).delete()
    deleted["activity_logs"] = count
    log_info(f"Deleted {count} activity logs")

    # 2. NoteVersion
    count = db.query(NoteVersion).delete()
    deleted["note_versions"] = count
    log_info(f"Deleted {count} note versions")

    # 3. NoteDraft
    count = db.query(NoteDraft).delete()
    deleted["note_drafts"] = count
    log_info(f"Deleted {count} note drafts")

    # 4. Comment
    count = db.query(Comment).delete()
    deleted["comments"] = count
    log_info(f"Deleted {count} comments")

    # 5. NoteLink
    count = db.query(NoteLink).delete()
    deleted["note_links"] = count
    log_info(f"Deleted {count} note links")

    # 6. note_files (junction table)
    result = db.execute(text("DELETE FROM note_files"))
    deleted["note_files"] = result.rowcount
    log_info(f"Deleted {result.rowcount} note-file associations")

    # 7. note_tags (junction table)
    result = db.execute(text("DELETE FROM note_tags"))
    deleted["note_tags"] = result.rowcount
    log_info(f"Deleted {result.rowcount} note-tag associations")

    # 8. File
    count = db.query(File).delete()
    deleted["files"] = count
    log_info(f"Deleted {count} files")

    # 9. Note
    count = db.query(Note).delete()
    deleted["notes"] = count
    log_info(f"Deleted {count} notes")

    # 10. Tag
    count = db.query(Tag).delete()
    deleted["tags"] = count
    log_info(f"Deleted {count} tags")

    # 11. Folder (delete children first due to self-reference)
    # Use raw SQL to handle self-referential deletion
    result = db.execute(text("""
        WITH RECURSIVE folder_tree AS (
            SELECT id, parent_id, 1 as level
            FROM folders
            WHERE parent_id IS NOT NULL
            UNION ALL
            SELECT f.id, f.parent_id, ft.level + 1
            FROM folders f
            JOIN folder_tree ft ON f.parent_id = ft.id
        )
        SELECT id FROM folders ORDER BY (
            SELECT COALESCE(MAX(level), 0) FROM folder_tree WHERE folder_tree.id = folders.id
        ) DESC
    """))
    folder_ids = [row[0] for row in result]

    # Delete folders in correct order
    count = 0
    for folder_id in folder_ids:
        db.execute(text("DELETE FROM folders WHERE id = :id"), {"id": folder_id})
        count += 1
    # Delete remaining root folders
    remaining = db.query(Folder).delete()
    count += remaining
    deleted["folders"] = count
    log_info(f"Deleted {count} folders")

    # 12. Template
    count = db.query(Template).delete()
    deleted["templates"] = count
    log_info(f"Deleted {count} templates")

    db.commit()
    return deleted


def print_summary(title: str, counts: dict[str, int]) -> None:
    """Print a formatted summary."""
    print(f"\n{'=' * 50}")
    print(title)
    print("=" * 50)

    total = 0
    for name, count in counts.items():
        display_name = name.replace("_", " ").title()
        print(f"  {display_name:.<30} {count:>6}")
        if count > 0:
            total += count

    print("-" * 50)
    print(f"  {'Total':.<30} {total:>6}")
    print("=" * 50)


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Reset all data in NoteDock database and storage"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Skip confirmation prompt",
    )
    args = parser.parse_args()

    db = SessionLocal()

    try:
        # Count existing records
        db_counts = count_records(db)
        minio_count = count_minio_files()

        print_summary("Current Data", {**db_counts, "minio_files": minio_count})

        if args.dry_run:
            print("\n[DRY RUN] No data was deleted.")
            return

        # Check if there's anything to delete
        total = sum(db_counts.values()) + max(0, minio_count)
        if total == 0:
            print("\nNo data to delete. Database is already empty.")
            return

        # Confirmation
        if not args.force:
            print("\n⚠️  WARNING: This will permanently delete ALL data!")
            print("This operation cannot be undone.\n")
            response = input("Type 'DELETE' to confirm: ")
            if response != "DELETE":
                print("Operation cancelled.")
                return

        print("\nDeleting data...")

        # Delete MinIO files first
        minio_deleted = 0
        if minio_count > 0:
            print("\nDeleting MinIO files...")
            minio_deleted = delete_minio_files()

        # Delete database records
        print("\nDeleting database records...")
        deleted_counts = reset_database(db)

        print_summary("Deleted Data", {**deleted_counts, "minio_files": minio_deleted})
        print("\n✅ Data reset completed successfully!")

    except Exception as e:
        db.rollback()
        log_error(f"Data reset failed: {e}")
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
