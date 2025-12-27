#!/usr/bin/env python
"""
Backup script for NoteDock.

This script performs backup tasks:
- Database backup using pg_dump
- MinIO data directory backup (tar.gz)
- Cleanup of old backups (default 30 days retention)

Usage:
    poetry run python -m app.scripts.run_backup

Environment variables:
    DB_HOST: Database host
    DB_PORT: Database port
    DB_USER: Database user
    DB_PASSWORD: Database password
    DB_NAME: Database name
    BACKUP_DIR: Backup directory (default: /backups)
    BACKUP_RETENTION_DAYS: Backup retention in days (default: 30)
    MINIO_DATA_DIR: MinIO data directory (default: /data/minio)
"""

import os
import sys
import subprocess
import tarfile
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.core.logging import log_info, log_error, log_warning
from app.core.config import get_settings

settings = get_settings()


# Configuration
BACKUP_DIR = os.environ.get("BACKUP_DIR", "/backups")
BACKUP_RETENTION_DAYS = int(os.environ.get("BACKUP_RETENTION_DAYS", "30"))
MINIO_DATA_DIR = os.environ.get("MINIO_DATA_DIR", "/data/minio")


def ensure_backup_dir() -> Path:
    """Ensure backup directory exists."""
    backup_path = Path(BACKUP_DIR)
    backup_path.mkdir(parents=True, exist_ok=True)
    return backup_path


def get_timestamp() -> str:
    """Get current timestamp for backup filename."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def backup_database(backup_dir: Path) -> bool:
    """
    Backup PostgreSQL database using pg_dump.

    Returns:
        True if backup was successful, False otherwise.
    """
    timestamp = get_timestamp()
    backup_file = backup_dir / f"db_backup_{timestamp}.sql.gz"

    log_info(f"Starting database backup to {backup_file}")

    try:
        # Build pg_dump command
        pg_dump_cmd = [
            "pg_dump",
            "-h", settings.db_host,
            "-p", str(settings.db_port),
            "-U", settings.db_user,
            "-d", settings.db_name,
            "-F", "c",  # Custom format for better compression
            "-f", str(backup_file.with_suffix("")),  # Remove .gz for custom format
        ]

        # Set password in environment
        env = os.environ.copy()
        env["PGPASSWORD"] = settings.db_password

        # Run pg_dump
        result = subprocess.run(
            pg_dump_cmd,
            env=env,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            log_error(f"pg_dump failed: {result.stderr}")
            return False

        # Rename to .dump extension (pg_dump custom format)
        backup_file_dump = backup_file.with_suffix("").with_suffix(".dump")
        if backup_file.with_suffix("").exists():
            backup_file.with_suffix("").rename(backup_file_dump)

        log_info(f"Database backup completed: {backup_file_dump}")
        return True

    except FileNotFoundError:
        log_error("pg_dump command not found. Is PostgreSQL client installed?")
        return False
    except Exception as e:
        log_error(f"Database backup failed: {e}")
        return False


def backup_minio(backup_dir: Path) -> bool:
    """
    Backup MinIO data directory as tar.gz.

    Returns:
        True if backup was successful, False otherwise.
    """
    minio_path = Path(MINIO_DATA_DIR)

    if not minio_path.exists():
        log_warning(f"MinIO data directory not found: {MINIO_DATA_DIR}")
        return False

    timestamp = get_timestamp()
    backup_file = backup_dir / f"minio_backup_{timestamp}.tar.gz"

    log_info(f"Starting MinIO backup to {backup_file}")

    try:
        with tarfile.open(backup_file, "w:gz") as tar:
            tar.add(minio_path, arcname="minio_data")

        log_info(f"MinIO backup completed: {backup_file}")
        return True

    except Exception as e:
        log_error(f"MinIO backup failed: {e}")
        return False


def cleanup_old_backups(backup_dir: Path) -> int:
    """
    Remove backups older than retention period.

    Returns:
        Number of deleted backup files.
    """
    cutoff_date = datetime.now() - timedelta(days=BACKUP_RETENTION_DAYS)
    deleted_count = 0

    log_info(f"Cleaning up backups older than {BACKUP_RETENTION_DAYS} days")

    for backup_file in backup_dir.glob("*_backup_*"):
        try:
            # Get file modification time
            mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)

            if mtime < cutoff_date:
                backup_file.unlink()
                log_info(f"Deleted old backup: {backup_file.name}")
                deleted_count += 1

        except Exception as e:
            log_error(f"Failed to delete {backup_file}: {e}")

    return deleted_count


def main() -> None:
    """Run the backup job."""
    log_info("=" * 50)
    log_info("Starting NoteDock backup job")
    log_info("=" * 50)

    # Ensure backup directory exists
    backup_dir = ensure_backup_dir()
    log_info(f"Backup directory: {backup_dir}")

    results = {
        "database": False,
        "minio": False,
        "deleted_old_backups": 0,
    }

    # Backup database
    results["database"] = backup_database(backup_dir)

    # Backup MinIO
    results["minio"] = backup_minio(backup_dir)

    # Cleanup old backups
    results["deleted_old_backups"] = cleanup_old_backups(backup_dir)

    # Print results
    print("\n" + "=" * 50)
    print("Backup Results")
    print("=" * 50)
    print(f"Database backup:        {'SUCCESS' if results['database'] else 'FAILED'}")
    print(f"MinIO backup:           {'SUCCESS' if results['minio'] else 'FAILED/SKIPPED'}")
    print(f"Old backups deleted:    {results['deleted_old_backups']}")
    print("=" * 50 + "\n")

    if results["database"]:
        log_info("Backup job completed successfully")
    else:
        log_error("Backup job completed with errors")
        sys.exit(1)


if __name__ == "__main__":
    main()
