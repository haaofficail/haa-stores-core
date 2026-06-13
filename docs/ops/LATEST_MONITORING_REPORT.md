# Latest Monitoring Report

- **Generated At:** 2026-06-13T06:45:21.130Z
- **Overall Status:** Healthy
- **Period Events Analyzed:** 617

---

## P0 Alerts

*None*

## P1 Alerts

*None*

## Health Summary

| Metric | Count |
|--------|------:|
| Pass | 616 |
| Warning | 0 |
| Fail | 0 |
| Total | 617 |

## Synthetic Checks Summary

| Target | Status |
|--------|--------|
| api-health | pass |
| dashboard-root | pass |
| storefront-home | pass |
| api-health | pass |
| dashboard-root | pass |
| storefront-home | pass |
| api-health | pass |
| dashboard-root | pass |
| storefront-home | pass |
| api-health | pass |

## Top Repeated Error Codes

| Code | Count |
|------|------:|
| ORDER-001 | 1 |

## Top Affected Apps

| App | Events |
|-----|-------:|
| api | 132 |
| merchant-dashboard | 132 |
| storefront | 132 |
| admin-dashboard | 88 |
| worker | 1 |

## Top Affected Routes / Targets

| Route | Events |
|-------|-------:|
| package.json exists | 22 |
| pnpm-workspace.yaml exists | 22 |
| apps directory exists | 22 |
| packages directory exists | 22 |
| AGENTS.md exists | 22 |

## Suspected Root Causes

- Fingerprint `ORDER-001::system::/dashboard/webhooks::simulated_ORDER-001_error` repeated 1 times

## Recommended Tasks

*None*

## Recommended Incidents

*None*

## Next Actions

1. Review warnings and address P1 items
2. Run `pnpm ops:monitor` after any fix
3. Update ISSUE_KNOWLEDGE_BASE for repeated fingerprints
4. Update INCIDENTS.md for any new incidents

## Limitations

- This report reflects only events recorded via monitoring scripts
- Dev servers must be running for HTTP-level checks
- No real user traffic is being monitored (local-only)
- Error analysis depends on events being recorded to ndjson files
