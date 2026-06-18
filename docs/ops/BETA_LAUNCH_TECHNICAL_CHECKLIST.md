# TASK-0044 Phase 6 — Beta Launch Technical Checklist (Engineering)

> **Audience:** Engineering — the things YOU must verify before flipping the `MARKETPLACE_PUBLIC_ENABLED=true` flag.
> **Owner-facing companion:** `docs/ops/BETA_LAUNCH_CHECKLIST.md` (T-7 days → T+30 days program management).
> **This doc is engineering-only** — secrets rotation, monitoring wired, alerting thresholds, backup verified, on-call rotation.
> **Prerequisite:** `PHASE_5_DEPLOY_RUNBOOK.md` done, `PHASE_6_TECHNICAL_BRIEF.md` pen-test PASS or all Critical/High fixed.

---

## 0. How to use this checklist

- Each section is a **blocker**. If any box is unchecked, do NOT flip `MARKETPLACE_PUBLIC_ENABLED=true`.
- Run this **T-7 days** (one week before launch) and again **T-0** (launch day).
- Check items off by editing this file directly. Use the verification command output as evidence.

---

## 1. Code + deploy readiness (T-7 days)

### 1.1 Branch + commit hygiene

```bash
# Working tree clean on the deploy branch
git status  # should show "nothing to commit"

# On the right branch
git branch --show-current  # feature/phase-9-cod-fee-policy → main → production

# Latest commit is signed + conventional
git log -1 --format='%H %an %s'

# No uncommitted local changes that should be in a commit
git diff main --stat  # should match what's been PR'd
```

- [ ] Working tree clean
- [ ] On correct branch (with all fixes merged)
- [ ] Conventional Commits format
- [ ] No force-pushes since last green CI run

### 1.2 CI green

```bash
pnpm preflight
pnpm typecheck
pnpm test
pnpm ci:local
```

- [ ] `pnpm preflight` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0 (all 2620+ tests pass)
- [ ] `pnpm ci:local` exits 0
- [ ] No skipped tests that are not documented as "skipped: known-accepted"
- [ ] Code coverage for new code is ≥80% (per Quality Pass 1-5 rule)

### 1.3 Migration applied

```bash
# Check migration status
pnpm db:migrate  # should be idempotent (no-op if up-to-date)

# Verify expected schema (e.g. accessToken column on marketplace_orders)
pnpm db:explain --table marketplace_orders | grep access_token
```

- [ ] All TASK-0043 + P0-1..6 + P1-1..9 migrations applied
- [ ] No migration is in `pending` state
- [ ] No `drizzle.__drizzle_migrations` row missing its `_snapshot.json`
- [ ] `pnpm db:explain` shows expected new columns

### 1.4 Build artifacts

```bash
# Build all apps
pnpm -r build

# Verify build output exists
ls apps/api/dist apps/merchant-dashboard/dist apps/storefront/dist apps/admin-dashboard/dist
```

- [ ] `pnpm -r build` exits 0
- [ ] All 4 dist directories exist
- [ ] No `tsc` errors or warnings
- [ ] No `vite build` errors or warnings
- [ ] Bundle size is within expected range (compare to last green build)

---

## 2. Environment + secrets (T-7 days, then T-0)

### 2.1 Environment variables

```bash
# Run the env check script
pnpm env:check
pnpm production:check
```

- [ ] All required env vars set (see `apps/api/src/env.ts:88-91` for the required list)
- [ ] No dev default secrets (`JWT_SECRET=dev-jwt-secret-change-in-production` will fail in `NODE_ENV=staging` or `production`)
- [ ] `CORS_ORIGINS` includes the production domains (not localhost)
- [ ] `API_BASE_URL`, `MERCHANT_DASHBOARD_URL`, `STOREFRONT_URL` point to production
- [ ] `HOSTING_REGION` and `DATA_RESIDENCY` set (per G8 decision)
- [ ] `STORAGE_DRIVER=s3` (NOT `local` — will fail in staging/production)
- [ ] `PAYMENT_MODE=sandbox` or `live` (NOT `fake` if real beta)
- [ ] `SHIPPING_MODE=sandbox` (NOT `mock` if real beta)
- [ ] `SENTRY_DSN` set (production Sentry project, not pen-test)

