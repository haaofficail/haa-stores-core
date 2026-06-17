# Incident Response Runbook — هاء متاجر (Haa Stores)

> **Last updated:** 2026-06-17
> **Owner:** Haa Stores Platform Team
> **Scope:** Step-by-step incident response procedure for production incidents
> **Related:** `docs/SAUDI_COMPLIANCE_CHECKLIST.md` §8.1 (NCA breach notification), §2.5 (PDPL breach)

---

## 1. Scope & Severity Definitions

### 1.1 What is an "incident"?

An incident is any **unexpected event** that:

- Degrades or disrupts the platform for users.
- Compromises the security or integrity of data.
- Violates a regulatory obligation.
- Risks financial loss (to us or to users).

### 1.2 Severity Levels

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **P0** | Critical — data loss, security breach, complete outage | **Immediate** (page on-call) | • DB destroyed<br>• All users locked out<br>• Payment data exposed<br>• Active attack in progress |
| **P1** | High — major feature broken, >10% users affected | **Within 1 hour** | • Storefront down<br>• Payments failing<br>• 3DS broken (no fallback) |
| **P2** | Medium — single feature broken, workaround exists | **Next business day** | • Email notifications delayed<br>• One payment provider down (others work)<br>• Slow performance |
| **P3** | Low — minor bug, no user impact | **Within 1 week** | • Cosmetic UI bug<br>• Edge case error in logs |

---

## 2. Incident Response Team

### 2.1 Roles (24/7 coverage)

| Role | Person | Contact |
|------|--------|---------|
| **Incident Commander (IC)** | On-call engineer (rotating) | PagerDuty |
| **Technical Lead** | Engineering lead | Slack DM |
| **Communications Lead** | Product / Customer Success | Slack DM |
| **Security Officer** | Designated security contact | security@haastores.sa |
| **Legal / Compliance** | Legal counsel (escalation only) | legal@haastores.sa |
| **Owner / Decision maker** | Haa Stores Owner | Direct contact |

### 2.2 Escalation Path

```
On-call engineer (P0 page)
    ↓ 5 min no ack
Secondary on-call
    ↓ 5 min no ack
Engineering Lead
    ↓ 15 min no ack
Owner
```

---

## 3. Incident Response Lifecycle (NIST-aligned)

### Phase 1: Detection (0-15 min)

#### 3.1.1 Sources

- **Automated alerts:** Sentry, uptime monitor, error rate spike
- **User reports:** support@haastores.sa, in-app feedback
- **Internal team:** any team member can declare an incident
- **Third-party:** payment provider outage notification, security researcher

#### 3.1.2 Triage Questions

1. **What is broken?** (specific feature or whole platform)
2. **Who is affected?** (which users, how many)
3. **When did it start?** (look at error timestamps)
4. **Is data at risk?** (yes → P0, no → continue triage)
5. **Is it security-related?** (yes → invoke Security Incident sub-procedure §5)

#### 3.1.3 Severity Assignment

Based on §1.2, assign severity. If unsure, **escalate to higher severity** — better safe than sorry.

#### 3.1.4 Declare the Incident

```bash
# In Slack #incidents:
/incident declare P0 "Storefront returning 500 errors"
# → Creates dedicated Slack channel: #inc-p0-2026-06-17-storefront-500s
# → Pages on-call
# → Starts war room
```

#### 3.1.5 Open Incident Doc

Create `docs/ops/INCIDENTS.md` entry with template:

```markdown
### INCIDENT-YYYY-MM-DD-NNN: <title>

- **Severity:** P0 / P1 / P2 / P3
- **Status:** Investigating / Mitigating / Resolved / Post-mortem pending
- **Declared at:** YYYY-MM-DD HH:MM (Asia/Riyadh)
- **Declared by:** <name>
- **Incident Commander:** <name>
- **Detected by:** <source>
- **Affected systems:** <list>
- **Affected users:** <estimate>
- **Data at risk:** yes / no

**Timeline:**
- HH:MM — <event>
- HH:MM — <event>

**Root cause:** TBD
**Resolution:** TBD

**Action items:**
- [ ] <post-mortem action 1>
- [ ] <post-mortem action 2>
```

---

### Phase 2: Containment (15-60 min)

**Goal:** Stop the bleeding. Prevent further damage. **Stabilize, don't necessarily fix.**

#### 3.2.1 Common Containment Actions

| Scenario | Action |
|----------|--------|
| Bad deploy | Rollback: `flyctl releases rollback` |
| DDoS | Enable Cloudflare Under Attack Mode |
| Compromised credentials | Rotate immediately + force re-auth all sessions |
| Bad data migration | Halt DB writes; read-only mode |
| Payment provider down | Switch to backup provider (if configured) |
| Security breach | Isolate affected systems; preserve evidence |

