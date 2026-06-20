#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.hostinger-mcp.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .hostinger-mcp.env in project root" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [ -z "${HOSTINGER_API_TOKEN:-}" ]; then
  echo "HOSTINGER_API_TOKEN is empty in .hostinger-mcp.env" >&2
  exit 1
fi

exec npx -y hostinger-api-mcp@latest