### 2.2 Secrets rotation (T-0, launch day)

```bash
# 1. Generate fresh secrets
openssl rand -hex 64  # for JWT_SECRET
openssl rand -hex 64  # for ADMIN_JWT_SECRET
openssl rand -hex 32  # for ENCRYPTION_KEY (32 bytes = 64 hex chars)

# 2. Update secrets in the secret manager (1Password / Fly.io secrets / Vault / equivalent)
# (specific command depends on your secret manager)

# 3. Restart API + worker pods
kubectl rollout restart deployment/api  # or equivalent
kubectl rollout restart deployment/worker
```

- [ ] `JWT_SECRET` rotated (or freshly generated if first deploy)
- [ ] `ADMIN_JWT_SECRET` rotated
- [ ] `ENCRYPTION_KEY` rotated
- [ ] `PAYMENT_WEBHOOK_SECRET` rotated
- [ ] `OTO_WEBHOOK_SECRET` rotated
- [ ] `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY` rotated (or freshly created)
- [ ] `SENTRY_DSN` is the production Sentry project (not pen-test)
- [ ] All existing users will be logged out (token version bump in DB) — coordinate with founder

### 2.3 Database user + least privilege

```sql
-- Verify the API DB user has the LEAST privileges needed
-- (NOT superuser, NOT acloudrdssuperuser)

SELECT current_user, session_user;

-- Check granted roles
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb
FROM pg_roles
WHERE rolname = current_user;
```

- [ ] API DB user is NOT `postgres` superuser
- [ ] API DB user has `CONNECT`, `USAGE` on schema, `SELECT/INSERT/UPDATE/DELETE` on app tables only
- [ ] No `CREATE` / `DROP` / `ALTER` privileges for the app user
- [ ] Read replica user (`pentest_reader` is separate from app user)

---

## 3. Infrastructure (T-7 days)

### 3.1 TLS + DNS

```bash
# TLS check
curl -vI https://api.haastores.sa/health 2>&1 | grep -E "SSL|TLS|subject|issuer"
echo | openssl s_client -connect api.haastores.sa:443 -servername api.haastores.sa 2>/dev/null | openssl x509 -noout -subject -issuer -dates

# DNS check
dig +short api.haastores.sa
dig +short merchants.haastores.sa
dig +short admin.haastores.sa
dig +short haastores.sa
```

- [ ] TLS 1.2+ only (no TLS 1.0/1.1)
- [ ] Valid certificate (not self-signed, not expired)
- [ ] HSTS header present
- [ ] All 4 subdomains resolve correctly
- [ ] CAA records set (only the CA you use can issue certs)
- [ ] DNSSEC enabled (optional but recommended)

### 3.2 CDN + WAF

```bash
# Check Cloudflare is in front
dig +short api.haastores.sa  # should return Cloudflare IPs

# Check security headers
curl -sI https://api.haastores.sa/health | grep -iE "x-frame-options|x-content-type-options|content-security-policy|strict-transport-security|referrer-policy"
```

- [ ] Cloudflare proxy enabled (orange cloud) on all 4 subdomains
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains` present
- [ ] `X-Frame-Options: DENY` (or `SAMEORIGIN` for storefront)
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `Content-Security-Policy` present (with appropriate script-src)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` (or stricter) present
- [ ] WAF rules enabled (Cloudflare Managed Ruleset at minimum)
- [ ] DDoS protection enabled (Cloudflare default)

### 3.3 Rate limit + DDoS baseline

```bash
# Test that rate limits are at production thresholds (not dev generous)
for i in {1..31}; do
  curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
    -H "Content-Type: application/json" \
    -d '{}' \
    https://api.haastores.sa/marketplace/orders
done
# Expect: first 30 = 400 (bad payload), 31st = 429
```