#### 3.2.2 Communication

- **Internal:** Slack #incidents channel + #deployments
- **External:** status page (TBD — currently manual)
- **Users:** Email if P0/P1 + >1 hour duration; in-app banner for active users

**Communication template:**

```
Subject: [Haa Stores] Service Disruption - <date>

We're investigating an issue affecting <feature>. Some users may
experience <symptom>.

Our team is actively working on this. We'll update you within 30 minutes.

Status: https://status.haastores.sa (TBD)
```

---

### Phase 3: Eradication (1-4 hours)

**Goal:** Find and remove the root cause. **Fix properly, not patch.**

#### 3.3.1 Investigation

- Pull error logs (Sentry, support-error-events.ndjson)
- Check `pnpm ops:errors` for fingerprints
- Review recent changes (git log, deployments)
- Check upstream provider status (Moyasar/Geidea/Tabby/Tamara status pages)
- For security incidents: see §5

#### 3.3.2 Common Root Causes

| Pattern | Investigation | Fix |
|---------|----------------|-----|
| `API-001` (SQL error) | Check `support-error-events.ndjson` for fingerprint | Fix query, add migration |
| `3DS-FAIL` | Check Moyasar webhook logs | Update webhook handler, re-test |
| `AUTH-FAIL` spike | Check `audit_logs` for suspicious logins | Rotate JWT_SECRET, force re-auth |
| `RATE-LIMIT` spike | Check Redis logs | Adjust rate limit config |
| High CPU | Check slow queries (pg_stat_statements) | Add index, optimize query |

#### 3.3.3 Fix Strategy

For P0/P1:
1. **Patch first** (small change, low risk) — get back online.
2. **Proper fix** (refactor, migration, etc.) — in a follow-up commit.
3. **Test the patch** in staging first (if P0 and time-critical, can deploy directly with hotfix).
4. **Deploy** with monitoring + auto-rollback.

---

### Phase 4: Recovery (1-8 hours)

**Goal:** Restore normal operation. **Verify, don't assume.**

#### 3.4.1 Validation

- All tests pass (`pnpm test`)
- Smoke tests pass (production URLs)
- Error rate back to normal (check `pnpm ops:errors`)
- No new fingerprints in error logs
- User-reported issues resolved

#### 3.4.2 Communicate Resolution

```
Subject: [Haa Stores] Service Restored - <date>

The issue affecting <feature> has been resolved as of HH:MM.

Root cause: <brief, customer-friendly explanation>
Resolution: <what we did>

We apologize for the inconvenience. A detailed post-mortem will be
published within 7 days at <link>.

If you have questions, contact support@haastores.sa.
```

#### 3.4.3 Document in INCIDENTS.md

Update the incident entry:

```markdown
**Root cause:** <detailed>
**Resolution:** <what was changed>

**Post-mortem:** <link to doc>
```

---

### Phase 5: Post-Mortem (within 7 days)

**Goal:** Learn from the incident. Prevent recurrence.

#### 3.5.1 Post-Mortem Doc Template

Save as `docs/ops/POST_MORTEM_<incident-id>.md`:

```markdown
# Post-Mortem: <incident title>

**Incident ID:** INCIDENT-YYYY-MM-DD-NNN
**Severity:** P0 / P1 / P2 / P3
**Date:** YYYY-MM-DD
**Author:** <IC>

## Summary

<2-3 sentences: what happened, who was affected, how long>

## Timeline (all times Asia/Riyadh)

- HH:MM — <event>
- HH:MM — <event>
- ...

## Root Cause

<Detailed technical explanation. Include:
- What went wrong (the bug, the misconfig, the external event)
- Why our defenses didn't catch it
- What monitoring was missing (if applicable)>

## Resolution

<What we did to fix it>

## What Went Well

- <List 2-3 things that worked during the incident>

## What Went Wrong

- <List 2-3 things that made it worse or prolonged the incident>

## Action Items

| # | Action | Owner | Due date | Status |
|---|--------|-------|----------|--------|
| 1 | <action> | <name> | YYYY-MM-DD | Open / Done |
| 2 | <action> | <name> | YYYY-MM-DD | Open / Done |

## Lessons Learned

<1-2 sentences>
```

#### 3.5.2 Blameless Culture

- **No "who screwed up"** — focus on systems and processes.
- **Assume good intent** — the engineer who caused it didn't intend to.
- **Share learnings** — publish the post-mortem internally.

---

## 4. Common Incident Playbooks

### 4.1 Storefront 500 Errors (P1)

**Symptoms:** `/s/<slug>` returns 500, customer can't browse

