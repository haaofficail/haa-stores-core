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
#        Every migration is idempotent (duplicate-numbered merge siblings
#        guard their statements with IF NOT EXISTS / DO-EXCEPTION blocks),
#        so a fresh replay applies cleanly with ON_ERROR_STOP=1 and any
#        error is a real failure that aborts the run.
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
# The migration files are idempotent: every statement that a duplicate-numbered
# merge sibling (e.g. 0025_sudden_leech vs 0020-0024, 0028_live_presence vs
# 0027_membership_permissions) could re-create is guarded with IF NOT EXISTS
# (tables/columns/indexes) or a DO/EXCEPTION block (constraints). A fresh-DB
# replay therefore applies cleanly with zero "already exists" conflicts, so we
# run with ON_ERROR_STOP=1 and abort loudly on ANY error — a real regression
# can no longer hide behind a tolerated benign conflict.
MIGRATIONS_DIR="$PROJECT_DIR/packages/db/src/migrations"
applied=0
failed=0
for sql in "$MIGRATIONS_DIR"/[0-9][0-9][0-9][0-9]_*.sql; do
  name=$(basename "$sql" .sql)
  set +e
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -f "$sql" >/tmp/bs-psql.log 2>&1
  rc=$?
  set -e
  if [ $rc -eq 0 ]; then
    applied=$((applied+1))
    echo "  ✓ $name"
  else
    failed=$((failed+1))
    echo "  ✗ $name  (see below)"
    cat /tmp/bs-psql.log >&2
  fi
done
echo ""
echo "=== Step 1: applied $applied, failed $failed ==="

if [ "$failed" -gt 0 ]; then
  echo "Bootstrap aborted: $failed migration(s) failed. Fix them before recording hashes." >&2
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
