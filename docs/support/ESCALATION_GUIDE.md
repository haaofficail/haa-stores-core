# Escalation Guide

> Clear criteria and path for escalating issues.

---

## Escalation Criteria

### P0 — Immediate Escalation

Any of:
- Storefront completely down
- Merchant dashboard completely down
- API completely down
- Database unavailable
- Security breach (permission bypass, data leakage)
- Checkout completely broken

**Action:** Create incident, notify all developers, stop all other work.

### P1 — Urgent Escalation

Any of:
- Payment provider failing for > 15 minutes
- Shipping label generation failing
- Repeated 500 errors (>3 in 1 hour)
- Theme completely broken for all stores
- Webhook/worker queue backing up

**Action:** Create task, assign to developer lead, investigate within 4 hours.

### P2 — Normal Escalation

Any of:
- Single feature degraded but workaround exists
- Non-critical UI issue
- Performance degradation
- Minor integration issue

**Action:** Log in TASK_TRACKER, fix in normal workflow.

### P3 / P4 — Low Priority

Any of:
- Cosmetic issues
- Missing documentation
- Technical debt
- Feature requests

**Action:** Log for triage in next planning session.

---

## Escalation Path

```
Merchant → Support Engineer
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
    Known Issue         Unknown Issue
        │                    │
        ▼                    ▼
  Apply fix from       Log as support event
  ERROR_CATALOG        in storage/support-error-events.ndjson
        │                    │
        ▼                    ▼
  Verify with          If P0/P1 → escalate to developer
  pnpm ops:monitor     If P2+ → log TASK and continue
```

## When to Wake Developer

- P0 at any time
- P1 during business hours only
- P2+ during next working day

## Handoff Template

When escalating to a developer, include:

```
Severity: P0/P1/P2
App: api/storefront/dashboard/other
Error Code: from ERROR_CATALOG or new
Fingerprint: from event
Logs: relevant log lines
Steps to Reproduce: if known
Merchant Impact: brief description
Already Tried: what support attempted
```