**Investigation:**
```bash
# Check error rate
pnpm ops:errors --since=1h

# Check Sentry
# (Sentry dashboard URL)

# Check recent deploys
flyctl releases --app haa-platform-prod | head -5
```

**Common causes:**
1. Bad deploy → rollback
2. DB connection pool exhausted → check connections
3. Theme CSS broken → revert theme change
4. Tenant theme config error → check theme config endpoint

**Resolution:**
```bash
# If bad deploy:
flyctl releases rollback --app haa-platform-prod

# If DB pool:
# Scale up DB, restart app
flyctl scale count 3 --app haa-platform-prod

# If theme:
git revert <theme-commit-sha>
git push origin main
flyctl deploy --app haa-platform-prod
```

### 4.2 Payments Failing (P0/P1)

**Symptoms:** Orders failing at checkout, payment success rate < 95%

**Investigation:**
```bash
# Check provider status pages:
# - https://status.moyasar.com (or equivalent)
# - https://status.geidea.com
# - https://status.tabby.ai
# - https://status.tamara.co

# Check our logs:
pnpm ops:errors --filter="payment" --since=1h

# Check wallet entries:
psql "$DATABASE_URL" -c "SELECT type, status, COUNT(*) FROM wallet_entries WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY type, status;"
```

**Common causes:**
1. Provider outage → enable backup provider (manual switch)
2. Wrong API key → rotate key
3. Webhook not received → check webhook URL in provider dashboard
4. 3DS failure → check `requires_3ds` status distribution

**Resolution:**
```bash
# If provider outage:
# 1. Update PAYMENT_MODE to use backup provider
# 2. Notify users of temporary disruption
# 3. Once provider is back, revert

# If wrong key:
flyctl secrets set PAYMENT_SANDBOX_SECRET_KEY="<new-key>" --app haa-platform-prod
flyctl releases restart --app haa-platform-prod
```

### 4.3 Database Outage (P0)

**Symptoms:** All API requests fail with `ECONNREFUSED` or `connection timeout`

**Investigation:**
```bash
# Check DB status
flyctl postgres status --app haa-prod-db

# Check connection count
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"
```

**Resolution:**
```bash
# If DB is down:
# 1. Failover to read replica (if configured)
# 2. Restore from latest snapshot
flyctl postgres snapshot list --app haa-prod-db
flyctl postgres snapshot restore --app haa-prod-db --snapshot <latest>

# If connection pool exhausted:
# 1. Kill long-running queries
psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';"

# 2. Increase pool size (env: DATABASE_POOL_SIZE)
flyctl secrets set DATABASE_POOL_SIZE=50 --app haa-platform-prod
flyctl releases restart --app haa-platform-prod
```

### 4.4 Security Breach (P0)

**Symptoms:** Unauthorized access detected, data leak suspected

**⚠️ This is the most critical incident type. See §5 for detailed procedure.**

---

## 5. Security Incident Sub-Procedure

### 5.1 Definition

A security incident is any event that:
- Compromises user data (unauthorized access, exfiltration, modification).
- Compromises system integrity (unauthorized code execution, privilege escalation).
- Compromises authentication (credential theft, session hijacking).
- Suspected but not confirmed (suspicious activity that needs investigation).

### 5.2 Immediate Actions (within 1 hour)

1. **Preserve evidence** — do NOT delete logs, restart systems, or "clean up" until forensic capture is done.
2. **Isolate** — take affected systems offline (rotate keys, block IPs at firewall).
3. **Page Security Officer + Legal** — this is P0, escalate immediately.
4. **Activate war room** — Slack #incident-security-<date>.
5. **Engage legal counsel** — they'll advise on regulatory notifications.

### 5.3 Investigation

- Pull logs: Sentry, support-error-events.ndjson, audit_logs table, nginx access logs.
- Check for IOCs (Indicators of Compromise): IPs, user-agents, account IDs.
- Identify scope: which users, which data, which systems.
- Determine entry point: how did the attacker get in?
- Contain the attack vector (close the door).

### 5.4 Notifications (PDPL Article 21)

**Mandatory notification to SDAIA (سدايا) within 72 hours** of becoming aware of the breach.

**Required content (per PDPL):**
1. Nature of the breach.
2. Categories and approximate number of affected individuals.
3. Likely consequences.
4. Measures taken or proposed to address the breach.
5. Contact details of the DPO.

**User notification** without undue delay if the breach is likely to result in a high risk to user rights.

**Method:** Email + in-app notification (subject to legal advice).

### 5.5 Recovery

- Rotate all secrets (JWT, encryption keys, API keys).
- Force password reset for affected users (if credentials compromised).
- Apply security patches.
- Re-deploy from clean source (verify git history).
- Restore DB from pre-breach snapshot if needed.

### 5.6 Post-Breach

