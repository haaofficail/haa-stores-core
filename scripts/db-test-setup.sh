#!/bin/bash
# Haa Stores Core — Test Database Setup
# Creates haastores_test, runs migrations, and seeds test data.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

DB_URL="${TEST_DATABASE_URL:-${DATABASE_URL:-}}"
if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_URL or TEST_DATABASE_URL is not set."
  exit 1
fi

# Use TEST_DATABASE_URL if set, otherwise derive from DATABASE_URL
if [ -z "${TEST_DATABASE_URL:-}" ]; then
  DB_URL="${DATABASE_URL/postgres:\/\/haa:haa_secret_2024@localhost:5432\/haastores/postgres://haa:haa_secret_2024@localhost:5432/haastores_test}"
fi

DB_USER=$(echo "$DB_URL" | sed -E 's|postgres://([^:]+):.*|\1|')
DB_PASS=$(echo "$DB_URL" | sed -E 's|postgres://[^:]+:([^@]+).*|\1|')
DB_HOST=$(echo "$DB_URL" | sed -E 's|postgres://[^@]+@([^:]+):.*|\1|')
DB_PORT=$(echo "$DB_URL" | sed -E 's|postgres://[^@]+@[^:]+:([^/]+).*|\1|')
DB_NAME=$(echo "$DB_URL" | sed -E 's|postgres://[^@]+@[^:]+:[^/]+/(.+)|\1|')

echo "=== Test Database Setup ==="
echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"

# Create test DB (ignore error if exists)
PGPASSWORD="$DB_PASS" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || echo "  Database '$DB_NAME' already exists"

# Run migrations against test DB
echo "➤ Running migrations on test DB..."
export DATABASE_URL="$DB_URL"
cd "$PROJECT_DIR"
pnpm db:migrate
echo "  ✓ Migrations applied"

# Run seed against test DB
echo "➤ Running seed on test DB..."
pnpm db:seed
echo "  ✓ Seed data created"

echo ""
echo "=== Test database ready ==="
