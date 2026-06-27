#!/usr/bin/env bash
# G9 — Post-deploy smoke gate (PR-G)
#
# Asserts key user journeys are alive after a staging deploy.
# Exits non-zero on any failure so deploy.yml can roll back.
#
# Usage: smoke-staging.sh <BASE_URL>
#   BASE_URL  e.g. https://staging.haastores.com
#
# What /health alone cannot catch:
#   - Caddy routing broken (SPA gets API JSON instead of HTML)
#   - @haa/* workspace dist missing (api crashed after /health check window)
#   - payment-methods contract regression (STORE-001)

set -euo pipefail

BASE_URL="${1:?Usage: smoke-staging.sh <BASE_URL>}"

# Derive the sibling SPA hosts (merchant./admin.) from the base host so the
# smoke verifies ALL THREE frontends are alive — not just the storefront. A
# 502 on merchant/admin (e.g. a Caddy↔Dockerfile port drift) now fails the
# gate and triggers rollback instead of shipping a broken login page.
# Overridable via env for non-standard topologies.
_scheme="${BASE_URL%%://*}"
_host="${BASE_URL#*://}"; _host="${_host%%/*}"
MERCHANT_URL="${MERCHANT_URL:-${_scheme}://merchant.${_host}}"
ADMIN_URL="${ADMIN_URL:-${_scheme}://admin.${_host}}"

PASS=0
FAIL=0

check() {
  local label="$1" url="$2" expect="$3"
  local body status

  body=$(curl -s --max-time 10 -w '\n__STATUS__%{http_code}' "$url" 2>/dev/null || true)
  status=$(printf '%s' "$body" | grep -o '__STATUS__[0-9]*' | grep -o '[0-9]*')
  body=$(printf '%s' "$body" | sed 's/__STATUS__[0-9]*$//')

  if [ "$status" != "200" ]; then
    echo "::error::SMOKE FAIL [$label] — expected HTTP 200, got $status ($url)"
    FAIL=$((FAIL+1))
    return
  fi

  if ! echo "$body" | grep -qi "$expect"; then
    echo "::error::SMOKE FAIL [$label] — HTTP 200 but expected pattern '$expect' not found ($url)"
    echo "  Response snippet: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL+1))
    return
  fi

  echo "✓ [$label] HTTP 200 + pattern OK ($url)"
  PASS=$((PASS+1))
}

echo "==> Running post-deploy smoke against $BASE_URL"

# 1. API health (process + DB + Redis)
check "api-health"          "$BASE_URL/health"                              '"status"'

# 2. Storefront root — must be HTML, not API JSON
check "storefront-html"     "$BASE_URL/"                                    '<!doctype html'

# 3. API reachable through /api/* Caddy strip-prefix
#    payment-methods proves STORE-001 fix and full API→DB→store chain
check "api-payment-methods" "$BASE_URL/api/s/haa-demo/payment-methods"     '"methods"'

# 4. Merchant dashboard login — SPA HTML served via the merchant. subdomain
check "merchant-login-html" "$MERCHANT_URL/"                               '<!doctype html'

# 5. Admin dashboard login — SPA HTML served via the admin. subdomain
check "admin-login-html"    "$ADMIN_URL/"                                  '<!doctype html'

echo ""
echo "==> Smoke results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo "::error::$FAIL smoke check(s) failed — triggering rollback"
  exit 1
fi

echo "::notice::All smoke checks passed ($PASS/$((PASS+FAIL)))"
