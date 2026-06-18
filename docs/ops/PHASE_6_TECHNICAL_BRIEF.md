# TASK-0044 Phase 6 — Pen-Test Firm Technical Brief

> **Audience:** CREST-certified pen-test firm (TASK-0038 G7) — share with the vendor AFTER NDA + contract signed.
> **Goal:** Give the vendor a single self-contained document that lets them start testing on Day 1 with minimal clarification calls.
> **Prerequisite:** `docs/ops/PHASE_5_DEPLOY_RUNBOOK.md` (the environment must already be provisioned).
> **Related:** `PEN_TEST_VENDOR_SHORTLIST.md`, `PEN_TEST_TRIAGE_TEMPLATE.md`, `MARKETPLACE_HARDENING_PLAN.md` §8.

---

## 1. Engagement at a glance

| Field                     | Value                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Client**                | Haa Stores (هاء متاجر) — multi-tenant SaaS e-commerce platform                                       |
| **Engagement type**       | Black-box external web application + API pen-test                                                    |
| **Engagement window**     | 1-2 weeks active testing + 1 week report                                                             |
| **Tester authorization**  | Vendor + founder have signed authorization letter (provided in engagement packet, NOT in this brief) |
| **Environment**           | `https://pen-test.haastores.sa` (dedicated, isolated staging)                                        |
| **Test accounts**         | 10 pre-seeded accounts (Section 6)                                                                   |
| **Read-only DB access**   | Yes — `pentest_reader` user (Section 7)                                                              |
| **Log access**            | Read-only Sentry project `haa-pen-test` (Section 8)                                                  |
| **Communication channel** | `#pentest-<vendor>` Slack Connect + daily 15-min standup                                             |
| **Emergency contact**     | Founder (cell in contract) + Engineering on-call                                                     |

---

## 2. Application architecture (text diagram)

Haa Stores is a **multi-tenant SaaS** with one backend API + 3 React SPAs:

```
                ┌───────────────────────┐
                │     Cloudflare        │ ← TLS + WAF (DDoS protection)
                │   (CDN + Proxy)       │
                └─────────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐         ┌──────▼──────┐       ┌──────▼──────┐
   │pen-test │         │ pen-test    │       │ pen-test    │
   │  -api   │         │ -dashboard  │       │ -sf         │
   │ :3000   │         │   :5173     │       │   :5174     │
   │ (Hono)  │         │  (React)    │       │  (React)    │
   └────┬────┘         └──────┬──────┘       └──────┬──────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │             │
       ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐
       │ Postgres 16 │ │   Redis   │ │ R2/S3     │
       │ (multi-AZ)  │ │ (cache +  │ │ (storage) │
       │             │ │  queues)  │ │           │
       └─────────────┘ └───────────┘ └───────────┘
```

**Key layers (code organization):**

- `apps/api` — Hono backend, ~376 LOC `index.ts` (middleware order matters), ~789 LOC `haa-marketplace.ts` (public marketplace), ~407 LOC `admin/marketplace.ts` (admin moderation).
- `apps/merchant-dashboard` — React SPA for merchants.
- `apps/storefront` — React SPA for customers + serves `/s/:slug` (per-store).
- `apps/admin-dashboard` — React SPA for platform admin.
- `packages/db` — Drizzle ORM schema + migrations.
- `packages/auth-core` — JWT, password hashing, permission checks.
- `packages/commerce-core` — order state machine, cart, pricing.
- `packages/marketplace-core` — marketplace business logic.

**Multi-tenancy model:** Tenant = a brand on the platform. Each tenant has 1+ stores (`stores` table). Every resource (products, orders, customers) is scoped to `storeId`. The API resolves tenant from `Host` header (subdomain) or `X-Store-Id` header — see `apps/api/src/middleware/store-tenant-cache.ts`. **Cross-tenant data access is the #1 concern — test this thoroughly.**

---

## 3. Authentication + authorization model

### 3.1 Three token types

