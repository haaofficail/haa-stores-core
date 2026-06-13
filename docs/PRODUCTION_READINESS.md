# Production Readiness Foundation — Phase 1

## Overview

Phase 1 of the Post-LC6 Roadmap addresses the structural and operational gaps
preventing the platform from being deployed to a staging environment. No new
product features are introduced.

---

## Changes Made

### 1. DB Pool Tuning

**Problem:** `createDbClient()` created a new `postgres` connection pool on every
call. Under concurrent load (multiple HTTP requests → multiple service
instantiations → multiple pools) the default `max: 10` connections per pool × N
pools exhausted the database connection limit.

**Fix:** `createDbClient()` now returns a cached singleton when no specific URL
is requested. All services sharing the same `DATABASE_URL` reuse the same pool.
A `closeDbClient()` function was added for graceful shutdown.

**New env vars (all optional):**

| Variable                     | Default | Description                     |
|------------------------------|---------|---------------------------------|
| `DATABASE_MAX_CONNECTIONS`   | `20`    | Pool size                       |
| `DATABASE_IDLE_TIMEOUT`      | `30000` | Close idle connections after ms |
| `DATABASE_CONNECT_TIMEOUT`   | `10000` | Connection timeout in ms        |

**Graceful shutdown:** SIGTERM/SIGINT handlers close the pool cleanly.

### 2. Test Isolation

- `pnpm test` now **excludes** `tests/smoke.test.ts` (unit & integration only)
- `pnpm smoke` runs only `tests/smoke.test.ts` (full-stack smoke against real
  API + DB)
- Implemented via `exclude: ['tests/smoke.test.ts']` in `vitest.config.ts`

### 3. Rate Limiter Abstraction

**Before:** In-memory `Map<string, RateLimitEntry>` with `setInterval` cleanup.

**After:** Pluggable `RateLimiterStore` interface with two implementations:

| Implementation            | Env Value          | Status     |
|---------------------------|--------------------|------------|
| `InMemoryRateLimiterStore`| `memory` (default) | ✅ Working |
| `RedisRateLimiterStore`   | `redis`            | ❌ Placeholder |

- Selecting `redis` without `REDIS_URL` throws a clear startup error.
- Redis integration is deferred (requires `ioredis` or similar).

### 4. Structured Logging

**Before:** `hono/logger` — basic text output, no request ID, no duration.

**After:**
- **Request ID middleware** — generates or propagates `X-Request-Id` header,
  stored in `c.set('requestId', ...)`.
- **Structured logger middleware** — JSON output, includes `requestId`,
  `method`, `path`, `status`, `duration(ms)`.
- **Secret redaction** — headers matching known secret keys
  (`password`, `token`, `authorization`, etc.) are `[REDACTED]` in logs.
- Log level is controlled by `LOG_LEVEL` env var (not yet wired to filtering).

### 5. Error Monitoring Readiness

**Before:** Stack traces suppressed for non-dev envs, no monitoring hooks.

**After:** `ErrorMonitor` interface with `captureException()` and
`captureMessage()`. Default is null (no-op). Set via `setErrorMonitor()` in
startup code.

```typescript
import { setErrorMonitor } from './middleware/error-handler.js';

// Example: Sentry integration (deferred)
setErrorMonitor({
  captureException(err, context) {
    // Sentry.captureException(err, { extra: context });
  },
  captureMessage(msg, context) {
    // Sentry.captureMessage(msg, { extra: context });
  },
});
```

No external monitoring service is configured in Phase 1.

### 6. Secrets Strategy

**Classification of environment variables:**

| Category       | Examples                                    | Storage Requirement       |
|----------------|---------------------------------------------|---------------------------|
| Public         | `API_PORT`, `CORS_ORIGINS`, `LOG_LEVEL`     | `.env` (committed)        |
| Internal       | `DATABASE_URL` (local dev), `MINIO_*`       | `.env` (not committed)    |
| Secret         | `JWT_SECRET`, `ENCRYPTION_KEY`, `S3_*`      | External secrets manager  |

**Rules enforced in code (`apps/api/src/env.ts`):**
- Dev-default `JWT_SECRET` / `ENCRYPTION_KEY` are **rejected** in
  `production`/`staging` environments.
- `STORAGE_DRIVER=local` is **rejected** in `production`/`staging`.
- `STORAGE_DRIVER=s3` requires all six `S3_*` variables.

**For staging/production deployment (future phases):**
- Never commit real secrets to the repository.
- Use platform-native secrets (e.g., Fly.io secrets, GitHub Actions secrets).
- Rotate secrets on a schedule (documented here for future implementation).

### 7. Backup & Restore

