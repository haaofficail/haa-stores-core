#!/usr/bin/env bash
# scripts/server/install-staging-stack.sh
#
# First-run bring-up of the Haa Stores staging stack ON the staging server.
# Run from the deploy directory after bootstrap-staging-server.sh and after
# you have created ${DEPLOY_PATH}/.env from .env.example.
#
# Steps:
#   1. validate docker compose config
#   2. (optional) log in to GHCR if the images are private
#   3. pull images and bring the stack up
#   4. initialise the database (idempotent bootstrap of the schema)
#   5. wait for the API health endpoint
#
# Idempotent and staging-only. Safe to re-run.
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/srv/haa-stores}"
REPO_URL="${REPO_URL:-https://github.com/haaofficail/haa-stores-core.git}"
REPO_REF="${REPO_REF:-main}"
SRC_DIR="${DEPLOY_PATH}/src"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }

cd "${DEPLOY_PATH}"

[ -f docker-compose.yml ] || { echo "Missing ${DEPLOY_PATH}/docker-compose.yml" >&2; exit 1; }
[ -f Caddyfile ]          || { echo "Missing ${DEPLOY_PATH}/Caddyfile" >&2; exit 1; }
[ -f .env ]               || { echo "Missing ${DEPLOY_PATH}/.env (copy from .env.example)" >&2; exit 1; }

log "Validating docker compose config"
docker compose config -q && echo "  ✓ compose config valid"

# 2. Optional GHCR login (only needed if the org's packages are private).
if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
  log "Logging in to GHCR as ${GHCR_USER}"
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin
fi

log "Pulling images"
docker compose pull

log "Bringing up data services first (postgres, redis)"
docker compose up -d postgres redis

log "Waiting for Postgres to be healthy"
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -q; then echo "  ✓ postgres ready"; break; fi
  sleep 2
done

# 4. Initialise the schema. The api image ships production-only deps (no
#    drizzle-kit), so migrations run from a repo checkout against the
#    localhost-published Postgres (127.0.0.1:5432).
log "Initialising database schema from repo (${REPO_REF})"
# shellcheck disable=SC1091
set -a; . "${DEPLOY_PATH}/.env"; set +a
MIGRATE_URL="postgres://${POSTGRES_USER:-haa}:${POSTGRES_PASSWORD}@127.0.0.1:5433/${POSTGRES_DB:-haastores}"
if [ ! -d "${SRC_DIR}/.git" ]; then
  git clone --depth 1 --branch "${REPO_REF}" "${REPO_URL}" "${SRC_DIR}"
else
  git -C "${SRC_DIR}" fetch --depth 1 origin "${REPO_REF}" && git -C "${SRC_DIR}" checkout -f "${REPO_REF}"
fi
( cd "${SRC_DIR}" \
  && pnpm install --frozen-lockfile --prefer-offline \
  && DATABASE_URL="${MIGRATE_URL}" pnpm db:bootstrap \
  && DATABASE_URL="${MIGRATE_URL}" pnpm db:seed )

log "Bringing up the full stack"
docker compose up -d --remove-orphans

log "Waiting for API health (via api container)"
for i in $(seq 1 20); do
  if docker compose exec -T api curl -fs "http://localhost:${API_PORT:-3001}/health" >/dev/null 2>&1; then
    echo "  ✓ API healthy"; break
  fi
  sleep 5
done

cat <<DONE

✅ Staging stack is up.

Verify externally once DNS + TLS settle (Caddy issues certs on first hit):
  curl -sS https://staging.haastores.com/health

From now on, pushes to `main` auto-deploy via .github/workflows/deploy.yml.
DONE
