#!/bin/bash
# Haa Stores Core — Database Restore Script
# Restores a pg_dump custom-format backup.

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

# Determine backup file to restore
BACKUP_FILE=""
if [ $# -ge 1 ]; then
  BACKUP_FILE="$1"
else
  # Use latest symlink
  if [ -f "${BACKUP_DIR}/latest.sql" ]; then
    BACKUP_FILE=$(readlink "${BACKUP_DIR}/latest.sql")
    if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
      BACKUP_FILE="${BACKUP_DIR}/latest.sql"
    fi
  fi
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found."
  echo "Usage: $0 [backup-file-path]"
  echo ""
  echo "Available backups:"
  ls -1 "$BACKUP_DIR"/*.sql 2>/dev/null | while read -r f; do
    SIZE=$(du -h "$f" | cut -f1)
    echo "  $f ($SIZE)"
  done
  exit 1
fi

echo "=== Haa Stores — Database Restore ==="
echo "Database:   $DB_NAME on $DB_HOST:$DB_PORT"
echo "Restore from: $BACKUP_FILE"
echo ""

# Terminate connections and drop
echo "➤ Terminating connections and dropping database..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
  SELECT pg_terminate_backend(pg_stat_activity.pid)
  FROM pg_stat_activity
  WHERE pg_stat_activity.datname = '$DB_NAME'
    AND pid <> pg_backend_pid();
" 2>/dev/null || true

PGPASSWORD="$DB_PASS" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME"
PGPASSWORD="$DB_PASS" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
echo "  ✓ Database recreated"

# Restore
echo ""
echo "➤ Restoring from backup..."
PGPASSWORD="$DB_PASS" pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --verbose \
  "$BACKUP_FILE"

echo ""
echo "  ✓ Restore complete"