- [ ] `storefrontBrowseRateLimit` at 600/10min
- [ ] `marketplaceOrderRateLimit` at 30/10min
- [ ] `checkoutRateLimit` at 60/10min
- [ ] `strictRateLimit` (auth) at 10/10min
- [ ] `webhookRateLimit` at 180/min per provider
- [ ] Cloudflare rate limiting rule (broader, per-IP) is at 1000/10min

---

## 4. Database (T-7 days, then T-0)

### 4.1 Backups

```bash
# Verify latest backup exists and is recent
ls -t backups/full/haa-*.sql.gz 2>/dev/null | head -1
# Should be <24h old

# Run a full backup
pnpm db:backup

# Verify backup can be restored (in test DB)
pnpm db:restore --target haastores_restore_test
```

- [ ] `pnpm db:backup` exits 0
- [ ] Latest backup < 24 hours old
- [ ] Backup uploaded to S3 / B2 / equivalent off-host storage
- [ ] `pnpm db:restore` succeeded against a test DB
- [ ] Row counts match (tenants, users, stores, products) within 5%
- [ ] Backup retention is 30 days (per `dr-backup.sh`)

### 4.2 Point-in-time recovery (PITR) — production only

```bash
# Verify WAL archiving is enabled (managed Postgres usually handles this)
psql -c "SHOW wal_level;"        # should be 'replica' or 'logical'
psql -c "SHOW archive_mode;"     # should be 'on'
psql -c "SHOW archive_command;"  # should be set to a working command
```

- [ ] WAL archiving enabled
- [ ] WAL archive target (S3 / B2) is accessible
- [ ] PITR window: 7 days minimum

### 4.3 Database performance baseline

```bash
# Run the marketplace query with EXPLAIN ANALYZE
pnpm db:explain --query "GET /marketplace/products?limit=50"
# Should complete in <100ms with <50 sequential scans
```

- [ ] Marketplace list query < 100ms (p95)
- [ ] Single product detail query < 50ms (p95)
- [ ] Admin list query < 200ms (p95)
- [ ] No sequential scans on tables with > 10K rows

### 4.4 Read replica

```bash
# Verify DATABASE_READ_URL is configured + works
DATABASE_READ_URL=postgres://readonly:<password>@<host>:5432/haastores \
  psql -c "SELECT pg_is_in_recovery();"
```

- [ ] `DATABASE_READ_URL` set in production env
- [ ] Read replica is in a different AZ (or will be, for KSA region)
- [ ] Replica lag < 5 seconds (p95)

---

## 5. Observability (T-7 days)

### 5.1 Error tracking (Sentry)

```bash
# Trigger a test error and verify it lands in Sentry
curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"x": "test-sentry-launch"}' \
  https://api.haastores.sa/internal/support-errors/report
# Should appear in Sentry within 30s
```

- [ ] `SENTRY_DSN` set for production
- [ ] Test error appears in Sentry within 30s
- [ ] Source maps uploaded (so stack traces are readable)
- [ ] Alert rules configured (P0 → page on-call within 5 min)
- [ ] Slack / PagerDuty integration tested

### 5.2 Metrics + logging

```bash
# Verify structured logs are flowing
curl -sS https://api.haastores.sa/health | jq .uptime
# Should be > 0
```

- [ ] Structured JSON logs shipped to log aggregation (CloudWatch / Betterstack / Datadog)
- [ ] `requestId` present in every log line (correlation)
- [ ] Log retention: 30 days minimum
- [ ] Metrics scraped (Prometheus / Datadog / equivalent):
  - Request rate (req/s) by route
  - Error rate (5xx) by route
  - Latency (p50, p95, p99) by route
  - DB connection pool utilization
  - Redis hit/miss ratio
  - Queue depth
  - Worker concurrency utilization

### 5.3 Uptime monitoring

```bash
# Confirm the synthetic check script is set up
pnpm ops:synthetic
# Should exit 0
```

