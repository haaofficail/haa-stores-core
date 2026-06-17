# Beta Launch Monitoring Guide — TASK-0045 §8.4

> **Owner + engineering operating doc.** Use during the 30-day
> soft-launch window.
>
> **Cross-references:**
> - `docs/ops/BETA_LAUNCH_CHECKLIST.md` — main launch doc
> - `docs/ops/INCIDENT_RESPONSE.md` — incident handling
> - `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md` — pen-test vendor brief
> - `pnpm ops:monitor` — operational monitoring script

---

## 1. Real-time monitoring dashboard

### 1.1 Recommended tools (free / low-cost)

| Tool | Cost | Use case |
|------|------|----------|
| **Haa's built-in ops:monitor** | Free (already deployed) | App health + error analysis |
| **Uptime monitoring** (UptimeRobot) | Free tier | HTTP uptime from 5 global regions |
| **Logs aggregation** (CloudWatch / betterstack) | ~$20/mo for 30-day retention | Centralized logs |
| **Error tracking** (Sentry) | Free tier | Frontend + backend errors with context |

### 1.2 KPIs to track during soft-launch

#### Critical (alert if breached)

| KPI | Target | Alert threshold | Recovery action |
|-----|--------|-----------------|------------------|
| 5xx error rate | <0.5% | >1% for 5 min | Rollback trigger |
| API p95 latency | <500ms | >1000ms for 10 min | Investigate slow query |
| Payment success rate | >98% | <95% for 15 min | Check gateway status |
| Order creation rate | baseline | 0 for 30 min | Merchant outreach |
| Customer support tickets | <5/day | >15/day | Investigate common issue |

#### Important (daily review)

| KPI | Target | Action if below |
|-----|--------|------------------|
| Daily active merchants | ≥8 of 10-20 | Outreach to inactive merchants |
| Daily orders | ≥10 | Marketing push |
| Average order value | ≥SAR 200 | Check product mix |
| Cart abandonment rate | <70% | Investigate checkout UX |
| Customer NPS | ≥40 | Survey → action items |

#### Tracking (weekly review)

| KPI | Target | Review frequency |
|-----|--------|------------------|
| Merchant churn | <10%/month | Weekly |
| Refund rate | <3% | Weekly |
| Chargeback rate | <1% | Weekly |
| Catalog growth | +20% weekly | Weekly |

---

## 2. Monitoring scripts

### 2.1 Haa built-in monitoring

```bash
# Run every 15 minutes (cron)
pnpm ops:monitor
# Output: health + synthetic + error analysis
# Markdown report:
pnpm ops:monitor:report
# Tail recent events:
pnpm ops:monitor:tail
```

### 2.2 Pre-pen-test smoke (run before any deploy)

```bash
pnpm preflight:pentest
# Exit 0 = safe to deploy
# Exit 1 = investigate failures before deploying
```

### 2.3 Synthetic monitoring (cron)

Set up external monitoring to hit these endpoints every 5 minutes:

| Endpoint | Expected status |
|----------|-----------------|
| `GET /health` | 200 OK |
| `GET /marketplace/products?limit=5` | 200 OK + non-empty |
| `GET /marketplace/sellers` | 200 OK + non-empty |
| `GET /s/haa-demo` | 200 OK (storefront SPA) |
| `POST /auth/login` (with rate-limited payload) | 401 (test rate limit) |

### 2.4 Log-based monitoring

Add to `apps/api/src/index.ts` or via sidecar:

```typescript
// Log every order creation with structured fields
logger.info('marketplace.order.created', {
  orderId, storeId, customerId, amount, itemsCount,
  ip: c.req.header('x-forwarded-for'),
});
```

These structured logs enable:
- Daily GMV rollup (sum of order amounts by day)
- Top-selling categories (group by categoryName)
- Merchant activity (group by storeId)
- Geographic distribution (parse IP for city)
- Peak hour analysis (group by hour)

---

## 3. Incident response playbook

### 3.1 Severity classification

| Severity | Definition | Response time | Examples |
|----------|------------|----------------|----------|
| **P0** | Production down + data loss risk | <15 min | 5xx >50%, payment failure, data breach |
| **P1** | Major feature broken | <1 hour | Order creation failing, login broken |
| **P2** | Minor feature broken | <4 hours | Admin can't review, search broken |
| **P3** | Cosmetic / enhancement | Next sprint | UI glitch, slow load on one page |

### 3.2 P0 / P1 response procedure

1. **Acknowledge** within SLA window.
2. **Open Slack incident channel** `#incident-YYYY-MM-DD-brief-description`.
3. **Page on-call engineer** (rotation schedule).
4. **Assess blast radius** — how many users affected?
5. **Decide rollback vs fix-forward**:
   - **Rollback** if: fix-forward ETA >2 hours OR data integrity risk.
   - **Fix-forward** if: clear root cause + fix <1 hour + safe to deploy.
