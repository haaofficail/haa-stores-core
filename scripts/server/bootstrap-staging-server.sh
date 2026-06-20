#!/usr/bin/env bash
# scripts/server/bootstrap-staging-server.sh
#
# Prepares a fresh Ubuntu 24.04 staging server (Hostinger KVM, root) to run the
# Haa Stores staging stack. Idempotent and conservative:
#   - installs Docker Engine + Compose plugin (official apt repo)
#   - installs git + Node.js 22 + pnpm (used only to run DB migrations)
#   - creates the deploy directory /srv/haa-stores
#   - opens ONLY the ports the stack needs (22, 80, 443) via ufw, if ufw is used
#
# It NEVER removes containers/services it did not create, never touches
# production, and is safe to re-run.
#
# Usage (on the server, as root):
#   bash bootstrap-staging-server.sh
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/srv/haa-stores}"
NODE_MAJOR="${NODE_MAJOR:-22}"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "This bootstrap must run as root (the staging server's initial admin)." >&2
  exit 1
fi

log "Updating apt and installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg git ufw

# ── Docker Engine + Compose plugin ─────────────────────────────────────────
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  log "Docker + Compose already installed — skipping"
else
  log "Installing Docker Engine + Compose plugin"
  install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

log "Verifying root can run docker"
docker run --rm hello-world >/dev/null && echo "  ✓ docker works"

# ── Node.js + pnpm (for running DB migrations against the staging Postgres) ──
if command -v node >/dev/null 2>&1 && node -v | grep -q "v${NODE_MAJOR}"; then
  log "Node.js ${NODE_MAJOR} already installed — skipping"
else
  log "Installing Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
if ! command -v pnpm >/dev/null 2>&1; then
  log "Installing pnpm"
  corepack enable && corepack prepare pnpm@10 --activate || npm install -g pnpm@10
fi

# ── Deploy directory ───────────────────────────────────────────────────────
log "Ensuring deploy directory ${DEPLOY_PATH}"
mkdir -p "${DEPLOY_PATH}"

# ── Firewall — additive only ───────────────────────────────────────────────
# We only ALLOW the ports the stack needs; we never enable a default-deny
# policy here (that could lock out an existing service). If ufw is already
# active, these rules are additive and harmless.
log "Allowing ports 22, 80, 443 in ufw (additive)"
ufw allow 22/tcp  || true
ufw allow 80/tcp  || true
ufw allow 443/tcp || true

cat <<DONE

✅ Server bootstrap complete.

Next:
  1. Copy deploy/staging/{docker-compose.yml,Caddyfile,.env.example} to ${DEPLOY_PATH}
     and create ${DEPLOY_PATH}/.env from the example (fill in real secrets).
  2. Point DNS A records to this server:
       staging.haastores.com / admin.staging.haastores.com / merchant.staging.haastores.com
  3. Run:  bash scripts/server/install-staging-stack.sh
DONE