- [ ] `pnpm ops:synthetic` exits 0
- [ ] Uptime monitor configured (UptimeRobot / Pingdom / equivalent) hitting `/health` every 5 min from 5 global regions
- [ ] SSL expiry monitor (alerts 30 days before expiry)
- [ ] Domain expiry monitor (alerts 30 days before expiry)

### 5.4 `pnpm ops:monitor` schedule

```bash
# Verify the cron entry exists
crontab -l | grep ops:monitor
# Should run every 15 min
```

- [ ] `pnpm ops:monitor` in cron, every 15 min
- [ ] `pnpm ops:monitor:report` generates a daily Markdown report
- [ ] Report archived in `docs/ops/LATEST_MONITORING_REPORT.md`
- [ ] P0 alerts in the report trigger founder notification (Slack / email)

---

## 6. Security (T-7 days, then T-0)

### 6.1 Pen-test status

- [ ] Pen-test report received from vendor
- [ ] All **Critical** findings fixed
- [ ] All **High** findings fixed OR scheduled with explicit deadline
- [ ] All **Medium** findings added to backlog with priority
- [ ] All **Low** findings documented (fix opportunistically)
- [ ] Re-test completed (if contract includes re-test)
- [ ] Report archived at `docs/compliance/pentest-<vendor>-<date>.pdf`

### 6.2 Pre-launch smoke

```bash
# Run the existing pre-pentest smoke against production
API_BASE=https://api.haastores.sa pnpm preflight:pentest
# Should exit 0
```

- [ ] `pnpm preflight:pentest` exits 0 against production
- [ ] Test 1: marketplace products filter (approved + published + active) ✅
- [ ] Test 2: marketplace sellers list (main demo profile visible) ✅
- [ ] Test 3: order tracking requires `access_token` (or legacy phone) ✅
- [ ] Test 4: admin marketplace route requires auth ✅
- [ ] Test 5: prohibited category products are hidden ✅

### 6.3 ASV scan

- [ ] Quarterly PCI-DSS ASV scan completed (G6)
- [ ] ASV report shows PASS
- [ ] Any findings remediated (or accepted with justification)
- [ ] ASV certificate stored in `tenants.asvCertificateUrl` (migration 0061)

### 6.4 Secret scan

```bash
# Scan the repo for accidentally committed secrets
pnpm deps:audit
# Or: gitleaks detect --source . --verbose
```

- [ ] No secrets in the repo (`gitleaks detect` exits 0)
- [ ] No `.env` file in git history
- [ ] No hardcoded API keys, passwords, or tokens in source code
- [ ] `pnpm deps:audit` shows no High/Critical CVEs in production deps

---

## 7. Operational readiness (T-7 days)

### 7.1 Rollback plan rehearsed

```bash
# Document the rollback procedure in a runbook section
# (NOT this one — keep it in docs/INCIDENT_RESPONSE.md)

# Rehearse the rollback (against staging, not production)
# 1. Deploy a known-bad commit to staging
# 2. Run the rollback procedure (kubectl rollout undo, etc.)
# 3. Verify staging is back to good state
# 4. Document any issues found during the rehearsal
```

- [ ] Rollback procedure documented in `docs/INCIDENT_RESPONSE.md`
- [ ] Rollback procedure **rehearsed** against staging within last 7 days
- [ ] Rollback time estimate: < 5 minutes
- [ ] DB rollback plan documented (migration down + code rollback)
- [ ] Rollback trigger thresholds defined (5xx > 5% for 5 min, etc.)

### 7.2 On-call rotation

- [ ] On-call schedule published for launch week + 4 weeks after
- [ ] On-call engineer has production access (DB read, log access, deploy access)
- [ ] Founder has production access (emergency only)
- [ ] Escalation path documented: P0 → on-call eng → founder → vendor (if Critical)
- [ ] On-call has runbook for the top 5 likely incidents

### 7.3 Incident response

