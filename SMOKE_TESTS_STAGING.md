# Staging Smoke Tests — Pre-Production Verification

**Environment:** Staging (72.61.108.208)  
**Duration:** ~15 minutes  
**Purpose:** Verify P0–P2 fixes are functional in deployed environment

---

## Test Categories

### 1. Health & Connectivity (2 min)

```bash
# API health check
curl -s https://staging-api.haastores.com/health | jq '.'
# Expected: { "status": "ok", "uptime": "..." }

# Database connectivity
curl -s https://staging-api.haastores.com/admin/dashboard \
  -H "Authorization: Bearer $STAGING_AUTH_TOKEN" | head -20
# Expected: 200 OK (no "database error" in response)

# Redis connectivity (indirect test via webhook dedup)
# (Verified via webhook endpoint test below)
```

### 2. Security — CSRF Protection (3 min)

```bash
# Test 1: Verify __csrf_token cookie is issued on GET
curl -i https://staging-api.haastores.com/admin/dashboard \
  -H "Authorization: Bearer $STAGING_AUTH_TOKEN" 2>&1 | grep -A 1 "__csrf_token"
# Expected: Set-Cookie: __csrf_token=...; HttpOnly; Secure; SameSite=Strict

# Test 2: POST without CSRF token should fail
curl -X POST https://staging-api.haastores.com/admin/settings \
  -H "Authorization: Bearer $STAGING_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}' -w "\n%{http_code}\n"
# Expected: 403 Forbidden (missing CSRF token)

# Test 3: POST with valid CSRF token should succeed
CSRF_TOKEN=$(curl -s https://staging-api.haastores.com/admin/dashboard \
  -H "Authorization: Bearer $STAGING_AUTH_TOKEN" | grep -oP '__csrf_token=\K[^;]+')
curl -X PATCH https://staging-api.haastores.com/admin/settings/1 \
  -H "Authorization: Bearer $STAGING_AUTH_TOKEN" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' -w "\n%{http_code}\n"
# Expected: 200 OK or 400 (validation error, not CSRF error)
```

### 3. Performance — Rate Limiting (3 min)

```bash
# Test 1: Single merchant making 6 requests (should hit limit on 6th)
for i in {1..6}; do
  curl -s https://staging-api.haastores.com/admin/orders \
    -H "Authorization: Bearer $MERCHANT_AUTH_TOKEN" \
    -w "\nRequest $i: %{http_code} (Rate-Limit-Remaining: %header{X-RateLimit-Remaining})\n"
  sleep 0.5
done
# Expected: First 5 = 200, 6th = 429 Too Many Requests

# Test 2: Different merchant should not be rate-limited
curl -s https://staging-api.haastores.com/admin/orders \
  -H "Authorization: Bearer $OTHER_MERCHANT_AUTH_TOKEN" \
  -w "\n%{http_code}\n"
# Expected: 200 OK (isolation works)
```

### 4. Performance — Gzip Compression (2 min)

```bash
# Test 1: Large response should be compressed
curl -s https://staging-api.haastores.com/admin/products \
  -H "Authorization: Bearer $STAGING_AUTH_TOKEN" \
  -H "Accept-Encoding: gzip" \
  -w "\nContent-Encoding: %header{Content-Encoding}\nSize: %{size_download} bytes\n"
# Expected: Content-Encoding: gzip, Size significantly smaller than uncompressed

# Test 2: Compare with uncompressed
curl -s https://staging-api.haastores.com/admin/products \
  -H "Authorization: Bearer $STAGING_AUTH_TOKEN" \
  -H "Accept-Encoding: identity" \
  -w "\nSize: %{size_download} bytes\n"
# Expected: Size larger than gzip version (~30% larger)
```

### 5. Performance — Pagination Limits (2 min)

```bash
# Test 1: Request more than 100 rows (should cap)
curl -s 'https://staging-api.haastores.com/admin/orders?limit=1000' \
  -H "Authorization: Bearer $STAGING_AUTH_TOKEN" | jq '.data | length'
# Expected: 100 (capped)

# Test 2: Request audit logs (higher limit of 200)
curl -s 'https://staging-api.haastores.com/admin/audit?limit=300' \
  -H "Authorization: Bearer $STAGING_AUTH_TOKEN" | jq '.data | length'
# Expected: 200 (capped for audit)
```

### 6. Payment Safety — Idempotency (2 min)

```bash
# Test 1: Payment webhook dedup (Redis)
curl -X POST https://staging-api.haastores.com/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-123" \
  -d '{"amount":100,"orderId":999}' \
  -w "\n%{http_code}\n"
# Expected: 200 OK

# Test 2: Same webhook with same Idempotency-Key should return same result
curl -X POST https://staging-api.haastores.com/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-123" \
  -d '{"amount":100,"orderId":999}' \
  -w "\n%{http_code}\n"
# Expected: 200 OK (deduplicated, not processed twice)
```

### 7. Webhook Security — Timestamp Verification (2 min)

```bash
# Test 1: Recent timestamp (should pass)
TS=$(date +%s)000
curl -X POST https://staging-api.haastores.com/webhooks/payment \
  -H "X-Webhook-Timestamp: $TS" \
  -H "X-Webhook-Signature: valid-sig" \
  -d '{}' -w "\n%{http_code}\n"
# Expected: 200 or 400 (signature validation), NOT 400 (timestamp error)

# Test 2: Old timestamp (>5 min, should fail)
TS=$(($(date +%s) - 600))000
curl -X POST https://staging-api.haastores.com/webhooks/payment \
  -H "X-Webhook-Timestamp: $TS" \
  -H "X-Webhook-Signature: valid-sig" \
  -d '{}' -w "\n%{http_code}\n"
# Expected: 400 Bad Request (timestamp validation failed)
```