| Token         | Header / Cookie                                       | Lifetime                       | Purpose                  | Algorithm                           |
| ------------- | ----------------------------------------------------- | ------------------------------ | ------------------------ | ----------------------------------- |
| **User JWT**  | `Authorization: Bearer <jwt>` OR cookie `auth-token`  | 7 days (sliding)               | Customer + merchant auth | HS256 (JWT_SECRET)                  |
| **Admin JWT** | Cookie `admin-auth-token` (httpOnly, sameSite=strict) | 1 hour                         | Admin dashboard auth     | HS256 (ADMIN_JWT_SECRET)            |
| **API Key**   | `Authorization: ApiKey <key>` OR `X-API-Key: <key>`   | Configurable (default 90 days) | Server-to-server         | Random 64-char string, hashed in DB |

### 3.2 Permission system (RBAC)

Permissions are string-based, namespaced: `<resource>.<action>` (e.g., `marketplace.review`, `products.create`, `admin.impersonate`).

- Full permission list: `packages/shared/src/permissions.ts` (~200 permissions).
- Role → permission mapping: `packages/auth-core/src/permission-service.ts`.
- Roles are tenant-scoped (a user can be `Owner` in tenant A and `Manager` in tenant B).
- Admin roles: `Owner` (all perms) / `Manager` (no billing) / `Reviewer` (marketplace review only) / `Support` (read-only customer data).

### 3.3 Guest flows (no auth)

- **Guest checkout**: `POST /marketplace/orders` accepts a guest customer (no user record). Customer enters name + phone + address.
- **Order tracking via accessToken**: `GET /marketplace/orders/:num?access_token=<uuid>` — the `accessToken` is a 122-bit random UUID returned ONCE in the `POST /marketplace/orders` response.
- **CSRF defense**: `csrfOrigin()` middleware rejects mutating requests (POST/PATCH/PUT/DELETE) where `Origin` header is not in `env.CORS_ORIGINS`. Server-to-server calls (no Origin header) pass through.

---

## 4. Test scope (in-scope endpoints)

### 4.1 Public marketplace (highest priority)

