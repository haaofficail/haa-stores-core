# Alert Rules

> Defines severity levels, incident criteria, and escalation paths.

---

## Severity Levels

| Level | Meaning | Response |
|-------|---------|----------|
| **P0** | Critical — system unusable | Immediate incident, stop all other work |
| **P1** | High — major feature broken | Create task, investigate within 24h |
| **P2** | Medium — partial degradation | Fix in normal workflow |
| **P3** | Low — cosmetic or info | Log and monitor |
| **P4** | Debt — technical debt | Track for future |

---

## P0 Alerts

### API Down
- **Check:** API health endpoint fails
- **Impact:** All apps unusable
- **Action:** Stop all work, investigate server, restart API
- **Incident:** Required

### Storefront Down
- **Check:** Storefront URL returns 500
- **Impact:** Customers cannot shop
- **Action:** Stop all work, check theme, API connectivity
- **Incident:** Required

### Dashboard Down
- **Check:** Merchant dashboard URL returns 500
- **Impact:** Merchants cannot manage stores
- **Action:** Stop all work, check API, investigate
- **Incident:** Required

### Checkout Broken Globally
- **Check:** Checkout flow fails
- **Impact:** No revenue
- **Action:** Block deployment, fix immediately
- **Incident:** Required

### DB Unavailable
- **Check:** Database connection fails
- **Impact:** All data features broken
- **Action:** Restart database, check connection config
- **Incident:** Required

### Permission Bypass
- **Check:** Security audit detects unauthorized access
- **Impact:** Data leakage, compliance violation
- **Action:** Fix immediately, audit all affected data
- **Incident:** Required

### Data Leakage
- **Check:** Cross-store data visible
- **Impact:** Compliance, trust
- **Action:** Fix immediately, audit scope
- **Incident:** Required

---

## P1 Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| Payment provider failing | Payment API returns errors | Create task, contact provider |
| Shipping label failure | Label generation errors | Create task, check carrier API |
| Active theme crash | Theme fails to load | Create task, revert if critical |
| Repeated 500s | >3 occurrences of same 500 | Create task, investigate root cause |
| Webhook/Worker failure | Queue jobs failing | Create task, check worker logs |
| Order state failure | Invalid state transition | Create task, check state machine |

---

## Rules

| Condition | Action |
|-----------|--------|
| P0 detected | Create **Incident** immediately in INCIDENTS.md |
| P1 repeated ≥3 times | Create **Task** in TASK_TRACKER |
| Fingerprint repeated ≥3 times | Open **Root Cause Analysis** in ISSUE_KNOWLEDGE_BASE |
| Unknown status | Default to P2, escalate if unable to diagnose |

## Local Alert Emission

`pnpm ops:alerts` reads the same local NDJSON event sources as `pnpm ops:errors`
and writes new local alert candidates to `storage/monitoring-alerts.ndjson`.
It emits:

- `incident` alerts for active P0 events.
- `task` alerts for repeated P1 error codes.
- `root-cause-analysis` alerts for repeated fingerprints.

Each alert carries a stable `dedupeKey` and safe evidence metadata only
(`eventId`, timestamp, severity, error code, app, route/target, fingerprint,
source kind). Raw event messages are intentionally not copied into alert
evidence. External delivery through Sentry, uptime monitors, Slack, email, or
webhooks remains owner/environment-gated and requires approved secrets.