### 8. Data Isolation — Export Authorization (2 min)

```bash
# Test 1: Merchant exports own store data (should work)
curl -s 'https://staging-api.haastores.com/exports/orders/csv?storeId=1' \
  -H "Authorization: Bearer $MERCHANT_AUTH_TOKEN" \
  -w "\n%{http_code}\n"
# Expected: 200 OK (or 304 Not Modified if cached)

# Test 2: Merchant tries to export another merchant's data (should fail)
curl -s 'https://staging-api.haastores.com/exports/orders/csv?storeId=999' \
  -H "Authorization: Bearer $MERCHANT_AUTH_TOKEN" \
  -w "\n%{http_code}\n"
# Expected: 403 Forbidden (not authorized for this store)
```

### 9. Error Masking — Production Errors Hidden (2 min)

```bash
# Test 1: Trigger a 5xx error (invalid database query)
curl -s 'https://staging-api.haastores.com/admin/invalid-endpoint' \
  -H "Authorization: Bearer $STAGING_AUTH_TOKEN"
# Expected: {"success":false,"error":{"code":"INTERNAL_ERROR","message":"An internal server error occurred. Please contact support."}}
# (NOT full stack trace or file paths)

# Test 2: Check stderr logs contain full error (for ops)
ssh $STAGING_SERVER 'tail -20 /var/log/haa-api/error.log' | grep "INTERNAL_ERROR"
# Expected: Full stack trace in logs (visible to ops, not to client)
```

### 10. Database — Performance Indexes (1 min)

```bash
# Test 1: List orders should be fast (<100ms)
time curl -s 'https://staging-api.haastores.com/admin/orders' \
  -H "Authorization: Bearer $STAGING_AUTH_TOKEN" > /dev/null
# Expected: real 0m0.050s (latency <100ms)

# Test 2: Query execution plan shows index usage
psql $STAGING_DB_URL -c "EXPLAIN ANALYZE SELECT * FROM orders WHERE tenant_id=1 ORDER BY created_at DESC LIMIT 20;"
# Expected: Index Scan (not Sequential Scan)
```

---

## PASS/FAIL CRITERIA

| Test                 | Pass                   | Fail                 |
| -------------------- | ---------------------- | -------------------- |
| Health checks        | 200 OK                 | Any 5xx              |
| CSRF tokens issued   | Set-Cookie present     | No cookie header     |
| CSRF POST protection | 403 on missing token   | 200 without token    |
| Rate limiting        | 429 on 6th request     | 200 on all requests  |
| Gzip compression     | Content-Encoding: gzip | No gzip header       |
| Pagination cap       | Max 100 rows           | 1000+ rows returned  |
| Idempotency          | 200 on retry           | Different response   |
| Webhook timestamp    | Recent TS passes       | Old TS passes        |
| Export auth          | 403 for other stores   | 200 for other stores |
| Error masking        | Generic message        | Stack trace visible  |
| Index performance    | <100ms latency         | >500ms latency       |

---

## EXECUTION SCRIPT

```bash
#!/bin/bash
set -e

STAGING_URL="https://staging-api.haastores.com"
AUTH_TOKEN="${STAGING_AUTH_TOKEN}"
MERCHANT_TOKEN="${MERCHANT_AUTH_TOKEN}"

echo "🧪 Starting Staging Smoke Tests..."

# 1. Health check
echo "✓ Test 1: Health Check"
curl -s $STAGING_URL/health | jq '.' || echo "FAIL: Health check"

# 2. CSRF token
echo "✓ Test 2: CSRF Token"
curl -s $STAGING_URL/admin/dashboard -H "Authorization: Bearer $AUTH_TOKEN" | grep -q "__csrf_token" && echo "PASS" || echo "FAIL"

# 3. Rate limiting
echo "✓ Test 3: Rate Limiting"
for i in {1..6}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_URL/admin/orders \
    -H "Authorization: Bearer $MERCHANT_TOKEN")
  if [ $i -eq 6 ] && [ "$HTTP_CODE" == "429" ]; then
    echo "PASS (429 on 6th request)"
    break
  elif [ $i -lt 6 ] && [ "$HTTP_CODE" == "200" ]; then
    continue
  else
    echo "FAIL"
    break
  fi
done

# 4. Gzip compression
echo "✓ Test 4: Gzip Compression"
ENCODING=$(curl -s $STAGING_URL/admin/products -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Accept-Encoding: gzip" -I | grep -i "content-encoding" | awk '{print $2}')
[ "$ENCODING" == "gzip" ] && echo "PASS" || echo "FAIL"

# 5. Pagination limit
echo "✓ Test 5: Pagination Limit"
COUNT=$(curl -s "$STAGING_URL/admin/orders?limit=1000" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.data | length')
[ "$COUNT" -le "100" ] && echo "PASS" || echo "FAIL"

echo ""
echo "✅ Smoke Tests Complete"
```

---

## APPROVAL

- [ ] All 10 test categories passed
- [ ] No unexpected errors or warnings
- [ ] Performance baseline established
- [ ] Security controls verified
- [ ] Approve staging deployment → production

**If any test fails:** Investigate root cause before approving production deployment.

---

**Prepared:** July 2, 2026  
**Run Before:** Production deployment approval
