#!/bin/bash
# Haa Stores Core — Database Backup Script
# Creates a timestamped pg_dump backup.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

DB_URL="${DATABASE_URL:-postgres://haa:haa_secret_2024@localhost:5432/haastores}"
BACKUP_DIR="${PROJECT_DIR}/backups"

# Parse DB_URL
DB_USER=$(echo "$DB_URL" | sed -E 's|postgres://([^:]+):.*|\1|')
DB_PASS=$(echo "$DB_URL" | sed -E 's|postgres://[^:]+:([^@]+).*|\1|')
DB_HOST=$(echo "$DB_URL" | sed -E 's|postgres://[^@]+@([^:]+):.*|\1|')
DB_PORT=$(echo "$DB_URL" | sed -E 's|postgres://[^@]+@[^:]+:([^/]+).*|\1|')
DB_NAME=$(echo "$DB_URL" | sed -E 's|postgres://[^@]+@[^:]+:[^/]+/(.+)|\1|')

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"

echo "=== Haa Stores — Database Backup ==="
echo "Database:  $DB_NAME on $DB_HOST:$DB_PORT"
echo "Backup to: $BACKUP_FILE"
echo ""

PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=c \
  --verbose \
  --no-owner \
  --no-acl \
  -f "$BACKUP_FILE"

# Create a symlink to latest backup
ln -sf "$BACKUP_FILE" "${BACKUP_DIR}/latest.sql"

# Show size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo "  ✓ Backup complete: $BACKUP_FILE ($SIZE)"
echo "  ✓ Latest symlink: ${BACKUP_DIR}/latest.sql"
