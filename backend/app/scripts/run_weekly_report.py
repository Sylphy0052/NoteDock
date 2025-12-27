#!/usr/bin/env python
"""
Weekly report aggregation script for NoteDock.

This script aggregates weekly reports and creates achievement notes:
- Collects weekly notes from the past 7 days
- Parses project sections from each note (## @P 会社名/プロジェクト名)
- Summarizes content per project using AI
- Creates/updates achievement notes per project

Usage:
    poetry run python -m app.scripts.run_weekly_report

Cron setup (every Monday at 00:00):
    0 0 * * 1 cd /path/to/backend && poetry run python -m app.scripts.run_weekly_report
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.core.logging import log_error, log_info
from app.db.session import SessionLocal
from app.services.weekly_report_service import run_weekly_report_job


async def main() -> None:
    """Run the weekly report aggregation job."""
    log_info("Starting weekly report aggregation job...")

    db = SessionLocal()
    try:
        results = await run_weekly_report_job(db)

        print("\n" + "=" * 50)
        print("Weekly Report Aggregation Results")
        print("=" * 50)
        print(f"Processed notes:         {results['processed_notes']}")
        print(f"Projects updated:        {results['projects_updated']}")
        print(f"Achievement notes:       {results['achievement_notes_created']}")

        if results["errors"]:
            print(f"Errors:                  {len(results['errors'])}")
            for error in results["errors"]:
                print(f"  - {error}")

        print("=" * 50 + "\n")

        log_info("Weekly report aggregation completed successfully")
    except Exception as e:
        log_error(f"Weekly report aggregation failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
