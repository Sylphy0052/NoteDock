#!/bin/bash
# NoteDock Backup Cron Script
#
# This script is designed to be run via cron for automated backups.
# Add to crontab (run at 2:00 AM daily):
#   0 2 * * * /path/to/cron_backup.sh >> /var/log/notedock_backup.log 2>&1
#
# Or use in Docker with environment:
#   docker exec notedock-backend python -m app.scripts.run_backup

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "====================================="
echo "NoteDock Backup Job"
echo "Started at: $(date)"
echo "====================================="

# Change to backend directory
cd "$BACKEND_DIR"

# Run backup using poetry
if command -v poetry &> /dev/null; then
    poetry run python -m app.scripts.run_backup
else
    # Fallback for Docker or direct Python execution
    python -m app.scripts.run_backup
fi

echo ""
echo "Completed at: $(date)"
echo "====================================="
