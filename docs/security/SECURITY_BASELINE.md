# Security Baseline

> Local-only security assessment of Haa Stores Core.
> All findings are local-development scope. No production deployment.

---

## Summary

**Overall Posture: GOOD** — The API has a well-structured two-layer auth system (JWT authentication + store-scoped authorization + optional permission checks). The dashboard enforces authentication at the route level. No P0 (critical) findings were discovered.

Key strength: `auth-core` provides `requireAuth()`, `requireStoreAccess()`, and `requirePermission()` as composable middleware blocks, with store-level BOLA/IDOR protection built in.

Key gaps: Permission consistency in customers route, missing audit logging for customer mutations, and no role-based route filtering in the frontend.

---

## Auth Findings

| Check | Status | Details |
|-------|--------|---------|
| JWT authentication | ✅ | HS256, configurable expiry, token version revocation |
| Admin JWT isolation | ✅ | Separate `ADMIN_JWT_SECRET` key |
| Token revocation | ✅ | `tokenVersion` checked on DB on every request |
| Password hashing | ✅ | bcrypt, 12 rounds |
| Rate limiting | ✅ | IP+path based, configurable window/limit |
| CSP headers | ✅ | restrictive, with `frame-ancestors 'none'` |
| HSTS (production) | ✅ | `max-age=31536000; includeSubDomains` (dev omitted) |
| Session refresh | ❌ | No refresh token mechanism; single JWT expires after 24h |
| XSS token leak | ⚠️ | JWT stored in `localStorage` — standard but XSS-vulnerable |

---

## API Authorization Findings

| Route Group | Auth | Store Access | Permissions | Status |
|-------------|------|-------------|-------------|--------|
| auth | Partial | N/A | N/A | ✅ Login/register public; /me and /logout protected |
| admin | ✅ `requireAdminAuth` | N/A | ✅ on payouts | ✅ Separate JWT secret |
| dashboard | ✅ `requireAuth` | ✅ `requireStoreAccess` | ❌ No per-route permissions | ⚠️ All dashboard routes share blanket protection |
| settings | ✅ `requireAuth` | ✅ `requireStoreAccess` | ✅ `stores:read` / `settings:update` | ✅ |
| products | ✅ `requireAuth` | ✅ `requireStoreAccess` | ✅ CRUD granular | ✅ |
| customers | ✅ `requireAuth` | ✅ `requireStoreAccess` | ⚠️ create/update uses `customers:read` | 🚨 Permission downgrade |
| orders | ✅ `requireAuth` | ✅ `requireStoreAccess` | ✅ CRUD granular | ✅ |
| storefront | ❌ Public | N/A | N/A | ✅ By design (customer-facing) |
| webhooks | Not inspected | — | — | ⚠️ Needs separate audit |
| shipping | Not inspected | — | — | ⚠️ Needs separate audit |
| payments | Not inspected | — | — | ⚠️ Needs separate audit |

### Finding P1-01: Customer route uses read permission for writes

**File:** `apps/api/src/routes/customers.ts`
- `POST /` (create customer) requires `customers:read`
- `PATCH /:id` (update customer) requires `customers:read`
- Should be `customers:create` and `customers:update` respectively

### Finding P1-02: No audit logging for customer mutations

Unlike products (which logs every create/update/delete), customers routes do not record audit events for create or update operations.

---

## Dashboard Protection Findings

| Check | Status | Details |
|-------|--------|---------|
| Auth gate on all routes except /login | ✅ | `AuthGuard` wraps all dashboard routes |
| Role/permission filtering at route level | ❌ | No role/permission-based route filtering — any authenticated user can see every page |
| Page-level auth | ❌ | Individual pages have zero auth logic |
| UI-only vs API enforcement | ✅ | API enforces permissions independently of UI |
| Login page redirect for authenticated users | ✅ | Login.tsx checks `user` and redirects |
| Logout | ✅ | Clears localStorage, hard redirect |

### Finding P1-03: No role-based route filtering in frontend

The `AuthGuard` component checks only `user !== null`. Any authenticated user (merchant, employee with limited permissions) can navigate to any dashboard route. The API correctly rejects unauthorized operations, but the user sees navigation/layout for features they cannot use.

---

## Storefront Exposure Findings

| Check | Status | Details |
|-------|--------|---------|
| Public data only | ✅ | Only published store data returned |
| Sensitive merchant data | ✅ | `toPublicProduct()` strips cost, barcode, SEO fields |
| Theme config exposure | ⚠️ | Theme config returned publicly (CSS only, no credentials) |
| Auth bypass | ✅ | No JWT required — session-based cart tokens |
| Support ticket accessToken in URL | ⚠️ | `accessToken` is a query parameter — could leak in logs |

### Finding P2-01: Theme config publicly exposed

Storefront returns theme configuration (CSS, settings) without authentication. Low risk since themes are customer-facing by design, but theme settings could reveal store structure.

### Finding P2-02: Support ticket accessToken in query string

Support ticket authentication uses `accessToken` as a URL query parameter. This can leak via server logs, referrer headers, or browser history.

---

## Error Capture Security Findings

| Check | Status | Details |
|-------|--------|---------|
| POST endpoint local-only | ✅ | Returns 404 if `NODE_ENV=production` |
| Secret sanitization | ✅ | Blocklist of 10+ sensitive field patterns |
| Stack trace stripping | ✅ | Stripped unless `NODE_ENV=development` |
| Password/token in NDJSON | ❌ Not stored | SanitizePayload catches them |
| Card/iban in NDJSON | ❌ Not stored | SanitizePayload catches them |

### Error capture blocklist

```
password, token, authorization, cookie, secret,
apiKey, accessToken, refreshToken, card, cvv, iban, env
```

These are checked as case-insensitive substring matches against object keys. Values are replaced with `"[REDACTED]"`.

---

## Logging / Privacy Findings

| Check | Status | Details |
|-------|--------|---------|
| .env in .gitignore | ✅ | `.env` is gitignored |
| .env.example has real secrets | ⚠️ | Contains placeholder dev values (`dev-jwt-secret-change-in-production`, `haa_secret_2024`) — acceptable for local dev |
| Console logs sensitive data | ❌ Not found | `structured-logger.ts` redacts sensitive headers |
| NDJSON stores secrets | ✅ | Sanitized before storage |
| Error messages expose internals | ✅ | Production returns `getUserFriendlyMessage()` only |

---

## Finding Severity Summary

| Severity | Count | Key Findings |
|----------|-------|-------------|
| **P0** | 0 | — |
| **P1** | 3 | customer permission downgrade, missing customer audit, no frontend role filtering |
| **P2** | 2 | theme config public, accessToken in URL query |
| **P3** | 3 | no refresh token, localStorage JWT, no session polling |

---

## Immediate Risks

None — all findings are in a local-development context with no production deployment. The P1 findings should be addressed before any production deployment.

## Recommended Next Actions

1. Fix `customers.ts` permission downgrade (P1)
2. Add audit logging to customer mutations (P1)
3. Add role-based route filtering in dashboard App.tsx (P1)
4. Move support ticket accessToken to header (P2)
5. Audit remaining route groups (webhooks, shipping, payments) (P2)
6. Add refresh token mechanism (P3)
