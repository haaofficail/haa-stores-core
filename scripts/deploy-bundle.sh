#!/usr/bin/env bash
# Deploy haastores.com from a git bundle file
# Usage: bash deploy-bundle.sh /path/to/haa-stores-core-backup-YYYY-MM-DD.bundle
# Run as user 'haa'
set -euo pipefail

BUNDLE="${1:-}"
APP_DIR="/home/haa/app"
REPO_DIR="$APP_DIR/repo"
ENV_FILE="$APP_DIR/.env.production"

if [ -z "$BUNDLE" ]; then
  echo "Usage: bash deploy-bundle.sh <path-to-bundle>"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.production.template and fill it first."
  exit 1
fi

echo "=== [1/6] Clone from bundle ==="
if [ -d "$REPO_DIR" ]; then
  echo "Updating existing repo..."
  git -C "$REPO_DIR" fetch "$BUNDLE" main:main
  git -C "$REPO_DIR" checkout main
else
  git clone -b main "$BUNDLE" "$REPO_DIR"
fi

echo "=== [2/6] Install dependencies ==="
cd "$REPO_DIR"
pnpm install --frozen-lockfile

echo "=== [3/6] Build all packages ==="
# Build in correct order (db first to avoid circular issue)
pnpm --filter @haa/db build || true
pnpm -r --filter '!@haa/db' build

echo "=== [4/6] Copy production env and run migrations ==="
cp "$ENV_FILE" "$REPO_DIR/.env"
pnpm db:migrate

echo "=== [5/6] Start / reload API with PM2 ==="
cp "$REPO_DIR/ecosystem.config.cjs" "$APP_DIR/"
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

echo "=== [6/6] Reload nginx ==="
sudo systemctl reload nginx

echo ""
echo "✅ Deployed successfully. Check: pm2 logs api"
