# Monitoring Playbook

> How we monitor system health and detect problems before merchants report them.

---

## Why Monitor Before the Merchant Reports?

- Merchants lose trust when they discover issues before we do
- Early detection reduces mean time to resolution (MTTR)
- Monitoring data helps identify root causes
- Trending data reveals degradation before complete failure

## Types of Monitoring

| Type | Description | Tool |
|------|-------------|------|
| **Health Checks** | Verify project structure, app configuration, and runtime availability | `pnpm ops:health` |
| **Synthetic Checks** | Simulate user requests to verify endpoints respond correctly | `pnpm ops:synthetic` |
| **Error Analysis** | Analyze recorded errors for patterns, severity, and frequency | `pnpm ops:errors` |
| **Report** | Generate a comprehensive monitoring report | `pnpm ops:monitor:report` |
| **Tail** | View recent events in real-time | `pnpm ops:monitor:tail` |

## When to Use Each Command

| Situation | Command |
|-----------|---------|
| Before starting development | `pnpm ops:monitor` |
| After deployment or config change | `pnpm ops:monitor` |
| Investigating a merchant report | `pnpm ops:monitor:report` then `pnpm ops:monitor:tail` |
| Routine check | `pnpm ops:health` |
| After fixing an issue | `pnpm ops:monitor` to verify |

## Alert → Task → Incident Flow

1. Monitoring detects an anomaly
2. If **P0** → immediately create Incident
3. If **P1 repeated 3+ times** → create Task
4. If **fingerprint repeated 3+ times** → open Root Cause Analysis
5. After resolution → re-run monitoring, update documentation

## Rules

- No fix without root cause identification
- No closure without re-running `pnpm ops:monitor`
- Every P0 must have an Incident record
- Every repeated P1 must have a Task
- Every repeated fingerprint must have a Root Cause Analysis
