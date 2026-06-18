# TASK-0044 Phase 5 — Pen-Test Vendor Deploy Runbook

> **Audience:** Engineering (when the founder engages a CREST pen-test firm per TASK-0038 G7).
> **Goal:** Provision a clean, isolated, vendor-friendly staging environment the pen-test firm can attack for 1-2 weeks without touching production data.
> **Prerequisite:** `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md` — vendor already chosen + NDA signed.
> **Related:** `docs/DEPLOYMENT_RUNBOOK.md` (general deploy), `docs/ops/MARKETPLACE_HARDENING_PLAN.md` §8 Phase 6, `docs/ops/ASV_SCAN_TARGET.md` (quarterly ASV — different vendor).

---

## 0. Why this exists (vs `docs/DEPLOYMENT_RUNBOOK.md`)

`DEPLOYMENT_RUNBOOK.md` covers general staging + production deploys. This runbook is **vendor-facing** — it documents the dedicated pen-test environment, the read-only access grants, the data reset procedure, and the evidence collection. Three things make this environment different from staging:

1. **Identical schema to production** — vendor needs realistic attack surface.
2. **Synthetic but realistic data** — vendor sees merchant products, customer orders, admin permissions, marketplace data, but no real PII.
3. **Reset between engagements** — every engagement starts from a clean baseline so findings are reproducible.

---

