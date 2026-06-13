#!/bin/bash
# Haa Stores Core — Database Reset Script
# Drops, recreates, migrates, and seeds the database.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

DB_URL="${DATABASE_URL:-}"
if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_URL is not set. Create a .env file with DATABASE_URL=postgres://user:pass@host:5432/haastores"
  exit 1
fi

# Parse DB_URL
DB_USER=$(echo "$DB_URL" | sed -E 's|postgres://([^:]+):.*|\1|')
DB_PASS=$(echo "$DB_URL" | sed -E 's|postgres://[^:]+:([^@]+).*|\1|')
DB_HOST=$(echo "$DB_URL" | sed -E 's|postgres://[^@]+@([^:]+):.*|\1|')
DB_PORT=$(echo "$DB_URL" | sed -E 's|postgres://[^@]+@[^:]+:([^/]+).*|\1|')
DB_NAME=$(echo "$DB_URL" | sed -E 's|postgres://[^@]+@[^:]+:[^/]+/(.+)|\1|')

echo "⚠️  WARNING: This will DESTROY and recreate the database '$DB_NAME' on $DB_HOST:$DB_PORT"
read -p "Type 'yes' to confirm: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "=== Haa Stores — Database Reset ==="
echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"
echo ""

# Step 1: Terminate all connections and drop database
echo "➤ Terminating connections and dropping database..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
  SELECT pg_terminate_backend(pg_stat_activity.pid)
  FROM pg_stat_activity
  WHERE pg_stat_activity.datname = '$DB_NAME'
    AND pid <> pg_backend_pid();
" 2>/dev/null || true

PGPASSWORD="$DB_PASS" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME"
echo "  ✓ Database dropped"

# Step 2: Recreate database
PGPASSWORD="$DB_PASS" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
echo "  ✓ Database created"

# Step 3: Run migrations
echo ""
echo "➤ Running migrations..."
cd "$PROJECT_DIR"
pnpm db:migrate
echo "  ✓ Migrations applied"

# Step 4: Run seed
echo ""
echo "➤ Running seed..."
pnpm db:seed

echo ""
echo "=== Database reset complete ==="
