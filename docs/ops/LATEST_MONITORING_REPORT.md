# Latest Monitoring Report

- **Generated At:** 2026-07-02T15:12:38.199Z
- **Overall Status:** Healthy
- **Active Window:** last 24 hour(s)
- **Total Events Available:** 2
- **Window Events Analyzed:** 2
- **Actionable Events:** 0
- **Historical Events Ignored for Recommendations:** 0
- **Passive Pass/Warn Events Ignored for Recommendations:** 2

---

## Active P0 Alerts

_None_

## Active P1 Alerts

_None_

## Active Window Health Summary

| Metric          | Count |
| --------------- | ----: |
| Pass            |     1 |
| Warning         |     0 |
| Fail            |     0 |
| Current checks  |     1 |
| Total in window |     2 |

## Synthetic Checks Summary

| Target     | Status |
| ---------- | ------ |
| api-health | pass   |

## Top Active Error Codes

| Code | Count |
| ---- | ----: |
| None |     0 |

## Top Active Affected Apps

| App  | Events |
| ---- | -----: |
| None |      0 |

## Top Active Routes / Targets

| Route | Events |
| ----- | -----: |
| None  |      0 |

## Active Suspected Root Causes

_None identified_

## Recommended Tasks

_None_

## Recommended Incidents

_None_

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