6. **Communicate** to merchants + customers (use templates in BETA_LAUNCH_CHECKLIST §3.4).
7. **Post-mortem within 48h** (blameless, root cause, action items).

### 3.3 Data breach response (PDPL Article 17)

If user data is exposed:

1. **Contain** within 1 hour (rollback, disable affected endpoints).
2. **Notify SDAIA** (Saudi Data & AI Authority) within 72 hours.
3. **Notify affected data subjects** within 30 days (per PDPL).
4. **Document** the breach + response (required for audit).
5. **Improve** the affected controls (root cause analysis).

---

## 4. Daily + weekly ops rituals

### 4.1 Daily standup (15 min) — during soft-launch

| Time | Owner | Topic |
|------|-------|-------|
| 09:00 SAST | Engineering | Yesterday's metrics review |
| 09:05 | Engineering | Top 3 open issues + mitigation |
| 09:10 | You (founder) | Decisions needed from you |
| 09:13 | Cohort merchant rep | Merchant feedback summary |
| 09:15 | All | Wrap + today's plan |

### 4.2 Weekly review (60 min) — every Friday

| Time | Topic | Owner |
|------|-------|-------|
| 0:00 | Metrics dashboard walkthrough | Engineering |
| 0:15 | Cohort merchant health (top + bottom performers) | Cohort lead |
| 0:30 | Top 3 customer pain points | Customer support |
| 0:45 | Top 3 merchant pain points | Cohort lead |
| 1:00 | Decisions: continue / adjust / pause | You (founder) |

### 4.3 Monthly review (2 hours) — end of month 1

| Time | Topic | Owner |
|------|-------|-------|
| 0:00 | Full metrics review vs success criteria | Engineering |
| 0:30 | Financial review (GMV, commission, costs) | You + Finance |
| 1:00 | Cohort feedback session (top + bottom merchants) | Cohort lead |
| 1:30 | Roadmap review for month 2 (general availability) | You |

---

## 5. Communication channels

| Channel | Audience | Cadence | Tool |
|---------|----------|---------|------|
| `#beta-merchants` | Cohort merchants | Daily standup + ad-hoc | Slack |
| `#beta-engineering` | Engineering team | Real-time | Slack |
| `engineering@haastores.sa` | Internal team | Daily digest | Email |
| `merchants@haastores.sa` | All merchants | Weekly digest | Email |
| `customers@haastores.sa` | Customers | Critical only | Email |
| `press@haastores.sa` | Press contacts | Major announcements | Email |
| `dpo@haastores.sa` | DPO | PDPL complaints | Email |

---

## 6. Decision logs

Every material decision during soft-launch should be logged with:

```yaml
decision:
  id: DEC-YYYY-MM-DD-NNN
  date: 2026-MM-DD
  topic: "Brief topic"
  context: "Why this decision was needed"
  options_considered:
    - "Option A: ..."
    - "Option B: ..."
  decision: "What we chose"
  decision_maker: "Your name"
  implementation_status: "pending | in-progress | done"
  expected_review_date: "2026-MM-DD"
```

**Examples during soft-launch:**
- "Approve merchant X for cohort despite incomplete KYC (Y reason)"
- "Delay general availability by 2 weeks due to NPS <30"
- "Disable product category Z after customer complaints about quality"
- "Refund all orders from merchant X due to systematic issue"

---

## 7. Metrics dashboard URL structure (recommended)

If using a dashboard tool (Grafana, Datadog, etc.):

```
https://dashboard.haastores.sa/d/beta-launch/
├── Overview
│   ├── Total orders (today, week, month)
│   ├── GMV (today, week, month)
│   ├── Active merchants
│   ├── Error rate (5xx)
│   └── API p95 latency
├── Merchants
│   ├── Cohort activity (top 10)
│   ├── Cohort churn rate
│   ├── Onboarding funnel
│   └── KYC status distribution
├── Customers
│   ├── Orders per customer
│   ├── Refund rate by category
│   ├── NPS trend
│   └── Support tickets (by topic)
├── Marketplace
│   ├── Browse → cart → checkout funnel
│   ├── Search performance
│   ├── Category distribution
│   └── Featured products CTR
└── Operations
    ├── Error rate by route
    ├── Top 5 errors (last 24h)
    ├── Payment gateway health
    └── Database query performance
```

---

## 8. References

- `docs/ops/BETA_LAUNCH_CHECKLIST.md` — main launch doc (read first)
- `docs/ops/INCIDENT_RESPONSE.md` — incident handling playbook
- `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md` — pen-test vendor brief
- `docs/ops/TASK_TRACKER.md` TASK-0038 (10 owner action items)
- `pnpm ops:monitor` — built-in monitoring
- `pnpm preflight:pentest` — pre-deploy smoke

---

**Last Updated:** 2026-06-17 (TASK-0045 §8.4 monitoring prep)
**Owner Action:** Daily standup attendance during soft-launch (15 min)
**Engineering Effort:** Daily monitoring + weekly review automation