- [ ] `docs/INCIDENT_RESPONSE.md` reviewed + updated for marketplace launch
- [ ] Slack incident channel template ready (`#incident-YYYY-MM-DD-brief`)
- [ ] PDPL breach response procedure rehearsed (within 1 hour containment)
- [ ] SDAIA notification template ready (within 72 hours)
- [ ] Customer communication templates ready (within 24 hours of containment)

### 7.4 Capacity

- [ ] Current capacity tested for 10x expected load (load test results in `tests/load/scale-readiness.k6.js`)
- [ ] `WORKER_CONCURRENCY` set appropriately (default 5, increase if queue depth grows)
- [ ] DB connection pool sized appropriately (max connections = 100 or per managed Postgres limit)
- [ ] Redis memory limit set (256MB free tier may be too small — verify)

---

## 8. Marketplace-specific (T-7 days)

### 8.1 Marketplace flag

```bash
# Verify the marketplace flag exists + is settable
# (This is the BIG red button for launch)
echo "MARKETPLACE_PUBLIC_ENABLED is the kill switch"
```

- [ ] `MARKETPLACE_PUBLIC_ENABLED` env var wired (default `false` in production)
- [ ] When `false`: marketplace routes return 404 to public visitors
- [ ] When `true`: marketplace routes are live
- [ ] Flip procedure documented (1 env var change + redeploy OR feature flag service)

### 8.2 Marketplace launch checklist (from `BETA_LAUNCH_CHECKLIST.md` §0)

- [ ] **Prerequisites all met:**
  - Pen-test report signed off
  - All 10 TASK-0038 owner action items closed (G1-G10)
  - Legal review of drafts complete
  - DPO appointed + contact published
  - PCI-DSS ASV scan passed
  - DR plan documented + tabletop exercise run
  - `pnpm preflight:pentest` clean against staging

### 8.3 Pre-launch test (T-1 hour)

```bash
# Last smoke before flipping the flag
API_BASE=https://api.haastores.sa pnpm preflight:pentest
pnpm preflight
```

- [ ] `pnpm preflight:pentest` exits 0 against production
- [ ] `pnpm preflight` exits 0 against production
- [ ] Health endpoint returns 200 OK
- [ ] `/marketplace/products?limit=5` returns expected data
- [ ] Admin route returns 401 (unauthenticated)
- [ ] Order tracking returns 400 (no token)

---

## 9. Day-of-launch (T-0)

### 9.1 Launch sequence (engineering)

```bash
# 1. Final pre-flight (T-30 min)
API_BASE=https://api.haastores.sa pnpm preflight:pentest
pnpm ops:monitor  # baseline

# 2. Flip the flag (T-0)
# Update env: MARKETPLACE_PUBLIC_ENABLED=true
# (specific command depends on your platform)

# 3. Verify marketplace is live (T+1 min)
curl -sS https://api.haastores.sa/marketplace/products?limit=5 | jq '.data.total'
# Should return a positive number

# 4. Start the 24-hour intensive monitoring window
# (see BETA_LAUNCH_CHECKLIST.md §2.3)
```

- [ ] `pnpm preflight:pentest` exits 0 (T-30 min)
- [ ] `pnpm ops:monitor` baseline captured (T-30 min)
- [ ] `MARKETPLACE_PUBLIC_ENABLED=true` (T-0)
- [ ] Marketplace endpoint returns data (T+1 min)
- [ ] Monitoring dashboard URL sent to founder (T+1 min)
- [ ] Slack `#marketplace-launch` channel created (T-0)
- [ ] On-call engineer paged (T-0)

### 9.2 First-hour checks (T+0 to T+1h, every 15 min)

- [ ] Error rate < 1% (5xx)
- [ ] p95 latency < 500ms
- [ ] Payment success rate > 95% (if any orders)
- [ ] No unexpected 401/403 spikes
- [ ] No unexpected rate-limit responses

### 9.3 First-day checks (T+0 to T+24h, every 4 hours)