| Method | Path                                            | Notes                                                                                                                                                |
| ------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/marketplace/products`                         | List products. Query params: `?page` (default 1), `?limit` (default 50, max 200), `?category`, `?search`                                             |
| `GET`  | `/marketplace/products/:storeSlug/:productSlug` | Single product detail                                                                                                                                |
| `GET`  | `/marketplace/sellers`                          | List sellers                                                                                                                                         |
| `GET`  | `/marketplace/sellers/:slug`                    | Single seller detail (must NOT leak `email` or `phone` — T8)                                                                                         |
| `GET`  | `/marketplace/categories`                       | Categories tree                                                                                                                                      |
| `GET`  | `/marketplace/stats`                            | Public stats                                                                                                                                         |
| `POST` | `/marketplace/orders`                           | **Highest risk.** Guest checkout. Tests: IDOR (enumeration), injection (SQL + NoSQL), XSS (name/address), rate-limit bypass (P1-9: 30/10min in prod) |
| `GET`  | `/marketplace/orders/:num?access_token=<uuid>`  | Order tracking. **P0-3 fix** — phone-based lookup is DEPRECATED. Test: token entropy, brute-force resistance, info leak in error responses           |

### 4.2 Public storefront

| Method | Path                  | Notes                                                 |
| ------ | --------------------- | ----------------------------------------------------- |
| `GET`  | `/s/:slug`            | Storefront SPA + SSR storefront data                  |
| `GET`  | `/s/:slug/p/:slug`    | Product page (HTML)                                   |
| `GET`  | `/s/:slug/api/brand`  | Storefront config                                     |
| `POST` | `/s/:slug/cart/*`     | Cart operations (guest + auth)                        |
| `POST` | `/s/:slug/checkout/*` | Checkout flow                                         |
| `GET`  | `/storage/*`          | Uploaded images (rate-limited 100/min, storage guard) |

### 4.3 Auth

| Method | Path             | Notes                                                                                  |
| ------ | ---------------- | -------------------------------------------------------------------------------------- |
| `POST` | `/auth/login`    | User login. Strict rate limit (10/10min in prod). Account lockout: 5 failures → 15 min |
| `POST` | `/auth/register` | User registration. Strict rate limit (10/10min in prod)                                |
| `POST` | `/auth/logout`   | Logout                                                                                 |
| `GET`  | `/auth/me`       | Current user. Test IDOR                                                                |

### 4.4 Admin (high value target)

| Method      | Path                                      | Notes                                                                                            |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `POST`      | `/admin/login`                            | Admin login. Strict rate limit (10/10min in prod)                                                |
| `GET`       | `/admin/marketplace/summary`              | Dashboard summary                                                                                |
| `GET`       | `/admin/marketplace/products`             | Products list (paginated: `?page`, `?limit`)                                                     |
| `PATCH`     | `/admin/marketplace/products/:id/review`  | Approve / reject. **P1-2 fix** — requires `marketplace.review` permission. Writes audit log.     |
| `PATCH`     | `/admin/marketplace/products/:id/feature` | Feature / unfeature. **P1-2 fix** — requires `marketplace.feature` permission. Writes audit log. |
| `GET`       | `/admin/marketplace/orders`               | Orders list (paginated)                                                                          |
| `GET/PATCH` | `/admin/tenants/*`                        | Tenant management                                                                                |
| `GET`       | `/admin/operations/*`                     | Operational metrics                                                                              |

### 4.5 Webhooks (lower priority — outbound blocked in pen-test env)

| Method | Path                 | Notes                                                               |
| ------ | -------------------- | ------------------------------------------------------------------- |
| `POST` | `/webhooks/oto`      | OTO shipping webhook (auth: `OTO_WEBHOOK_AUTHORIZATION_KEY` header) |
| `POST` | `/webhooks/shipping` | Generic shipping webhook                                            |
| `POST` | `/webhooks/payment`  | Payment provider webhooks (auth: `PAYMENT_WEBHOOK_SECRET`)          |

**Note:** In the pen-test env, `PAYMENT_MODE=fake` and `SHIPPING_MODE=mock`. Outbound calls to Tabby/Tamara/OTO are stubbed — the vendor will not be able to test webhook flows that depend on external services. Vendor should test webhook **reception** (signing, idempotency, replay protection) only.

### 4.6 API key auth (lower priority)

| Method  | Path        | Notes                                                                                 |
| ------- | ----------- | ------------------------------------------------------------------------------------- |
| Various | `/api/v1/*` | Public API endpoints. Auth via API key. Test: key entropy, scope check, rotation flow |

---

## 5. Out of scope (do not test)

The vendor should NOT spend time on these — they are either handled by other engagements or non-applicable:

- **Internal network pen-test** — this is an external black-box engagement.
- **Social engineering** — deferred to Phase 8+.
- **Source code review** — use a separate code audit if needed (white-box engagement can be added at extra cost).
- **Mobile app** — Haa Stores does not currently have a native mobile app. The storefront is a responsive React SPA.
- **Physical security** — N/A (cloud-hosted).
- **DDoS testing** — explicitly forbidden. Cloudflare WAF will rate-limit any attempt.
- **Production environment** — `haastores.sa` and subdomains are explicitly off-limits. Any probing of production terminates the engagement.
- **Third-party services** (Tabby, Tamara, Moyasar, Geidea, OTO, SMSA, SFDA APIs) — these are external services; testing them is out of scope.
- **Wallet / payment processing** — `PAYMENT_MODE=fake` in the pen-test env means no real money flows. Real payment testing is in a separate engagement (G6 ASV + a future payment-specific engagement).

---

## 6. Test accounts (10 users)

**Securely shared by the founder via 1Password / encrypted email / password manager share. Do NOT commit to git, do NOT email in plaintext.**

| #   | Role                                   | Username                               | Password      | Notes                                             |
| --- | -------------------------------------- | -------------------------------------- | ------------- | ------------------------------------------------- |
| 1   | Owner admin                            | `admin-owner-pentest@pentest.local`    | `<generated>` | All admin perms                                   |
| 2   | Manager admin                          | `admin-manager-pentest@pentest.local`  | `<generated>` | Manager perms (no billing)                        |
| 3   | Reviewer admin                         | `admin-reviewer-pentest@pentest.local` | `<generated>` | `marketplace.review` + `marketplace.feature` only |
| 4   | Merchant 1 (active)                    | `merchant-001@pentest.local`           | `<generated>` | CR + VAT active, 50 products, 30 orders           |
| 5   | Merchant 2 (suspended)                 | `merchant-002@pentest.local`           | `<generated>` | Suspended; tests suspension bypass                |
| 6   | Merchant 3 (incomplete KYC)            | `merchant-003@pentest.local`           | `<generated>` | No CR; publish should be blocked                  |
| 7   | Customer 1 (verified, has orders)      | `customer-001@pentest.local`           | `<generated>` | 5 orders, 3 fulfilled                             |
| 8   | Customer 2 (unverified phone)          | `customer-002@pentest.local`           | `<generated>` | Phone not verified                                |
| 9   | Customer 3 (password recently changed) | `customer-003@pentest.local`           | `<generated>` | Token version 2 (test token-version-verify path)  |
| 10  | (no account)                           | (guest)                                | (guest)       | Guest checkout flow only                          |

**Synthetic data guarantees:**

- All names, phones, emails, addresses are obviously fake (e.g. `+966500000001`, `merchant-001@pentest.local`, address "123 Test Street Riyadh 00000").
- No real PII anywhere in the pen-test environment.
- Data certification signed by the founder: `docs/ops/PENTEST_DATA_CERTIFICATION.md` (will be created before engagement).

---

## 7. Read-only database access

The vendor gets a read-only PostgreSQL user to inspect the schema and verify findings:

```
Host:     <provided in engagement packet>
Port:     5432
Database: haastores_pentest
User:     pentest_reader
Password: <provided in engagement packet>
```

**Connection string:** `postgres://pentest_reader:<password>@<host>:5432/haastores_pentest`

**Permissions granted:**

- `CONNECT` on database
- `USAGE` on schema `public`
- `SELECT` on all tables + sequences (current + future)

**Permissions NOT granted:**

- No `INSERT` / `UPDATE` / `DELETE` — vendor cannot write.
- No `CREATE` / `DROP` / `ALTER` — vendor cannot modify schema.
- No access to other schemas (e.g. `pg_catalog` filtered).
- No access to other databases (e.g. `haastores` production).

**Suggested queries for the vendor:**

```sql
-- List all tables
\dt public.*

-- Inspect a specific table schema
\d+ public.marketplace_orders

-- Sample a few rows
SELECT * FROM public.marketplace_orders LIMIT 5;

-- Check audit log depth (T5)
SELECT action, COUNT(*) FROM public.audit_logs
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY action ORDER BY count DESC;
```

---

## 8. Log access (Sentry)

The vendor gets read-only access to a dedicated Sentry project `haa-pen-test`.

- **Sentry URL:** `<provided in engagement packet>` (separate Sentry org, dedicated project).
- **Access role:** Member (read-only, scoped to that project only).
- **Event volume:** ~5K events/day is enough for the engagement; upgrade if needed.
- **Retention:** 30 days.

**What the vendor can see:**

- All unhandled errors during the engagement (with stack trace, request URL, headers, body).
- Performance traces (transaction-level, 100% sample rate during engagement).
- User feedback (none in pen-test env).

**What the vendor cannot see:**

- Other Sentry projects (production, staging).
- Source maps (deliberately not uploaded to pen-test project — vendor is black-box).
- Release artifacts.

---

## 9. Known defenses (do not waste cycles re-discovering)

The vendor can skip testing the following — they are already implemented and verified:

| Defense                                | Where                                                                                                       | Verified by                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **SQL injection**                      | Drizzle ORM with parameterized queries throughout                                                           | Source code audit + 2620 unit/integration tests |
| **XSS in React**                       | React's auto-escaping + CSP headers (`apps/api/src/middleware/security-headers.ts`)                         | Unit tests + CSP report-uri                     |
| **CSRF**                               | `csrfOrigin()` middleware (mounted globally at `apps/api/src/index.ts:92`)                                  | `tests/csrf-origin-marketplace.test.ts`         |
| **Rate limiting — auth**               | `strictRateLimit` (10/10min in prod) on `/auth/login`, `/auth/register`, `/admin/login`, `/admin/*`         | `tests/marketplace-p1-9-rate-limit.test.ts`     |
| **Rate limiting — marketplace orders** | `marketplaceOrderRateLimit` (30/10min in prod) on `POST /marketplace/orders`                                | `tests/marketplace-p1-9-rate-limit.test.ts`     |
| **Rate limiting — browse**             | `storefrontBrowseRateLimit` (600/10min in prod) on `/s/*` and `/marketplace/*`                              | Same test file                                  |
| **Tenant isolation**                   | `store-tenant-cache` middleware resolves `Host` / `X-Store-Id` per request; every query scoped by `storeId` | Code review + integration tests                 |
| **P0-3 order tracking**                | `accessToken` (UUID) replaces phone-based lookup                                                            | `tests/marketplace-p1-2-p1-3.test.ts`           |
| **P0-4 demo isolation**                | `shouldShowInMarketplace()` helper gates demo store visibility                                              | `tests/marketplace-demo.test.ts`                |
| **P0-5 admin audit log**               | Every `PATCH /admin/marketplace/products/:id/{review,feature}` writes `audit_logs`                          | `tests/audit-depth.test.ts`                     |
| **P0-2 category blocklist**            | `prohibited_in_marketplace` filter applied to all marketplace queries                                       | `tests/category-blocklist.test.ts`              |
| **P0-1 SFDA workflow**                 | `requires_sfda` validation on publish + `sfda_verified_at` admin review                                     | `tests/sfda-workflow.test.ts`                   |
| **P1-2 admin permission granularity**  | `requireAdminPermission('marketplace.review')` + `requireAdminPermission('marketplace.feature')`            | `tests/marketplace-p1-2-p1-3.test.ts`           |
| **P1-9 order rate limit**              | Already covered above                                                                                       | Same                                            |
| **CORS**                               | `env.CORS_ORIGINS` allow-list                                                                               | Code review                                     |
| **HSTS**                               | `Strict-Transport-Security` header (1 year, includeSubDomains)                                              | `apps/api/src/middleware/security-headers.ts`   |
| **Body size limit**                    | 5MB max (`apps/api/src/index.ts:135-141`)                                                                   | Code review                                     |
| **Webhook idempotency**                | `webhook-dedup` middleware dedupes by `X-Webhook-Id` header                                                 | `apps/api/src/middleware/webhook-dedup.ts`      |

**What the vendor SHOULD focus time on:**

1. **Business logic flaws** — wrong amount calculation, status machine bypass, race conditions.
2. **Cross-tenant data leakage** — try accessing tenant A's resources from tenant B.
3. **IDOR** — modify IDs in requests and verify access control.
4. **Pagination edge cases** — `?page=0`, `?page=-1`, `?page=999999`, `?limit=0`, `?limit=999999`.
5. **Race conditions** — concurrent order creation, double-spend in wallet.
6. **XSS in non-React contexts** — server-rendered emails, PDF generation, error pages.
7. **Error message info disclosure** — what do 500 errors reveal (stack traces, query plans, internal paths)?
8. **Session management** — token expiry, token version, concurrent sessions.
9. **Account lockout bypass** — can the vendor lock out legitimate users?
10. **Webhook signature validation** — replay attacks, signature stripping.
11. **API key scoping** — does a `read:products` key work on `write:products`?
12. **Upload validation** — can the vendor upload a `.php` file, an executable, a polyglot file?
13. **Storage guard** — can the vendor access another tenant's uploads via direct URL?
14. **CORS preflight** — does the preflight return more origins than allowed?

---

## 10. Engagement rules + scope boundaries

**Allowed:**

- Black-box testing of all in-scope endpoints.
- Read-only DB inspection.
- Read-only Sentry access.
- Modifying the pen-test environment (creating accounts, products, orders) via the public API as a normal user would.
- Stress testing within reason (test the rate limits; do not try to take the environment down).
- Social engineering of TEST ACCOUNTS only (the founder may provide a test phone number for SMS testing).

**Not allowed:**

- Testing production (`haastores.sa`, `api.haastores.sa`, `merchants.haastores.sa`, `admin.haastores.sa`).
- Testing third-party services (Tabby, Tamara, Moyasar, Geidea, OTO, SMSA, SFDA APIs).
- DDoS / volumetric testing.
- Phishing of the founder, employees, or merchants.
- Modifying the DB schema or data outside of normal application flows.
- Exfiltrating data from the pen-test environment to anywhere other than the engagement deliverables.
- Sharing the test accounts or DB credentials with anyone outside the engagement team.
- Retaining test account credentials after the engagement ends.

**Critical findings — emergency protocol:**
If the vendor finds a Critical issue (data exposure, auth bypass, RCE):

1. Vendor pings `#pentest-<vendor>` immediately.
2. Engineering triages within 1 hour.
3. If confirmed Critical → engineering fixes within 24h OR pauses the engagement.
4. Vendor does NOT publicly disclose the finding until the founder approves the disclosure timeline.

**Safe harbor:**
The founder provides a "safe harbor" letter in the engagement packet stating:

- The vendor's testing is authorized and welcome.
- The vendor will not be subject to legal action for in-scope testing that follows the rules above.
- The founder agrees to not pursue DMCA / CFAA / equivalent claims for the in-scope activity.

---

## 11. Deliverables

At the end of the engagement, the vendor delivers:

1. **Pen-test report** (CREST template) — executive summary + detailed findings + remediation recommendations.
2. **Re-test report** (if contract includes re-test) — verification of fix effectiveness.
3. **Daily standup notes** (the founder / engineering may request these).
4. **Final briefing call** (1 hour) — walkthrough of findings.

Report format:

- PDF + Word + Markdown.
- CVSS 3.1 scores.
- Reproduction steps for every finding.
- Suggested fix for every finding.

**Translation:** Findings labels + remediation suggestions in **English** (vendor's default) + the founder's team will translate to Arabic for the legal/compliance handoff.

---

## 12. Timeline + cost (informational)

| Phase                    | Duration      | Notes                                                 |
| ------------------------ | ------------- | ----------------------------------------------------- |
| Vendor outreach + NDA    | 1 week        | Founder responsibility                                |
| Pre-engagement scoping   | 1-2 days      | Engineering + founder + vendor                        |
| Environment provisioning | 1-2 days      | Engineering (runbook: `PHASE_5_DEPLOY_RUNBOOK.md`)    |
| Active pen-test          | 1-2 weeks     | Vendor                                                |
| Report delivery          | 1 week        | Vendor                                                |
| Triage + fixes           | 2-5 days      | Engineering (template: `PEN_TEST_TRIAGE_TEMPLATE.md`) |
| Re-test (if in scope)    | 1-3 days      | Vendor                                                |
| **Total calendar**       | **3-5 weeks** |                                                       |

**Cost estimate (USD):** $8,000-15,000 (per `PEN_TEST_VENDOR_SHORTLIST.md`).

---

## 13. References

- `docs/ops/PHASE_5_DEPLOY_RUNBOOK.md` — environment provisioning
- `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md` — vendor candidates
- `docs/ops/PEN_TEST_TRIAGE_TEMPLATE.md` — post-report triage
- `docs/ops/MARKETPLACE_HARDENING_PLAN.md` §8 — overall Phase 6 plan
- `docs/ops/ASV_SCAN_TARGET.md` — quarterly ASV (different cadence)
- `docs/ops/INCIDENT_RESPONSE.md` — incident handling
- `docs/security/SECURITY_BASELINE.md` — security baseline
- `docs/architecture/ARCHITECTURE.md` — high-level architecture
- `docs/system-map/SYSTEM_MAP.md` — file/folder map for the codebase
- `apps/api/src/index.ts` — middleware order (security-critical to understand)
- `apps/api/src/middleware/csrf-origin.ts` — CSRF defense details
- `apps/api/src/middleware/rate-limiter.ts` — rate limit logic
- `packages/shared/src/permissions.ts` — full permission list
- `packages/auth-core/src/permission-service.ts` — role → permission mapping

---

**Last Updated:** 2026-06-18 (TASK-0044 §A3 — Session R engineering prep)
**Owner Action:** Send this brief to the chosen vendor AFTER NDA + contract signed
**Engineering Effort:** 0.5 hour prep (this doc) + 1-2 days provisioning (separate runbook)
**Cost Estimate:** Vendor cost (separate, see shortlist)
