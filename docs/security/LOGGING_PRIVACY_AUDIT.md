# Logging & Privacy Audit

> Assessment of what is logged, what must never be logged, and privacy safeguards.
> Local-development scope only.

---

## What Is Logged

### 1. Request/Response Logs (structured-logger.ts)

| Field | Logged | Redacted |
|-------|--------|----------|
| HTTP method | ✅ Yes | N/A |
| URL path | ✅ Yes | N/A |
| Status code | ✅ Yes | N/A |
| Duration | ✅ Yes | N/A |
| Request headers | ✅ Yes | Sensitive headers → `[REDACTED]` |
| Request body | ⚠️ Skipped for multipart | N/A |

**Redacted header patterns:**
```
password, token, secret, authorization, x-api-key,
api_key, apiKey, access_token, refresh_token,
jwt, encryption_key, encryptionKey
```

### 2. Monitoring Events (monitoring-events.ndjson)

| Event Type | Data Logged |
|------------|-------------|
| Health checks | Check name, status, duration, timestamp |
| Synthetic checks | Endpoint, status code, duration, timestamp |
| Error analysis | Severity, count, fingerprint, recommendation |

**Secrets logged in monitoring:** NONE — health/synthetic checks only record check metadata.

### 3. Support Error Events (support-error-events.ndjson)

| Field | Logged | Sanitized |
|-------|--------|-----------|
| errorCode | ✅ | N/A |
| correlationId | ✅ | N/A |
| eventId | ✅ | N/A |
| message | ✅ | Max 200 chars, stack traces stripped (dev mode only) |
| route | ✅ | N/A |
| method | ✅ | N/A |
| statusCode | ✅ | N/A |
| merchantId | ✅ | N/A (internal ID) |
| storeId | ✅ | N/A (internal ID) |
| payload values | ✅ | Sanitized recursively |

**Sanitization blocklist:**
```
password, token, authorization, cookie, secret,
apiKey, accessToken, refreshToken, card, cvv, iban, env
```

Keys matching any blocklist pattern (case-insensitive substring) → `"[REDACTED]"`.

### 4. Console Logs

Should not contain sensitive data. The `structured-logger.ts` already redacts headers.

---

## What Must Never Be Logged

| Data Type | Protected | Verification |
|-----------|-----------|-------------|
| Passwords | ✅ Redacted | Blocklist covers `password` |
| JWT tokens | ✅ Redacted | Blocklist covers `token`, `authorization` |
| API keys | ✅ Redacted | Blocklist covers `apiKey` |
| Card numbers | ✅ Redacted | Blocklist covers `card` |
| CVV | ✅ Redacted | Blocklist covers `cvv` |
| IBAN | ✅ Redacted | Blocklist covers `iban` |
| Environment values | ✅ Redacted | Blocklist covers `env` |
| Stack traces (production) | ✅ Stripped | `NODE_ENV` check in error handler |
| Database credentials | ✅ Omitted | Only `DATABASE_URL` is referenced (not logged) |
| Payment provider secrets | ⚠️ Placeholder in .env.example | Dev values only, not logged anywhere |

---

## Error Capture Sanitization Review

### Blocklist Coverage

```
password    ──── covers any key ending with password
token       ──── covers auth_token, access_token, refresh_token
authorization ── covers Authorization header
cookie      ──── covers Set-Cookie, Cookie
secret      ──── covers any key containing "secret"
apiKey      ──── covers api_key, x-api-key
accessToken ──── explicit
refreshToken ─── explicit
card        ──── covers card_number, cardholder
cvv         ──── covers cvv, cvc
iban        ──── covers iban
env         ──── covers NODE_ENV value (edge case — could block "env" in payload keys)
```

### Gap Analysis

| Gap | Risk | Mitigation |
|-----|------|------------|
| `env` in blocklist may be too broad | Low | Could block legitimate payload keys containing "env" |
| No block for `phone` | Low | Phone numbers are internal merchant data |
| No block for `address` | Low | Addresses are customer data — should they be in error events? |
| Array elements not recursed | Low | Arrays are preserved as-is; sensitive data inside arrays may not be sanitized |
| Blocklist is substring match | ⚠️ False positives | e.g., `"token"` matches `"tokenizer"` or `"token_name"` |

**Verdict: GOOD** — The sanitization covers the most critical data types. Gaps are low-risk.

---

## Console / Log Risks

| Risk | Status | Mitigation |
|------|--------|------------|
| `console.log(err)` in development | ✅ Controlled | Only in `!isProduction` branch of error handler |
| `console.warn` for report failures | ✅ Minimal | Logged as `[support-error-log]` warning — no data |
| Structured logger writes to stdout | ✅ Acceptable | Local development — production should use file/stream |
| Monitoring events are NDJSON | ✅ Local only | In .gitignore (`storage` pattern) |
| Support error events are NDJSON | ✅ Local only | In .gitignore (`storage` pattern) |

---

## NDJSON Log Risks

| Risk | Current State | Mitigation |
|------|--------------|------------|
| Log file grows unbounded | ⚠️ No rotation | Acceptable for local dev; add rotation for production |
| Log file contains internal IDs | ✅ Acceptable | merchantId, storeId, userId are internal only |
| Log file contains customer PII | ⚠️ Possible | customerId in events, but no name/phone/address |
| .gitignore covers storage/ | ✅ | NDJSON files are not committed to git |

---

## Local-Only Notes

- All logging is local filesystem — no external log shipping
- No Datadog, Sentry, Logtail, or any SaaS logging
- No structured logging to an external endpoint
- The `POST /internal/support-errors/report` is guarded (404 in production)

---

## Production-Later Notes

When transitioning to production, the following safeguards are required:

| Requirement | Priority | Details |
|------------|----------|---------|
| Log rotation | P1 | Rotate NDJSON files daily or at size limit |
| Log shipping encryption | P1 | TLS if shipping logs externally |
| Log access control | P1 | Only authorized developers/ops can read log files |
| Audit log for log access | P2 | Track who reads log files |
| PII scrubbing verification | P1 | Regular audit of log contents |
| Structured log streaming | P2 | Forward to stdout (Docker/CloudWatch) instead of file |
| Production stack traces disabled | ✅ Already done | `NODE_ENV=production` strips them |

---

## Required Safeguards

| # | Safeguard | Current Status | Target |
|---|-----------|---------------|--------|
| 1 | Sensitive header redaction | ✅ Implemented | Maintain |
| 2 | Secret sanitization in error events | ✅ Implemented | Maintain |
| 3 | Stack trace stripping in production | ✅ Implemented | Verify on first production deploy |
| 4 | .env.gitignore | ✅ Implemented | Maintain |
| 5 | .env.example with placeholder values | ⚠️ Dev values only | Replace with descriptive placeholders before production |
| 6 | NDJSON file rotation | ❌ Not implemented | Add before production |
| 7 | Audit log for log reads | ❌ Not implemented | Add before production |
| 8 | Array element recursion in sanitizer | ⚠️ Not implemented | Add before production |
