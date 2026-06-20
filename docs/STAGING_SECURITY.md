# Staging Security — P0A Foundation

## Status: ✅ Complete

Part of the Deployment Readiness Plan. All P0A items are implemented and tested.

---

## 1. Error Handling

**Files:**
- `packages/shared/src/errors.ts` — 8 error classes: `AppError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `RateLimitedError`, `InternalError`
- `apps/api/src/middleware/error-handler.ts` — Centralized error handler (Hono `onError`)

**Behavior:**
- `AppError` subclasses → return `{ success: false, error: { code, message } }` with correct HTTP status
- Generic `Error` (unhandled) → `INTERNAL_ERROR` with generic message in staging/production, detailed message in development
- Stack traces: never returned in responses; logged to console in development only
- Validation errors from Zod: handled via Hono's `HTTPException` (passed through)

**Error Codes:**
| Code | HTTP Status | Source |
|------|:-----------:|--------|
| `VALIDATION_ERROR` | 400 | ValidationError |
| `UNAUTHORIZED` | 401 | UnauthorizedError |
| `FORBIDDEN` | 403 | ForbiddenError |
| `NOT_FOUND` | 404 | NotFoundError |
| `CONFLICT` | 409 | ConflictError |
| `RATE_LIMITED` | 429 | RateLimitedError |
| `INTERNAL_ERROR` | 500 | InternalError / unhandled errors |

---

## 2. Security Headers

**File:** `apps/api/src/middleware/security-headers.ts`

**Headers applied to all responses:**

| Header | Value | Environment |
|--------|-------|:-----------:|
| `X-Content-Type-Options` | `nosniff` | all |
| `X-Frame-Options` | `DENY` | all |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | all |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | all |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | staging/production only |

**Note:** Content-Security-Policy intentionally deferred. It will likely break Vite dev server's inline scripts and HMR WebSocket connections. CSP should be added as a P2 item once the CSP is tailored for production static builds.

---

## 3. CORS

**Implementation:** `apps/api/src/index.ts` uses `CORS_ORIGINS` env var

**Local default:**
```
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

**Staging example:**
```
CORS_ORIGINS=https://app.haastores.com,https://haastores.com
```

**Behavior:**
- No wildcard (`*`) in any environment
- Multiple origins comma-separated
- Credentials enabled (for JWT cookie/session)
- Origins not in list → browser blocks the request

---

## 4. Rate Limiting

**File:** `apps/api/src/middleware/rate-limiter.ts`

**Implementation:** In-memory sliding window. NOT suitable for multi-instance production (use Redis).

**Rules:**

| Route | Window | Max Requests |
|-------|--------|:-----------:|
| All `/s/*` (storefront) | 10 min | 60 |
| `/auth/login` | 10 min | 10 |

**Response on limit:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "تم تجاوز الحد المسموح من المحاولات. حاول لاحقًا."
  }
}
```

**Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Note:** In-memory limiter is sufficient for staging MVP. Before production multi-instance deployment, replace with Redis-based limiter.

---

## 5. Environment Variables / Secrets

**File:** `apps/api/src/env.ts`

**Validation at startup:**
1. Required vars checked: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY` (+ URL vars in staging/production)
2. Dev default secrets rejected if `NODE_ENV=production` or `NODE_ENV=staging`
3. Missing required var → startup fails with clear message

**Classification:**

| Variable | Required | Local | Staging | Production |
|----------|:--------:|:-----:|:-------:|:----------:|
| `DATABASE_URL` | ✅ | dev DB | staging DB | production DB |
| `JWT_SECRET` | ✅ | dev | random | random |
| `ENCRYPTION_KEY` | ✅ | dev | random | random |
| `API_BASE_URL` | staging/prod | optional | ✅ | ✅ |
| `MERCHANT_DASHBOARD_URL` | staging/prod | optional | ✅ | ✅ |
| `STOREFRONT_URL` | staging/prod | optional | ✅ | ✅ |
| `CORS_ORIGINS` | no | localhost | domains | domains |
| `API_PORT` | no | 3000 | 3000 | 3000 |
| `NODE_ENV` | no | development | staging | production |
| `LOG_LEVEL` | no | debug | info | warn |

---

## 6. Logging Safety

**Current:** Hono `logger()` middleware prints request method, path, status, duration — no sensitive data.

**Guidelines:**
- Never log JWT tokens
- Never log passwords or password hashes
- Never log `ENCRYPTION_KEY` or `JWT_SECRET`
- Never log full payment payloads
- Error handler logs stack traces in development only

**Structured logging:** Deferred to P1 (recommend using `pino` or `consola`).

---

## 7. What's Suitable for Staging Only

- In-memory rate limiter (acceptable for single-instance staging)
- No CSP (will configure for production)
- Dev default secrets allowed in development only

## 8. What Must Improve Before Production

- Replace in-memory rate limiter with Redis
- Add Content-Security-Policy
- Add structured logging (pino)
- Add refresh token / session strategy
- Add DB backup automation
- Add migration rollback procedure