- [ ] Error rate < 0.5% sustained
- [ ] Order creation rate > 0 (or 0 with explanation)
- [ ] Customer support tickets < 10
- [ ] No PDPL complaints
- [ ] No regulator actions (MoCI/SAMA/NCA)

---

## 10. Post-launch (T+1 to T+30 days)

### 10.1 Daily standup (during soft-launch)

- [ ] 09:00 SAST — engineering + founder + cohort lead
- [ ] Review metrics dashboard
- [ ] Top 3 issues + mitigation plan
- [ ] Decisions needed from founder

### 10.2 Weekly review

- [ ] Total orders, GMV, average order value
- [ ] New merchant signups, churn
- [ ] Customer NPS (1-question survey after order delivery)
- [ ] Top 3 product categories
- [ ] Support tickets per merchant
- [ ] Pen-test findings remediation status

### 10.3 Monthly review (T+30)

- [ ] Success criteria from `BETA_LAUNCH_CHECKLIST.md` §5 met?
  - [ ] ≥80% of cohort merchants active
  - [ ] NPS ≥ 40
  - [ ] Error rate < 0.5% sustained
  - [ ] Zero Critical/High pen-test findings outstanding
  - [ ] Zero PDPL complaints
  - [ ] Zero regulator actions
  - [ ] Cohort NPS ≥ 7/10
- [ ] Decision: continue / adjust / pause

---

## 11. Quick-reference: who owns what (engineering-specific)

| Item                                                | Owner                                   | Verified by                                   |
| --------------------------------------------------- | --------------------------------------- | --------------------------------------------- |
| Code + deploy readiness                             | Engineering                             | `pnpm preflight` + `pnpm ci:local`            |
| Environment + secrets                               | Engineering + Founder                   | `pnpm env:check` + manual rotation            |
| Infrastructure (TLS, DNS, CDN)                      | Engineering                             | `curl` + `dig` + Cloudflare dashboard         |
| Database (backups, PITR, perf)                      | Engineering                             | `pnpm db:backup` + `psql` + `EXPLAIN ANALYZE` |
| Observability (Sentry, logs, metrics)               | Engineering                             | Manual test errors + dashboard review         |
| Security (pen-test, ASV, secret scan)               | Engineering + Founder                   | Vendor report + `gitleaks`                    |
| Operational readiness (rollback, on-call, incident) | Engineering                             | Tabletop exercise + schedule review           |
| Marketplace flag (kill switch)                      | Founder (decision) + Engineering (flip) | Manual + monitoring                           |
| Day-of-launch (sequence + monitoring)               | Engineering                             | This checklist                                |

---

## 12. References

- `docs/ops/BETA_LAUNCH_CHECKLIST.md` — owner-facing program management
- `docs/ops/BETA_LAUNCH_MONITORING.md` — monitoring guide
- `docs/ops/PHASE_5_DEPLOY_RUNBOOK.md` — pen-test env provisioning
- `docs/ops/PHASE_6_TECHNICAL_BRIEF.md` — pen-test firm brief
- `docs/DEPLOYMENT_RUNBOOK.md` — general staging + production deploy
- `docs/INCIDENT_RESPONSE.md` — incident handling
- `docs/security/SECURITY_BASELINE.md` — security baseline
- `apps/api/src/env.ts` — required env vars
- `scripts/pre-pentest-smoke.sh` — pre-launch smoke
- `scripts/db-backup.sh` + `scripts/dr-backup.sh` — backup procedures
- `pnpm ops:monitor` — health + synthetic + error analysis
- `pnpm env:check` + `pnpm production:check` — env validation

---

**Last Updated:** 2026-06-18 (TASK-0044 §A4 — Session R engineering prep)
**Owner Action:** Run this checklist T-7 days + T-0; do NOT flip `MARKETPLACE_PUBLIC_ENABLED=true` with any box unchecked
**Engineering Effort:** 1-2 days (T-7) + 30 min (T-0) + ongoing (T+0 to T+30)
**When blocked:** Every blocker has an owner; escalate to founder if owner is unavailable