## 1. Pen-test environment topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                   pen-test.haastores.sa (subdomain)                 │
│                       (Let's Encrypt + Cloudflare)                  │
└──────────────┬──────────────────┬───────────────────┬───────────────┘
               │                  │                   │
       ┌───────▼──────┐  ┌────────▼────────┐  ┌───────▼────────┐
       │ pen-test-api │  │pen-test-dashboard│  │pen-test-sf     │
       │   (Hono)     │  │   (React SPA)    │  │ (React SPA)    │
       │   :3000      │  │    :5173         │  │    :5174       │
       └──────┬───────┘  └─────────┬────────┘  └───────┬────────┘
              │                    │                   │
              └────────────────────┼───────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
       ┌──────▼───────┐   ┌────────▼────────┐  ┌───────▼────────┐
       │pen-test-db   │   │pen-test-redis   │  │pen-test-storage│
       │(Postgres 16) │   │(Upstash 256MB)  │  │(Cloudflare R2) │
       │  reset daily │   │ reset weekly    │  │ reset monthly  │
       └──────────────┘   └─────────────────┘  └────────────────┘
```

**One single region** (Dubai or KSA, matching G8 decision). Do not run multi-region — that adds attack surface without value.

**Isolated from production:**

- Separate subdomain (`pen-test.haastores.sa`) — NOT under the public `haastores.sa`.
- Separate DB user (`pentest_reader`) with read-only access to schema; writes only via the application (no direct DB grants).
- Separate Redis namespace (`pentest:*` keyspace).
- Separate R2 bucket prefix (`pentest/`).
- No real payment provider integration — `PAYMENT_MODE=fake`, `SHIPPING_MODE=mock`.
- No outbound webhooks (Tabby/Tamara endpoints stubbed or skipped in pen-test env).

---

## 2. Pre-engagement provisioning (1-2 days)

### 2.1 Provision infrastructure

```bash
# 1. Create pen-test subdomain + DNS
#    (Cloudflare: add A/CNAME record pen-test.haastores.sa → pen-test-app.fly.dev or equivalent)

# 2. Provision the pen-test environment
#    - Either: separate Fly.io app (haa-pen-test) — preferred (full isolation)
#    - Or: separate Docker Compose stack on a dedicated VM
#    Cost estimate: ~$15-30/month (1 small VM + managed Postgres dev tier + 256MB Redis)

# 3. Clone the repo
git clone <your-fork-url> haa-pen-test
cd haa-pen-test
git checkout feature/phase-9-cod-fee-policy  # the branch ready for pen-test
```

### 2.2 Configure environment variables

Create `.env.pentest` (separate from `.env` / `.env.production`):

```bash
# ──────────────────────────────────────────────────────────
# Pen-test environment — ISOLATED FROM PRODUCTION
# ──────────────────────────────────────────────────────────

NODE_ENV=staging  # triggers stricter security checks
API_PORT=3000
API_BASE_URL=https://pen-test.haastores.sa
MERCHANT_DASHBOARD_URL=https://pen-test.haastores.sa/dashboard
STOREFRONT_URL=https://pen-test.haastores.sa

# Database — pen-test DB, separate from production
DATABASE_URL=postgres://pentest_writer:<STRONG-PASSWORD>@<host>:5432/haastores_pentest
DATABASE_READ_URL=postgres://pentest_reader:<STRONG-PASSWORD>@<host>:5432/haastores_pentest
REDIS_URL=redis://<password>@<host>:6379/1
QUEUE_REDIS_URL=redis://<password>@<host>:6379/2

# Secrets — generate NEW ones (do NOT reuse production secrets)
# Use: openssl rand -hex 64 (for JWT_SECRET, ADMIN_JWT_SECRET, ENCRYPTION_KEY)
JWT_SECRET=<generate-fresh>
ADMIN_JWT_SECRET=<generate-fresh>
ENCRYPTION_KEY=<generate-fresh>

# CORS — allow the pen-test dashboard + storefront origins
CORS_ORIGINS=https://pen-test.haastores.sa,https://pen-test.haastores.sa/dashboard,https://pen-test.haastores.sa/s

# Storage — separate R2 bucket prefix
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=haastores-pen-test
S3_ACCESS_KEY_ID=<R2-key-pentest-scope>
S3_SECRET_ACCESS_KEY=<R2-secret-pentest-scope>
S3_PUBLIC_BASE_URL=https://pen-test-cdn.haastores.sa

# Payments — FAKE (no real money, no real Tabby/Tamara calls)
PAYMENT_PROVIDER=fake
PAYMENT_MODE=fake
PAYMENT_SANDBOX_PUBLIC_KEY=pk_fake_pentest
PAYMENT_SANDBOX_SECRET_KEY=sk_fake_pentest

# Shipping — MOCK (no real OTO/SMSA calls)
SHIPPING_PROVIDER=manual
SHIPPING_MODE=mock

# Observability — pen-test logs go to a SEPARATE Sentry project
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<pentest-project>
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# G8 hosting region (set this when owner confirms KSA region)
HOSTING_REGION=pending
DATA_RESIDENCY=pending

# Email — log to stdout (no real SMTP)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=

# Log level — DEBUG during pen-test (so we see what vendor triggers)
LOG_LEVEL=debug
```

### 2.3 Seed pen-test data

```bash
# 1. Run migrations on the pen-test DB
pnpm db:migrate

# 2. Run the seed (synthetic but realistic)
pnpm db:seed

# 3. Apply pen-test-specific fixtures (separate script — see §2.4)
pnpm tsx scripts/seed-pentest-fixtures.ts
```

### 2.4 Pen-test fixtures (synthetic but realistic)

Create `scripts/seed-pentest-fixtures.ts` (engineering must write this before pen-test starts; not in current repo):

| Fixture                                                                                 | Count | Purpose                           |
| --------------------------------------------------------------------------------------- | ----- | --------------------------------- |
| Merchants (CR + VAT active)                                                             | 5     | Realistic KYCed sellers           |
| Stores (mix `is_demo=true` with `demoProfile='main'`, and `is_demo=false`)              | 5     | Test tenant isolation             |
| Products (mix approved/review/pending, mix `requires_sfda=true/false`)                  | 200   | Test marketplace filters          |
| Categories (mix `prohibited_in_marketplace=true/false`, mix `requires_sfda=true/false`) | 30    | Test category logic               |
| Customers (synthetic names, phones, addresses)                                          | 100   | Test order flows                  |
| Orders (mix COD, fake-paid, marketplace, direct)                                        | 200   | Test order access tokens, IDOR    |
| Marketplace orders (with `accessToken` set)                                             | 50    | Test order tracking enumeration   |
| Admin users (Owner + Manager + Reviewer roles)                                          | 3     | Test admin permission granularity |
| Audit log entries (last 30 days)                                                        | 500   | Test audit log depth              |
| API keys (with revoked + active)                                                        | 10    | Test API key rotation             |

**Critical: no real PII anywhere.** All names, phones, emails, addresses are obviously fake (e.g. `merchant-test-001@pentest.local`, `+966500000001`, address "123 Test Street Riyadh 00000"). Document this in `docs/ops/PENTEST_DATA_CERTIFICATION.md` and have the founder sign it.

### 2.5 Smoke check the pen-test environment

```bash
# 1. Verify the API + dashboards are reachable
curl -sS https://pen-test.haastores.sa/health | jq .

# 2. Run the pre-pentest smoke (existing script, against pen-test URL)
API_BASE=https://pen-test.haastores.sa pnpm preflight:pentest

# 3. Run the full test suite against pen-test
pnpm test:smoke

# 4. Verify rate limits match production
# (curl /marketplace/orders 31 times → expect 429 on the 31st)
```

---

## 3. Vendor access grant (1-2 hours)

### 3.1 Access levels

The pen-test firm gets **3 scoped credentials**, all of which expire at the end of the engagement:

| Credential                   | Scope                                               | Lifetime  | Issued by          |
| ---------------------------- | --------------------------------------------------- | --------- | ------------------ |
| **API base URL**             | `https://pen-test.haastores.sa`                     | 2-4 weeks | DNS + TLS          |
| **Test accounts** (10 users) | Pre-created test users (merchant, admin, customer)  | 2-4 weeks | Seeded in fixtures |
| **Read-only DB user**        | `pentest_reader` — SELECT only on public schema     | 2-4 weeks | Engineering        |
| **Log access**               | Read-only to pen-test Sentry project + request logs | 2-4 weeks | Sentry invite      |

**What the vendor does NOT get:**

- Production environment access (DNS, IPs, DB, secrets).
- Direct database write access (all writes go through the API).
- Outbound network access from the pen-test environment (Tabby/Tamara/SMSA endpoints blocked at the firewall — `PAYMENT_MODE=fake` already enforces this).
- Source code access (black-box engagement by default; white-box only if explicitly contracted).

### 3.2 Test accounts (in `scripts/seed-pentest-fixtures.ts`)

| Role                          | Username                               | Password     | Notes                                  |
| ----------------------------- | -------------------------------------- | ------------ | -------------------------------------- |
| Owner admin                   | `admin-owner-pentest@pentest.local`    | `<generate>` | Full admin perms                       |
| Manager admin                 | `admin-manager-pentest@pentest.local`  | `<generate>` | Manager perms (no billing)             |
| Reviewer admin                | `admin-reviewer-pentest@pentest.local` | `<generate>` | `marketplace.review` only              |
| Merchant 1 (active)           | `merchant-001@pentest.local`           | `<generate>` | CR + VAT active                        |
| Merchant 2 (suspended)        | `merchant-002@pentest.local`           | `<generate>` | Suspended; tests suspension bypass     |
| Merchant 3 (incomplete KYC)   | `merchant-003@pentest.local`           | `<generate>` | No CR — should be blocked from publish |
| Customer 1 (verified)         | `customer-001@pentest.local`           | `<generate>` | Has 5 orders                           |
| Customer 2 (guest checkout)   | (no account)                           | (no account) | Guest flow test                        |
| Customer 3 (unverified phone) | `customer-003@pentest.local`           | `<generate>` | Phone not verified                     |

**Share the credentials securely:**

- Use 1Password shared vault OR end-to-end encrypted email (ProtonMail) OR a password manager share.
- Do NOT email credentials in plaintext.
- Do NOT paste into Slack/Teams/discord.
- Each test account is owned by the founder — they grant vendor access via the share link.

### 3.3 Read-only DB user

```sql
-- Run once on the pen-test DB by engineering.
-- The vendor connects with this user to inspect the schema (no writes).

CREATE USER pentest_reader WITH ENCRYPTED PASSWORD '<STRONG-PASSWORD>';
GRANT CONNECT ON DATABASE haastores_pentest TO pentest_reader;
GRANT USAGE ON SCHEMA public TO pentest_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO pentest_reader;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO pentest_reader;
-- Future-proof: any new tables created post-grant
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO pentest_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO pentest_reader;
```

Share credentials via the same secure channel as test accounts.

### 3.4 Log access (Sentry)

Create a separate Sentry project `haa-pen-test` (free tier, 5K events/day is enough). Invite the vendor's lead tester as a **Member** role (read-only to that project). Document the project URL + the vendor's email in the engagement contract.

### 3.5 Engagement kickoff checklist (engineering)

Before sending the welcome email to the vendor:

- [ ] Pen-test environment deployed + smoke-checked (§2.5).
- [ ] Test accounts seeded + passwords generated.
- [ ] Read-only DB user created + tested.
- [ ] Sentry project created + vendor invited.
- [ ] Engagement contract signed (already done before this runbook starts; engineering just confirms).
- [ ] NDA on file (already done; engineering confirms copy in `docs/compliance/<vendor>-nda.pdf`).
- [ ] Welcome email sent (use template in `PEN_TEST_VENDOR_SHORTLIST.md` §8.1 — adapt for engagement).
- [ ] Slack channel created (`#pentest-<vendor>`) for real-time clarification.
- [ ] Engineering on-call schedule published for the engagement window.
- [ ] Daily standup time agreed (15 min, vendor + engineering + founder).

---

## 4. During the engagement (1-2 weeks)

### 4.1 Daily standup agenda (15 min)

| Duration | Topic                                           | Owner       |
| -------- | ----------------------------------------------- | ----------- |
| 2 min    | Vendor: what they tested yesterday, what's next | Vendor lead |
| 3 min    | Vendor: any blockers or unclear scope           | Vendor lead |
| 3 min    | Engineering: any suspicious activity in logs    | Engineering |
| 2 min    | Engineering: stability of pen-test env          | Engineering |
| 3 min    | Q&A / clarifications                            | All         |
| 2 min    | Wrap + schedule tomorrow                        | All         |

### 4.2 Critical findings — emergency channel

If the vendor finds a **Critical** issue (data exposure, auth bypass, RCE):

1. Vendor pings `#pentest-<vendor>` immediately.
2. Engineering triages within 1 hour.
3. If confirmed Critical → engineering fixes within 24h OR pauses the engagement.
4. If paused → founder decides whether to roll back staging or proceed to fix.

### 4.3 Data reset between test cycles

The vendor may want a clean environment periodically. Engineering provides this:

```bash
# Full DB reset (drops + recreates + re-seeds)
pnpm db:reset && pnpm db:migrate && pnpm db:seed && pnpm tsx scripts/seed-pentest-fixtures.ts

# Verify
pnpm preflight:pentest
```

Time estimate: 5-10 minutes. Schedule it for off-hours if the vendor is testing concurrently.

### 4.4 Monitoring during the engagement

- `pnpm ops:monitor` (existing) — runs every 15 min via cron.
- Watch for: spike in 4xx (expected — vendor probing), spike in 5xx (investigate), spike in auth failures (expected — vendor brute-forcing).
- If pen-test env starts affecting stability → throttle vendor traffic or pause.

---

## 5. Post-engagement (1 week)

### 5.1 Report triage

Use `docs/ops/PEN_TEST_TRIAGE_TEMPLATE.md` — schedule a 1-hour triage meeting within 48 hours of report delivery.

### 5.2 Re-test (if needed)

If the contract includes 1 free re-test:

```bash
# 1. Apply all Critical/High fixes to pen-test env
git pull  # or cherry-pick fix commits
pnpm db:migrate  # if any schema changes
# Deploy to pen-test env

# 2. Notify vendor fixes are deployed
# Use template in PEN_TEST_TRIAGE_TEMPLATE.md §8.1

# 3. Vendor re-tests the specific findings
# Schedule 1-3 day re-test window
```

### 5.3 Vendor access revocation (engineering)

When the engagement ends:

```sql
-- Drop the read-only DB user
DROP USER pentest_reader;
```

```bash
# Remove Sentry invite
# (Sentry UI: Settings → Members → remove vendor)
```

- Rotate all test account passwords (or delete the test accounts entirely).
- Rotate JWT_SECRET, ADMIN_JWT_SECRET, ENCRYPTION_KEY in the pen-test env.
- Document the engagement end in `docs/compliance/<vendor>-engagement-<date>.md`:
  - Start + end date
  - Vendor name + lead tester
  - Findings count (Critical/High/Medium/Low)
  - Disposition (all fixed / accepted with justification / pending)
  - NDA + report archived at `<path>`

### 5.4 Pen-test environment teardown

The pen-test environment can stay up between engagements (useful for re-tests) but should be torn down if the founder decides to stop doing pen-tests:

```bash
# Tear down Fly.io app
fly apps destroy haa-pen-test

# Drop pen-test DB
fly postgres db destroy haastores_pentest

# Remove R2 bucket
# (R2 UI: delete bucket haastores-pen-test)

# Revoke all DNS records
# (Cloudflare: delete A/CNAME for pen-test.haastores.sa)
```

---

## 6. Quick-reference: who owns what

| Task                             | Owner                   | Timeline                    |
| -------------------------------- | ----------------------- | --------------------------- |
| Vendor shortlist + selection     | Founder                 | Week 1 (TASK-0038 G7)       |
| NDA + contract signing           | Founder                 | Week 1-2                    |
| Pen-test env provisioning        | **Engineering**         | T-1 week (1-2 days)         |
| Pen-test fixtures script         | **Engineering**         | T-1 week (0.5 day)          |
| Test accounts + DB user          | **Engineering**         | T-1 week (1 hour)           |
| Sentry project + invite          | **Engineering**         | T-1 week (15 min)           |
| Welcome email + Slack channel    | Founder + Engineering   | T-3 days (30 min)           |
| Daily standups during engagement | Engineering             | 1-2 weeks                   |
| Critical finding response        | Engineering (1h triage) | As-needed                   |
| Report triage meeting            | Founder + Engineering   | Within 48h of report        |
| Critical/High fixes              | **Engineering**         | 2-5 days post-report        |
| Re-test coordination             | Engineering             | 1-3 days                    |
| Vendor access revocation         | **Engineering**         | 1 hour after engagement end |
| Engagement archival              | **Engineering**         | 1 hour after engagement end |

---

## 7. References

- `docs/DEPLOYMENT_RUNBOOK.md` — general staging + production deploy
- `docs/ops/MARKETPLACE_HARDENING_PLAN.md` §8 Phase 6 — pen-test scope + triage
- `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md` — 3 vendors + selection criteria
- `docs/ops/PEN_TEST_TRIAGE_TEMPLATE.md` — post-report triage template
- `docs/ops/ASV_SCAN_TARGET.md` — quarterly ASV scan (different vendor + cadence)
- `docs/ops/INCIDENT_RESPONSE.md` — incident handling (if vendor finds a Critical)
- `scripts/pre-pentest-smoke.sh` — pre-engagement smoke check
- `scripts/dr-backup.sh` — backup before any pen-test env reset

---

**Last Updated:** 2026-06-18 (TASK-0044 §A2 — Session R engineering prep)
**Owner Action:** Engage vendor (TASK-0038 G7) before using this runbook
**Engineering Effort:** 1-2 days provisioning + 2-5 days fixes + 1 hour teardown
**Cost Estimate:** $15-30/month infrastructure + vendor cost (separate)
