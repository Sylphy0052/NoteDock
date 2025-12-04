#!/usr/bin/env python
"""
Cleanup script for NoteDock.

This script performs maintenance tasks:
- Permanently deletes notes in trash for more than 30 days
- Removes old version history (beyond 50 versions, older than 1 year)
- Cleans up orphaned files from MinIO

Usage:
    poetry run python -m app.scripts.run_cleanup
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.db.session import SessionLocal
from app.services.cleanup_service import run_cleanup_job
from app.core.logging import log_info, log_error


def main() -> None:
    """Run the cleanup job."""
    log_info("Starting cleanup job...")

    db = SessionLocal()
    try:
        results = run_cleanup_job(db)

        print("\n" + "=" * 50)
        print("Cleanup Results")
        print("=" * 50)
        print(f"Deleted notes (from trash):     {results['deleted_notes']}")
        print(f"Deleted old versions:           {results['deleted_versions']}")
        print(f"Deleted orphaned files:         {results['deleted_files']}")
        print("=" * 50 + "\n")

        log_info("Cleanup job completed successfully")
    except Exception as e:
        log_error(f"Cleanup job failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
