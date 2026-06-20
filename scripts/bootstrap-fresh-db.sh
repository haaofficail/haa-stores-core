#!/usr/bin/env bash
# scripts/bootstrap-fresh-db.sh
#
# Bootstraps a brand-new PostgreSQL database to the latest Haa schema state
# from scratch, deterministically. This is the documented
# "merge-ready bootstrap path" for TASK-0030 (Configurable Platform Fee
# Policy) — see DECISION-0007 in docs/ops/DECISIONS.md.
#
# Why this script exists:
#   `pnpm db:migrate` (drizzle-kit) has a silent-exit bug on a brand-new
#   DB when a journal entry's snapshot file is missing for newer
#   migrations. The migration SQL itself is correct, but the toolchain
#   exits 0 with 0 migrations applied (no error to the user).
#   This script uses two passes:
#     1. `psql -f` each SQL file in order — applies schema changes.
#        Pre-existing migrations (0010, 0025, 0028, 0030, 0033, 0034,
#        0037, 0039, 0046) may emit NOTICE-level "already exists"
#        messages, but they are safe to ignore because the migrations
#        use `IF NOT EXISTS` clauses for the most part.
#     2. `drizzle-orm`'s migrator records the hashes in
#        `drizzle.__drizzle_migrations` so future `pnpm db:migrate` calls
#        recognize the state correctly.
#
# Usage:
#   ./scripts/bootstrap-fresh-db.sh <db_name>
#
# Example:
#   ./scripts/bootstrap-fresh-db.sh haastores_fresh

set -euo pipefail

# Optional <db_name> arg. If omitted, the DB name is derived from DATABASE_URL
# so `pnpm db:bootstrap` / `pnpm setup` work with zero args for the project DB.
# Pass an explicit name only to bootstrap a DIFFERENT throwaway/test database.
DB_NAME="${1:-}"

# Load env (DB URL, password) without leaking the password to ps.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env"
  set +a
fi

if [ -z "$DB_NAME" ]; then
  DB_NAME="$(node -e "const u=new URL(process.env.DATABASE_URL); process.stdout.write(u.pathname.replace(/^\//,''))" 2>/dev/null || true)"
fi
if [ -z "$DB_NAME" ]; then
  echo "usage: $0 [db_name]   (or set DATABASE_URL so the name can be derived)" >&2
  exit 1
fi

DB_URL="${DATABASE_URL:-postgres://haa:haa_secret_2024@localhost:5432/haastores}"
DB_USER="$(node -e "const u=new URL(process.env.DATABASE_URL); process.stdout.write(decodeURIComponent(u.username))")"
DB_PASS="$(node -e "const u=new URL(process.env.DATABASE_URL); process.stdout.write(decodeURIComponent(u.password))")"
DB_HOST="$(node -e "const u=new URL(process.env.DATABASE_URL); process.stdout.write(u.hostname)")"
DB_PORT="$(node -e "const u=new URL(process.env.DATABASE_URL); process.stdout.write(u.port || '5432')")"

echo "=== Bootstrap: $DB_NAME on $DB_HOST:$DB_PORT ==="

# Step 0: drop (if exists) then recreate — ensures a clean slate every run.
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\"" 2>&1 | tail -1 || true
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE \"$DB_NAME\"" 2>&1 | tail -1

# Step 1: apply every SQL migration in numeric order.
#
# The migration tree contains duplicate-numbered files from prior branch
# merges (e.g. 0025_publish_gate + 0025_sudden_leech, 0027/0028 pairs).
# When applied to a fresh DB in order, the redundant ones try to recreate
# objects an earlier migration already created and emit "already exists".
# The resulting schema is still correct — the object exists either way.
#
# We therefore run each file with ON_ERROR_STOP=0 so EVERY statement is
# attempted (psql autocommits per statement, so a benign conflict on one
# statement never blocks the rest of the file — critical, since otherwise
# a redundant ADD COLUMN at the top of a file would skip the CREATE INDEXes
# below it and leave the schema incomplete). A migration only counts as
# failed when it emits an ERROR that is NOT a benign "already exists"
# conflict, in which case we abort loudly.
MIGRATIONS_DIR="$PROJECT_DIR/packages/db/src/migrations"
applied=0
failed=0
for sql in "$MIGRATIONS_DIR"/[0-9][0-9][0-9][0-9]_*.sql; do
  name=$(basename "$sql" .sql)
  set +e
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=0 -f "$sql" >/tmp/bs-psql.log 2>&1
  set -e
  # Genuine failures = ERROR lines that are not "already exists" conflicts.
  real_errors=$(grep 'ERROR:' /tmp/bs-psql.log | grep -viE 'already exists' || true)
  if [ -z "$real_errors" ]; then
    applied=$((applied+1))
    echo "  ✓ $name"
  else
    failed=$((failed+1))
    echo "  ✗ $name  (real error — see below)"
    echo "$real_errors" >&2
  fi
done
echo ""
echo "=== Step 1: applied $applied, failed $failed ==="

if [ "$failed" -gt 0 ]; then
  echo "Bootstrap aborted: $failed migration(s) had genuine errors. Fix them before recording hashes." >&2
  exit 1
fi

# Step 2: record hashes in drizzle.__drizzle_migrations so subsequent
# pnpm db:migrate calls recognize the state.
echo ""
echo "=== Step 2: record migration hashes via drizzle-orm migrator ==="
DB_URL_FOR_MIGRATE="postgres://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME"
DATABASE_URL="$DB_URL_FOR_MIGRATE" node "$SCRIPT_DIR/record-migration-hashes.mjs"

echo ""
echo "=== Done. Verifying state ==="
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT COUNT(*) AS recorded_migrations FROM drizzle.__drizzle_migrations;" 2>&1
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT COUNT(*) AS public_tables FROM information_schema.tables WHERE table_schema='public';" 2>&1