- File detailed report with SDAIA.
- Cooperate with any regulatory investigation.
- Publish transparency report (within 30 days, after legal review).
- Implement additional controls based on lessons learned.

---

## 6. Communication Templates

### 6.1 Initial User Notification (within 30 min of P0)

```
Subject: [Haa Stores] We're aware of an issue - <date>

Hi,

We're aware of an issue affecting <feature> and are actively working
on a fix. We appreciate your patience.

We'll update you within 30 minutes.

— The Haa Stores Team
```

### 6.2 Update Notification (every 30-60 min during P0)

```
Subject: [Haa Stores] Update on <feature> - <time>

Update: We've identified the cause of the issue affecting <feature>
and are deploying a fix. ETA: <time>.

Thank you for your patience.
```

### 6.3 Resolution Notification (within 30 min of fix)

```
Subject: [Haa Stores] <Feature> restored - <date>

The issue affecting <feature> has been fully resolved.

• What happened: <brief explanation>
• What we did: <brief action>
• What's next: <if anything>

We apologize for the inconvenience.

— The Haa Stores Team
```

### 6.4 Security Breach Notification (PDPL-compliant)

```
Subject: [Haa Stores] Important Security Notice - <date>

Dear <user>,

We're writing to inform you of a security incident that may have
affected your account. We take this very seriously and want to
provide you with full transparency.

**What happened:** <description>

**What information was affected:** <categories>

**What we've done:** <containment + remediation actions>

**What you should do:** <specific actions, e.g., change password,
monitor accounts, enable 2FA>

**Questions:** security@haastores.sa

We're committed to protecting your data and apologize for this incident.
A detailed report will be filed with the relevant authorities as
required by Saudi law.

— The Haa Stores Team
```

---

## 7. Tools & Resources

### 7.1 Monitoring

- **Sentry:** Error tracking (https://sentry.io)
- **Uptime monitor:** UptimeRobot / BetterStack / Pingdom
- **Logs:** Fly.io built-in + Sentry
- **Metrics:** Fly.io metrics dashboard
- **Local monitoring:** `pnpm ops:monitor` (synthetic + health + errors)

### 7.2 Runbooks

- `docs/DEPLOYMENT_RUNBOOK.md` — how to deploy / rollback
- `docs/SAUDI_COMPLIANCE_CHECKLIST.md` — regulatory requirements
- `docs/security/SECURITY_BASELINE.md` — security controls
- `docs/PRIVACY_POLICY.md` — what we promise users
- `docs/TERMS_OF_SERVICE.md` — what users promise us

### 7.3 Contacts

| Purpose | Contact |
|---------|---------|
| All security issues | security@haastores.sa |
| Press / media | press@haastores.sa |
| Legal (escalation only) | legal@haastores.sa |
| Regulator (SDAIA) | https://sdaia.gov.sa |
| Regulator (NCA) | https://nca.gov.sa |
| Payment provider support | (per provider) |
| Hosting support (Fly.io) | support@fly.io |

### 7.4 Decision Trees

**Should I page on-call?**
```
Production issue?
  ├─ Yes → All users affected → P0 → PAGE
  ├─ Yes → Some users affected → P1 → Slack war room + page within 30 min
  └─ No → Dev/staging → P2/P3 → Document in INCIDENTS.md, fix in next sprint

Data at risk?
  ├─ Yes → P0 immediately
  └─ No → Continue triage

Security incident?
  └─ Yes → P0 regardless of user impact
```

**Should I rollback?**
```
Bad deploy within last hour?
  ├─ Yes → Rollback immediately, investigate after
  └─ No → Investigate before rollback

Are we losing data?
  ├─ Yes → Stop writes, restore from snapshot
  └─ No → Continue triage

Is the fix known and small?
  ├─ Yes → Hotfix
  └─ No → Rollback
```

---

## 8. Cross-references

- `docs/DEPLOYMENT_RUNBOOK.md` — deployment + rollback procedures
- `docs/SAUDI_COMPLIANCE_CHECKLIST.md` — regulatory notifications (SDAIA, NCA)
- `docs/PRIVACY_POLICY.md` — what we promise users (breach notification clause)
- `docs/security/SECURITY_BASELINE.md` — security controls
- `docs/ops/INCIDENTS.md` — incident log (existing + new incidents)
- `docs/ops/ALERT_RULES.md` — alerting rules
- `docs/ops/MONITORING_PLAYBOOK.md` — monitoring operations
- `docs/ops/POST_MORTEM_<id>.md` — individual post-mortems

---

**Document version:** 1.0
**Next review:** 2026-09-17 (every 3 months)
**Drill schedule:** Quarterly tabletop exercise (first Wednesday of quarter)
**Approved by:** [TBD — Owner + Platform Team review before live]
