#!/usr/bin/env bash
# scripts/server/install-github-runner-staging.sh
#
# Registers the staging VPS as a GitHub Actions self-hosted runner for this
# repository. This is the replacement path for GitHub-hosted runner SSH inbound:
# GitHub queues the deploy job, and the VPS runner pulls the job locally.
#
# Run ON the staging VPS. Do not commit or echo the registration token.
#
# Required env:
#   GITHUB_RUNNER_TOKEN  Repository runner registration token from GitHub.
#
# Optional env:
#   RUNNER_USER          OS user that owns/runs the runner. Default: deploy
#   RUNNER_NAME          GitHub runner name. Default: haa-staging-vps
#   RUNNER_ROOT          Parent dir. Default: /opt/actions-runner
#   REPO_URL             Repository URL. Default: https://github.com/haaofficail/haa-stores-core
#   RUNNER_VERSION       actions/runner version. Default: latest from GitHub API
#
# Example:
#   GITHUB_RUNNER_TOKEN="***" sudo -E bash scripts/server/install-github-runner-staging.sh
#
# Expected GitHub labels after registration:
#   self-hosted, linux, x64, haa-staging
set -euo pipefail

RUNNER_USER="${RUNNER_USER:-deploy}"
RUNNER_NAME="${RUNNER_NAME:-haa-staging-vps}"
RUNNER_ROOT="${RUNNER_ROOT:-/opt/actions-runner}"
RUNNER_DIR="${RUNNER_ROOT}/${RUNNER_NAME}"
REPO_URL="${REPO_URL:-https://github.com/haaofficail/haa-stores-core}"
CUSTOM_LABEL="${CUSTOM_LABEL:-haa-staging}"

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '  \033[0;32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[0;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[0;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

if [ "$(id -u)" -ne 0 ]; then
  die "Run as root with sudo so the runner can be installed as a system service"
fi

if [ -z "${GITHUB_RUNNER_TOKEN:-}" ]; then
  cat >&2 <<'TOKEN_HELP'

GITHUB_RUNNER_TOKEN is required.

Create it from:
  GitHub → Settings → Actions → Runners → New self-hosted runner

Or from a trusted local shell with GitHub CLI:
  gh api -X POST /repos/haaofficail/haa-stores-core/actions/runners/registration-token --jq .token

Do not paste this token into docs, PR comments, logs, or committed files.
TOKEN_HELP
  die "Missing GITHUB_RUNNER_TOKEN"
fi

if ! id "${RUNNER_USER}" >/dev/null 2>&1; then
  die "Runner user '${RUNNER_USER}' does not exist. Run setup-deploy-user.sh or create it first."
fi

log "Installing prerequisites"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl tar git jq

if ! getent group docker >/dev/null 2>&1; then
  warn "docker group does not exist. Deploy may fail unless Docker is installed."
else
  usermod -aG docker "${RUNNER_USER}"
  ok "Ensured ${RUNNER_USER} is in docker group"
fi

RUNNER_VERSION="${RUNNER_VERSION:-}"
if [ -z "${RUNNER_VERSION}" ]; then
  log "Resolving latest actions/runner release"
  RUNNER_VERSION="$(
    curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
      | jq -r '.tag_name' \
      | sed 's/^v//'
  )"
fi
[ -n "${RUNNER_VERSION}" ] && [ "${RUNNER_VERSION}" != "null" ] || die "Could not resolve runner version"

ARCH="$(uname -m)"
case "${ARCH}" in
  x86_64|amd64) RUNNER_ARCH="x64" ;;
  arm64|aarch64) RUNNER_ARCH="arm64" ;;
  *) die "Unsupported architecture: ${ARCH}" ;;
esac

if [ "${RUNNER_ARCH}" != "x64" ]; then
  die "This repository's deploy job requires label x64; current arch is ${RUNNER_ARCH}"
fi

log "Preparing runner directory ${RUNNER_DIR}"
install -d -m 0755 -o "${RUNNER_USER}" -g "${RUNNER_USER}" "${RUNNER_DIR}"
cd "${RUNNER_DIR}"

if [ ! -x ./config.sh ]; then
  log "Downloading actions-runner ${RUNNER_VERSION} (${RUNNER_ARCH})"
  RUNNER_TGZ="actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"
  curl -fsSLO "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_TGZ}"
  tar xzf "${RUNNER_TGZ}"
  rm -f "${RUNNER_TGZ}"
  chown -R "${RUNNER_USER}:${RUNNER_USER}" "${RUNNER_DIR}"
else
  ok "Runner binaries already exist"
fi

if [ -f .runner ]; then
  warn "Runner is already configured in ${RUNNER_DIR}; leaving registration unchanged"
else
  log "Configuring GitHub runner ${RUNNER_NAME}"
  sudo -H -u "${RUNNER_USER}" ./config.sh \
    --url "${REPO_URL}" \
    --token "${GITHUB_RUNNER_TOKEN}" \
    --name "${RUNNER_NAME}" \
    --labels "${CUSTOM_LABEL}" \
    --work "_work" \
    --unattended \
    --replace
  ok "Runner configured with custom label ${CUSTOM_LABEL}"
fi

log "Installing and starting systemd service"
./svc.sh install "${RUNNER_USER}" >/dev/null
./svc.sh start
./svc.sh status || true

cat <<DONE

✅ GitHub Actions staging runner is installed.

Verify in GitHub:
  Settings → Actions → Runners

Expected labels:
  self-hosted, linux, x64, ${CUSTOM_LABEL}

The PR #355 deploy job can now run on:
  runs-on: [self-hosted, linux, x64, ${CUSTOM_LABEL}]
DONE
