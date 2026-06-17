# Deployment Runbook — هاء متاجر (Haa Stores)

> **Last updated:** 2026-06-17
> **Owner:** Haa Stores Platform Team
> **Scope:** Step-by-step deployment procedure for staging + production
> **Related:** `docs/NO_DEPLOY_POLICY.md` (active), `docs/STAGING_PLAN.md` (proposed hosting)

---

## ⚠️ Pre-Deployment Gate (BEFORE you read this runbook)

**No Deploy Policy is ACTIVE.** Do NOT execute this runbook until:

- [ ] **Owner GO** explicit (written, in #deployments channel)
- [ ] **Deployment Readiness Gate** passed (see `docs/ops/DEFINITION_OF_READY.md`)
- [ ] **Staging** deployed + smoke-tested + 7 days uptime without P0/P1
- [ ] **Legal docs** approved (PRIVACY_POLICY + TERMS_OF_SERVICE) by Owner + legal review
- [ ] **Live API keys** obtained from payment providers (Moyasar, Geidea, Tabby, Tamara)
- [ ] **Production database** provisioned (managed Postgres)
- [ ] **DNS** records configured (api.haastores.sa, *.haastores.sa)
- [ ] **CDN** configured (Cloudflare in front)
- [ ] **Secrets management** in place (Fly.io secrets / Vault / equivalent)
- [ ] **Monitoring** wired up (Sentry DSN, uptime monitor, alerting)

---

## 0. Architecture Overview (TL;DR)

```
                  ┌─────────────────┐
                  │   Cloudflare    │  ← CDN + DDoS protection + WAF
                  │   (DNS + Proxy) │
                  └────────┬────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
       api.haa...    merchant.haa...   admin.haa...
            │              │              │
            ▼              ▼              ▼
   ┌─────────────────────────────────────────┐
   │       Fly.io App: haa-platform          │
   │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
   │  │   API   │ │Merchant │ │  Admin  │   │
   │  │  :3000  │ │  :5173  │ │  :5175  │   │
   │  └─────────┘ └─────────┘ └─────────┘   │
   │  + Storefront served via /s/:slug      │
   └────────────────────┬────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
   ┌─────────────────┐    ┌─────────────────┐
   │  Fly Postgres   │    │   Upstash Redis │
   │  (managed)      │    │   (256MB free)  │
   └─────────────────┘    └─────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  Cloudflare R2  │
                          │ (object storage)│
                          └─────────────────┘
```

---

## 1. Pre-Flight Checklist

### 1.1 Code Readiness

```bash
# From project root
cd /Users/thwany/Desktop/haa-stores-core

# 1. Working tree clean
git status  # should show "nothing to commit, working tree clean"

# 2. On the right branch (NOT main unless explicitly deploying)
git branch --show-current  # should be feature/* for staging, main for prod

# 3. Latest commit
git log -1 --format='%H %an %s'

# 4. All tests pass
pnpm test 2>&1 | tail -5  # should show 0 failed (or documented baseline only)

# 5. Preflight passes
pnpm preflight  # should show "Preflight PASSED"

# 6. All packages typecheck clean
pnpm typecheck  # should show all packages clean

# 7. Lint clean
pnpm lint  # should show 0 errors

# 8. Build succeeds
pnpm build  # all 21 packages build cleanly
```

### 1.2 Migrations

```bash
# Check for pending migrations
ls packages/db/src/migrations/*.sql | tail -3

# Count: should match the latest journal entry
grep '"tag"' packages/db/src/migrations/meta/_journal.json | tail -3
```

**⚠️ KNOWN GOTCHA:** Drizzle snapshot chain is broken for migrations 0050-0053 (snapshot JSONs missing). For fresh DB deploy:
- Use `psql -f <migration>.sql` directly (NOT `drizzle-kit migrate`)
- See `memory/drizzle-migration-snapshots.md` for the workaround

### 1.3 Secrets Inventory

Before deployment, ensure these secrets are available in your secret store (Fly.io secrets / Vault / etc.):

| Secret | Source | Required for |
|--------|--------|--------------|
| `DATABASE_URL` | Provisioned DB | All |
| `JWT_SECRET` | Generated (`openssl rand -hex 32`) | All |
| `ADMIN_JWT_SECRET` | Generated (separate from JWT_SECRET) | Admin |
| `ENCRYPTION_KEY` | Generated (32 bytes hex) | Encryption |
| `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` | Generated (32 bytes hex) | Payment |
| `PAYMENT_SANDBOX_SECRET_KEY` | Moyasar dashboard | Card payments |
| `PAYMENT_SANDBOX_PUBLIC_KEY` | Moyasar dashboard | Card payments |
| `PAYMENT_WEBHOOK_SECRET` | Moyasar dashboard | Webhooks |
| `GEIDEA_MERCHANT_PUBLIC_KEY` | Geidea dashboard | Card payments |
| `GEIDEA_API_PASSWORD` | Geidea dashboard | Card payments |
| `GEIDEA_CALLBACK_URL` | `https://api.haastores.sa/webhooks/geidea` | Webhooks |
| `GEIDEA_RETURN_URL` | `https://*.haastores.sa/checkout/payment-callback` | 3DS return |
| `TABBY_API_KEY` | Tabby dashboard | BNPL |
| `TABBY_WEBHOOK_SECRET` | Tabby dashboard | BNPL webhooks |
| `TAMARA_API_KEY` | Tamara dashboard | BNPL |
| `TAMARA_WEBHOOK_SECRET` | Tamara dashboard | BNPL webhooks |
| `OTO_API_KEY` | OTO dashboard | Shipping |
| `OTO_WEBHOOK_SECRET` | OTO dashboard | Shipping webhooks |
| `CORS_ORIGINS` | `https://*.haastores.sa` | CSRF |
| `SENTRY_DSN` | Sentry dashboard | Error monitoring |
| `REDIS_URL` | Upstash dashboard | Rate limiting |
| `QUEUE_REDIS_URL` | Upstash dashboard | Queue scaffold |
| `RATE_LIMIT_STORE` | `redis-atomic` | Rate limiting |
| `SMTP_*` | Transactional email provider | Notifications |
| `STORAGE_DRIVER` | `s3` or `cloudflare-r2` | File uploads |
| `S3_*` (if using S3) | AWS / R2 | File uploads |
| `CDN_PUBLIC_BASE_URL` | `https://cdn.haastores.sa` | Asset URLs |

**⚠️ DO NOT** commit any of these to git. Use the secret store's UI/CLI.

---

## 2. Staging Deployment

### 2.1 Database Setup (Staging)

```bash
# Provision a managed Postgres (Fly.io Postgres, Supabase, Neon, etc.)
# Save the connection string as DATABASE_URL

# Apply migrations (psql, NOT drizzle-kit — see known gotcha)
for f in packages/db/src/migrations/*.sql; do
  echo "Applying $f..."
  psql "$DATABASE_URL" -f "$f" || { echo "FAILED at $f"; exit 1; }
done

# Verify migration state
psql "$DATABASE_URL" -c "SELECT tag FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 5;"

# Seed demo data (optional for staging)
pnpm db:seed --env=staging

# Verify
pnpm --filter @haa/db typecheck
```

### 2.2 App Deployment (Staging — Fly.io)

```bash
# Install Fly.io CLI
brew install flyctl  # macOS
# or: curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Create the app (one-time)
flyctl apps create haa-platform-staging

# Set secrets (use env file or one-by-one)
flyctl secrets set --app haa-platform-staging \
  DATABASE_URL="..." \
  JWT_SECRET="..." \
  ADMIN_JWT_SECRET="..." \
  # ... (all secrets from §1.3)

# Deploy (Fly detects Dockerfile or buildpack)
flyctl deploy --app haa-platform-staging \
  --strategy bluegreen \
  --wait-timeout 300

# Verify health
flyctl status --app haa-platform-staging
curl https://api-staging.haastores.sa/health
```

### 2.3 DNS + CDN (Staging)

```bash
# In Cloudflare dashboard:
# 1. Add A record: api-staging.haastores.sa → Fly.io IP
# 2. Add CNAME: merchant-staging → haa-platform-staging.fly.dev
# 3. Add CNAME: admin-staging → haa-platform-staging.fly.dev
# 4. Enable proxy (orange cloud) for DDoS protection
# 5. SSL: Full (strict) — Fly provides the cert

# Verify DNS
dig api-staging.haastores.sa +short
dig merchant-staging.haastores.sa +short
```

### 2.4 Smoke Tests (Staging)

Run the smoke test suite from `docs/LOCAL_MVP_SMOKE.md`:

```bash
# Wait ~5 minutes for app to warm up
sleep 300

# Run automated smoke tests
pnpm ops:synthetic  # HTTP checks against running servers
pnpm ops:health     # project + apps health
pnpm ops:errors     # analyze recorded errors

# Manual checks (curl + browser)
curl -I https://api-staging.haastores.sa/health
# Expected: 200 OK

curl -I https://api-staging.haastores.sa/s/haa-demo
# Expected: 200 OK

# Browser check (see docs/LOCAL_DEMO_SCRIPT.md):
# - /s/haa-demo loads with theme
# - Add to cart → checkout → fake_card_success → order confirmation
# - Login as merchant → dashboard loads → orders list works
```

### 2.5 Monitoring (Staging)

```bash
# Wire up monitoring (one-time per env)
# 1. Sentry: create project, copy DSN, set SENTRY_DSN env
# 2. Uptime monitor: UptimeRobot / BetterStack → ping /health every 1 min
# 3. Alerting: PagerDuty / Slack integration
# 4. Logs: Fly.io built-in logs + Sentry error stream

# Verify monitoring
curl https://api-staging.haastores.sa/sentry-debug  # 200 if Sentry wired
pnpm ops:monitor --env=staging
```

### 2.6 7-Day Stability Window

**Before production**, staging must run for **7 days** without:

- [ ] P0 incidents (data loss, security breach, complete outage)
- [ ] P1 incidents recurring ≥ 3 times (same fingerprint)
- [ ] Error rate > 0.5% of requests
- [ ] Response time p95 > 2 seconds
- [ ] Database CPU > 70% sustained

Document in `docs/ops/INCIDENTS.md` (even if zero incidents).

---

## 3. Production Deployment

**Only proceed if §2.6 is clean.**

### 3.1 Pre-Production Checklist

```bash
# 1. Owner GO in writing
# 2. Legal docs deployed (PRIVACY_POLICY, TERMS_OF_SERVICE accessible)
# 3. Live API keys verified (test one payment end-to-end)
# 4. Database backed up
# 5. Rollback plan documented (see §5)
# 6. Team notified (Slack #deployments channel, 1 hour notice)
# 7. Off-peak hours (2 AM Saudi time ideal)
```

### 3.2 Database Setup (Production)

```bash
# Provision production DB (DO NOT use the staging DB)
# Recommended: Fly Postgres (Pro plan), Supabase Pro, or AWS RDS

# Apply migrations (same as staging, but verify schema diff first)
# CRITICAL: Do a dry-run on a staging DB clone first
pg_dump "$STAGING_DATABASE_URL" --schema-only | diff - <(psql "$PROD_DATABASE_URL" --schema-only -c "\dt")
# If diff shows differences, STOP and investigate.

# Apply migrations
for f in packages/db/src/migrations/*.sql; do
  echo "Applying $f..."
  psql "$PROD_DATABASE_URL" -f "$f" || { echo "FAILED at $f"; exit 1; }
done

# Seed ONLY if this is a brand-new deployment (no demo data in prod)
# pnpm db:seed --env=production  # ONLY for new deployments
```

### 3.3 App Deployment (Production)

```bash
# Create production app
flyctl apps create haa-platform-prod

# Set production secrets (different from staging!)
flyctl secrets set --app haa-platform-prod \
  DATABASE_URL="$PROD_DATABASE_URL" \
  # ... all secrets from §1.3 with PRODUCTION values

# Deploy with blue-green strategy (zero-downtime)
flyctl deploy --app haa-platform-prod \
  --strategy bluegreen \
  --wait-timeout 600

# Verify
flyctl status --app haa-platform-prod
curl -I https://api.haastores.sa/health
```

### 3.4 DNS + CDN (Production)

```bash
# In Cloudflare dashboard:
# 1. A record: api.haastores.sa → Fly.io IP
# 2. CNAME: merchant → haa-platform-prod.fly.dev
# 3. CNAME: admin → haa-platform-prod.fly.dev
# 4. CNAME: www → merchant (redirect)
# 5. Wildcard CNAME: *.haastores.sa → merchant (for store subdomains)
# 6. Enable proxy + Full SSL strict
# 7. Enable HSTS (Strict-Transport-Security)
# 8. Enable Bot Fight Mode
# 9. Set up rate limiting rules (Cloudflare WAF)
```

### 3.5 Production Smoke Tests

```bash
# Same as §2.4 but against production URLs
curl -I https://api.haastores.sa/health
curl -I https://merchant.haastores.sa
curl -I https://admin.haastores.sa

# Test 3DS (with Moyasar live, small amount)
# - Place a test order for 1 SAR
# - Verify 3DS challenge appears (if card issuer requires it)
# - Verify the order completes

# Test BNPL (Tabby/Tamara sandbox first, then live)
# - Place a test order for 100 SAR via Tabby
# - Verify redirect to Tabby challenge
# - Verify return and order confirmation
```

### 3.6 Activate Monitoring + Alerting

```bash
# 1. PagerDuty / OpsGenie service created for haa-platform-prod
# 2. Slack #alerts channel configured
# 3. Alert rules (see docs/ops/ALERT_RULES.md):
#    - P0: page on-call immediately (5 min response)
#    - P1: notify team (30 min response)
#    - P2: log only
# 4. Sentry: production project, alerts on new errors
# 5. Uptime monitor: 1-min interval, alerts on 2 consecutive failures

# Verify
pnpm ops:monitor --env=production
```

---

## 4. Post-Deployment Validation (Day 0)

Run **within 1 hour** of production deployment:

```bash
# Health
curl https://api.haastores.sa/health
# Expected: { "status": "healthy", "db": "connected", "redis": "connected" }

# Synthetic checks
pnpm ops:synthetic --env=production
# Expected: all checks pass

# Error analysis
pnpm ops:errors
# Expected: no new fingerprints since last deploy

# Smoke test
pnpm test
# Expected: all tests still pass (regression check)

# Browser smoke (from LOCAL_DEMO_SCRIPT.md)
# 1. /s/haa-demo loads
# 2. Add to cart works
# 3. Checkout with fake_card_success works (fake mode for dev)
# 4. Merchant dashboard loads
# 5. Admin dashboard loads

# Customer support
# 1. Submit a test support ticket
# 2. Verify it appears in the merchant dashboard
```

Document the results in `docs/ops/INCIDENTS.md` under "Deployment Validation".

---

## 5. Rollback Plan

**If a P0 incident occurs in the first 24 hours of production:**

### 5.1 Application Rollback (Fly.io)

```bash
# Fly.io blue-green deploys keep the previous version running.
# To rollback:
flyctl releases --app haa-platform-prod  # list releases
flyctl releases rollback --app haa-platform-prod --version <previous-version>
```

### 5.2 Database Rollback

**Database rollbacks are HARD.** Prevention is key:

- Every migration has a corresponding "down" script in `packages/db/src/migrations/`
- Test the down script on staging first
- Snapshot the DB before each deploy:
  ```bash
  flyctl postgres snapshot create --app haa-prod-db
  ```

If a down-migration is impossible (data loss risk), use the snapshot:
```bash
flyctl postgres snapshot restore --app haa-prod-db --snapshot <id>
```

### 5.3 DNS Rollback

```bash
# In Cloudflare: revert the A/CNAME records to the previous IP/target
# (DNS TTL is 300s, so propagation is fast)
```

### 5.4 Post-Rollback

```bash
# 1. Notify team (Slack #deployments)
# 2. Open incident in INCIDENTS.md
# 3. RCA (root cause analysis) within 24 hours
# 4. Fix + re-deploy (post-mortem required)
```

---

## 6. Monitoring & Maintenance

### 6.1 Daily

```bash
pnpm ops:monitor --env=production
# Checks: health, synthetic, errors
# Time: ~5 minutes
# Run via cron: 0 */6 * * * pnpm ops:monitor --env=production
```

### 6.2 Weekly

- Review error reports (`docs/ops/LATEST_MONITORING_REPORT.md`)
- Review support tickets volume
- Review transaction volume vs fraud signals
- Backup verification (restore test on a clone)

### 6.3 Monthly

- Security audit (see `docs/security/SECURITY_BASELINE.md`)
- Dependency updates (`pnpm outdated`)
- Performance review (slow queries, response times)
- Capacity planning (DB size, traffic trends)

### 6.4 Quarterly

- Disaster recovery drill (restore from backup, point-in-time recovery)
- Penetration testing (third-party)
- Compliance review (PDPL audit, ZATCA audit)
- Disaster recovery plan update

---

## 7. On-Call Handbook

**On-call rotation:**
- Primary: [TBD — rotation schedule in PagerDuty]
- Secondary: [TBD]
- Escalation: Haa Stores CTO

**On-call responsibilities:**
1. Acknowledge pages within 5 minutes.
2. Triage: P0 (immediate action), P1 (within 1 hour), P2 (next business day).
3. Update `docs/ops/INCIDENTS.md` with the incident.
4. Communicate in Slack #incidents.
5. Hand off to next on-call at end of shift.

For the detailed incident response procedure, see `docs/INCIDENT_RESPONSE.md`.

---

## 8. Cross-references

- `docs/NO_DEPLOY_POLICY.md` — when deployment IS allowed
- `docs/STAGING_PLAN.md` — proposed hosting architecture
- `docs/STAGING_SECURITY.md` — security controls in staging
- `docs/PRODUCTION_READINESS.md` — readiness checklist
- `docs/INCIDENT_RESPONSE.md` — what to do during an incident
- `docs/PRIVACY_POLICY.md` — legal: data handling
- `docs/TERMS_OF_SERVICE.md` — legal: ToS
- `docs/SAUDI_COMPLIANCE_CHECKLIST.md` — regulatory compliance
- `docs/ops/INCIDENTS.md` — incident log
- `docs/ops/MONITORING_PLAYBOOK.md` — monitoring operations

---

**Document version:** 1.0
**Next review:** 2026-09-17 (every 3 months during active deployment)
**Approved by:** [TBD — Owner + Platform Team review before use]