Scripts already exist:
- `scripts/db-backup.sh` — pg_dump to timestamped `.sql` file
- `scripts/db-restore.sh` — psql restore from backup file
- `pnpm db:backup` / `pnpm db:restore` aliases

**Recommended backup schedule (staging/production):**
| Environment | Frequency      | Retention       |
|-------------|----------------|-----------------|
| Development | On-demand only | N/A             |
| Staging     | Daily          | 7 days          |
| Production  | Every 6 hours  | 30 days         |

**Restore procedure:**
1. Stop the API (`docker compose down` or stop the service)
2. Run `pnpm db:restore <backup-file>`
3. Verify data integrity with `pnpm smoke`
4. Restart the API

### 8. Deployment Conditions (gating)

Refer to `docs/NO_DEPLOY_POLICY.md` for the full gating checklist. Phase 1
is the first phase required before external deployment is permitted.

## Phase 2 — Real Payments Foundation & Sandbox

Phase 2 has been implemented (2026-06-07) and has passed Review Gate. See
`docs/POST_LC6_ROADMAP.md` for details.

**Key security properties added in Phase 2:**
- **Live mode blocked** at both env validation and factory level
- **MoyasarSandboxProvider** disabled without sandbox env vars; falls back to FakePaymentProvider
- **Webhook signature verification** using HMAC-SHA256
- **No card data** stored — Moyasar uses hosted payment page
- **No secrets in logs** — all provider secrets redacted by structured logger
- **Wallet entries only after confirmed success** — never on failed payment
- **Duplicate webhook prevention** via idempotency key

## Phase 4 — KYC & Compliance Foundation

Phase 4 has been implemented (2026-06-07) and is pending Review Gate. See
`docs/POST_LC6_ROADMAP.md` for details.

### KYC Entity Model

Three tables introduced:

| Table | Purpose |
|-------|---------|
| `kyc_profiles` | Business identity: merchant type (company/individual/etc.), commercial registration, tax ID, status |
| `merchant_bank_accounts` | Payout destination: bank name, account holder, IBAN (SA format, stored masked) |
| `kyc_documents` | Uploaded documents: type (CR, freelancer, etc.), file URL, verification status |

**Status engine:** 8 statuses — `PENDING`, `DOCUMENTS_SUBMITTED`, `IN_REVIEW`, `INFO_NEEDED`, `APPROVED`, `REJECTED`, `EXPIRED`, `SUSPENDED`. Transition validation prevents invalid state changes (e.g., `PENDING` → `IN_REVIEW` requires documents submitted first).

### Merchant Wallet KYC Status

Wallet summary endpoint now includes `kycApproved` (boolean) and `kycStatus` (string) fields, allowing the dashboard to display KYC state prominently.

### KYC Gating

- **Live payments gated:** `PAYMENT_MODE=live` is already blocked at env + factory level; KYC adds `isKycApproved()` as an additional gate for live mode activation.
- **Live shipping gated:** Same gate applies for `SHIPPING_MODE=live`.
- **Payouts disabled:** `canPayout()` returns false until KYC is approved. Wallet dashboard shows disabled payout with KYC explanation.
- **Settings integration:** `GET /settings/payment-status` now includes `kycRequiredForLive: true`.

### Document Upload Safety

- Allowed types: pdf, png, jpg, jpeg (extended via config)
- Max size: 5MB per document
- File validation on upload before storage
- No document URL exposure to other stores

### Privacy & Data Handling

- **IBAN masked storage:** Only last 4 characters visible in API responses, full IBAN stored encrypted
- **Audit log:** Every KYC status change and document action logged
- **No government integration:** KYC verification is manual review only (admin dashboard). No integration with Saudi government CR/IBAN verification APIs at this stage.
- **compliance:review permission** is admin-only, not assignable to merchant roles

### No Real Government Integration Yet

KYC document verification is manual (admin review). There is no automated integration with:
- Ministry of Commerce (CR verification)
- SAMA (IBAN verification)
- GAZT (VAT registration check)

These are planned for a future phase when the platform has a staging environment and real admin users.

---

## Verification

After Phase 1 changes:
- [ ] `pnpm env:check` passes
- [ ] `pnpm -r typecheck` passes (all 11 packages)
- [ ] `pnpm -r build` passes (all 11 packages)
- [ ] `pnpm test` passes (unit tests only, excludes smoke)
- [ ] `pnpm smoke` passes (28/28)
- [ ] API starts and responds at `:3000`
- [ ] `/health` returns `{"api":"ok","db":"connected"}`
- [ ] Graceful shutdown (SIGTERM/SIGINT) closes DB pool without error
- [ ] Rate limiter works with default in-memory store
- [ ] Logs are JSON structured with `requestId`, `duration`
- [ ] Secrets are redacted in logs
