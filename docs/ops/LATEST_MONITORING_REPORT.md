# Latest Monitoring Report

- **Generated At:** 2026-06-13T02:25:11.068Z
- **Overall Status:** Healthy
- **Period Events Analyzed:** 25

---

## P0 Alerts

*None*

## P1 Alerts

*None*

## Health Summary

| Metric | Count |
|--------|------:|
| Pass | 25 |
| Warning | 0 |
| Fail | 0 |
| Total | 25 |

## Synthetic Checks Summary

| Target | Status |
|--------|--------|


## Top Repeated Error Codes

| Code | Count |
|------|------:|


## Top Affected Apps

| App | Events |
|-----|-------:|
| api | 5 |
| merchant-dashboard | 5 |
| storefront | 5 |
| admin-dashboard | 4 |

## Top Affected Routes / Targets

| Route | Events |
|-------|-------:|
| package.json exists | 1 |
| pnpm-workspace.yaml exists | 1 |
| apps directory exists | 1 |
| packages directory exists | 1 |
| AGENTS.md exists | 1 |

## Suspected Root Causes

*None identified*

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
