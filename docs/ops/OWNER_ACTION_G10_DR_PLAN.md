# G10 — Disaster Recovery Plan + Tabletop Exercise

> **Owner action required.** G10 of TASK-0038. **Engineering-led with owner sign-off**.

## What is DR (Disaster Recovery)?

**DR plan** = documented procedures to recover critical systems + data after a major disruption (outage, cyberattack, natural disaster, data corruption).

**Tabletop exercise** = scheduled simulation where team walks through DR scenarios to validate the plan.

For Haa: required by NCA (National Cybersecurity Authority) for SaaS providers serving KSA customers.

## Prerequisites

- [ ] **Production deployment** of Haa
- [ ] **Database backups** running (daily full + hourly incremental)
- [ ] **Monitoring + alerting** in place
- [ ] **Incident response runbook** (`docs/INCIDENT_RESPONSE.md`)

## DR Plan structure (2-3 days to document)

### §1 Critical systems + data

| System | Tier | RTO | RPO |
|--------|------|-----|-----|
| **Database (PostgreSQL)** | Tier 1 (critical) | 1 hour | 15 minutes |
| **API server** | Tier 2 (essential) | 4 hours | N/A (stateless) |
| **Storefront** | Tier 2 | 4 hours | N/A (stateless) |
| **Merchant dashboard** | Tier 2 | 4 hours | N/A (stateless) |
| **Static assets (logos, images)** | Tier 3 | 24 hours | 24 hours |

**RTO** (Recovery Time Objective) = max downtime before recovery
**RPO** (Recovery Point Objective) = max data loss acceptable

### §2 Backup strategy

- **Database backups:**
  - Daily full backup → S3-compatible storage (e.g., Backblaze B2, Wasabi)
  - Hourly incremental → same storage
  - Retention: 30 days daily, 7 years for compliance audit
  - Encryption: AES-256 at rest, TLS in transit
  - Tested restore: quarterly (verified in tabletop exercise)

- **Application state:**
  - Stateless services (API, storefront) — no backup needed
  - User uploads (logos, images) → replicated across 2 regions
  - Configuration → version-controlled (git)

- **Secrets:**
  - API keys, DB credentials → secrets manager (AWS Secrets Manager, Vault)
  - Encrypted at rest + TLS in transit
  - Access logging + alerts

### §3 DR scenarios + runbooks

**Scenario A: Single database corruption (1% probability)**
- Detection: alerts on backup failure or restore check
- Runbook:
  1. Stop writes to corrupted DB
  2. Promote last backup to primary (5-15 min)
  3. Verify data integrity (compare counts to expected)
  4. Resume writes
- Recovery time: 30-60 minutes
- Data loss: ≤15 minutes (last incremental backup)

**Scenario B: Region-wide outage (0.1% probability)**
- Detection: monitoring alerts (5xx spike + health check failures)
- Runbook:
  1. Spin up DR region (read replica → primary, 30 min)
  2. Update DNS to point to DR region (5-15 min propagation)
  3. Verify health checks pass
  4. Notify merchants + customers of brief disruption
- Recovery time: 1-2 hours
- Data loss: 0 (synchronous replica)

**Scenario C: Data breach / ransomware (0.05% probability)**
- Detection: anomaly detection (unusual write patterns)
- Runbook:
  1. Isolate affected systems (15 min)
  2. Activate incident response team
  3. Notify SDAIA within 72 hours (PDPL Article 17)
  4. Notify affected data subjects within 30 days
  5. Restore from clean backups (4-8 hours)
  6. Post-mortem + improve controls
- Recovery time: 4-8 hours
- Data loss: depends on last clean backup

**Scenario D: Accidental data deletion (e.g., merchant deletes catalog)**
- Detection: support ticket or anomaly detection
- Runbook:
  1. Identify scope + time of deletion
  2. Restore from point-in-time backup (e.g., 6 hours before deletion)
  3. Merge restored data with current state
  4. Notify affected merchant
- Recovery time: 2-4 hours
- Data loss: limited to most recent backup window

### §4 Communication plan

- **Internal:** Slack #incident-YYYY-MM-DD
- **Merchants:** Email + Slack #merchants
- **Customers:** Email (for major incidents only)
- **Regulators:** SDAIA within 72h (PDPL), MoCI/SAMA/NCA as applicable
- **Public:** Status page (status.haastores.sa — to be built)

### §5 Roles + responsibilities

| Role | Person | Contact |
|------|--------|---------|
| **DR Coordinator** | Engineering lead | eng@haastores.sa |
| **Decision maker** | Founder (you) | you@haastores.sa |
| **Communications** | Customer success | support@haastores.sa |
| **Legal / compliance** | DPO + your lawyer | dpo@haastores.sa |

## Tabletop exercise (4 hours, once per year)

### Schedule

- **Frequency:** Annually + after any major incident
- **Duration:** 4 hours (split: 1h prep + 3h scenario walkthrough)
- **Attendees:** Engineering lead, founder, DPO, customer success
- **Facilitator:** External consultant (SAR 5-10k) or internal

### Scenario flow (3 hours)

**0:00 - 0:15 (15 min):** Scenario briefing
- "A merchant reports they can't access their dashboard. Database is slow."
- "Alert: backup failed last night."

**0:15 - 0:45 (30 min):** Initial response
- Walk through alert escalation
- Verify backup status
- Identify root cause

**0:45 - 1:30 (45 min):** DR execution
- Run the relevant runbook
- Time the execution
- Identify blockers

**1:30 - 2:30 (60 min):** Decision points
- "Should we restore from yesterday's backup?"
- "Should we notify customers?"
- "Should we engage the pen-test firm for forensics?"

**2:30 - 3:00 (30 min):** Post-mortem
- Document lessons learned
- Update DR plan with gaps
- Assign action items

### Output

- DR plan updated with gaps identified
- Action items assigned with deadlines
- Tabletop exercise report filed (NCA audit evidence)

## Cost

- **DR documentation:** 2-3 days engineering effort (~$600-900 in dev cost)
- **Backup infrastructure:** $50-200/month (Backblaze B2 / Wasabi)
- **Tabletop facilitator (external):** SAR 5-10k (one-time per year)
- **DR infrastructure (multi-region):** $200-500/month additional

## Timeline

- **DR documentation:** 2-3 days
- **First tabletop exercise:** 4 hours
- **Ongoing:** annual tabletop + ad-hoc after incidents

## Engineering integration (4-6 hours)

- Document DR plan in `docs/ops/INCIDENT_RESPONSE.md` (already exists, expand with DR scenarios)
- Configure automated backup verification (daily restore test)
- Set up monitoring for backup failures
- Document role assignments + contact info

## References

- NCA DR guidelines: https://nca.gov.sa/
- AWS DR patterns: https://aws.amazon.com/disaster-recovery/
- PDPL Article 17 (data breach response)

---

**Last Updated:** 2026-06-17 (TASK-0038 G10 brief)
**Owner Action:** Schedule first tabletop exercise
**Engineering Effort:** 4-6 hours setup + annual 4-hour exercise
