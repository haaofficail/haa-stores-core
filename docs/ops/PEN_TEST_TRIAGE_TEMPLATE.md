# Pen-Test Findings Triage Template — TASK-0045 §8.3

> **Engineering + owner use this when pen-test report arrives.**
> Use within 48 hours of report delivery.
>
> **Cross-references:**
> - `docs/ops/MARKETPLACE_HARDENING_PLAN.md` §8 §8.3
> - `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md` (vendor engagement)
> - `docs/ops/BETA_LAUNCH_MONITORING.md` (post-fix monitoring)
> - `docs/security/` — security baseline docs

---

## 1. When to use this template

Trigger triage within **48 hours** of receiving the pen-test report from the vendor. Schedule a triage meeting with:

- Engineering lead (your team)
- Founder (you)
- Optional: external security consultant (if you have one on retainer)

**Meeting duration:** 1 hour for triage + 30 min for Critical/High decisions.

---

## 2. Severity classification (vendor may use CVSS — translate)

The pen-test vendor typically uses CVSS 3.1 scores. Translate to Haa's triage categories:

| CVSS Score | Severity | Action | SLA |
|-----------|----------|--------|-----|
| 9.0 - 10.0 | **Critical** | Fix before beta launch | Same day |
| 7.0 - 8.9 | **High** | Fix within 2 weeks of launch | Scheduled sprint |
| 4.0 - 6.9 | **Medium** | Add to backlog, fix in next sprint | Backlog |
| 0.1 - 3.9 | **Low** | Backlog, address opportunistically | Backlog |
| 0.0 | **Info** | Note, no action | — |

**Special cases:**
- **PDPL data exposure** (any PII leak): always Critical regardless of CVSS.
- **Authentication bypass**: always Critical.
- **SQL injection in production code**: always Critical.
- **Reflected XSS in admin-only routes**: Medium (auth required).
- **Reflected XSS in public routes**: High.

---

## 3. Finding intake template

Copy this for each finding:

```markdown
## Finding [NN]: [Brief Title]

**Vendor reference:** [e.g., "PT-2026-001"]
**CVSS score:** [X.X]
**Severity (Haa):** [Critical | High | Medium | Low]
**Endpoint / location:** [e.g., "POST /marketplace/orders"]
**Description:** [2-3 sentences from vendor report]
**Evidence:** [Screenshot / payload / repro steps]
**Vendor recommendation:** [Their suggested fix]

**Haa analysis:**
- Root cause: [What in our code caused this]
- Blast radius: [How many users affected? What data exposed?]
- Exploitability: [How easy to exploit? Public/private? Auth required?]
- Real-world impact: [Worst case if exploited in production]

**Triage decision:**
- [ ] **Fix-forward** (clear root cause, low risk)
- [ ] **Rollback** (if fix-forward ETA >2 hours OR data integrity risk)
- [ ] **Accept risk** (only for Medium/Low with documented justification)

**Fix plan:**
- Owner: [engineer name]
- ETA: [date]
- Type of fix: [code change | config change | infra change | process change]

**Verification:**
- [ ] Unit test added (if applicable)
- [ ] Manual repro no longer works
- [ ] Vendor re-test (if contract includes re-test)
- [ ] Monitoring added (if applicable)
```

---

## 4. Common findings + typical fix ETA

For reference, here's how long typical fixes take at Haa (based on the engineering patterns we've established):

| Finding type | Typical ETA | Typical owner |
|--------------|-------------|----------------|
| **SQL injection** (Critical) | 1-4 hours | Senior engineer + review |
| **Authentication bypass** (Critical) | 2-8 hours | Senior engineer + security review |
| **Reflected XSS** in public route (High) | 1-2 hours | Mid engineer |
| **Stored XSS** (Critical/High) | 4-24 hours | Senior engineer |
| **IDOR** (High) | 2-4 hours | Mid engineer |
| **Missing rate limit** (Medium) | 30 min - 1 hour | Mid engineer |
| **Information disclosure** (Medium) | 30 min - 2 hours | Mid engineer |
| **CSRF** (Medium) | 1-2 hours | Mid engineer |
| **Open redirect** (Low) | 30 min | Junior engineer |
| **Missing security headers** (Low) | 30 min | Junior engineer |
| **Outdated dependency with known CVE** (varies) | 1-8 hours | Mid engineer |

---

## 5. Triage meeting agenda (1 hour)

### Phase 1: Vendor report walkthrough (10 min)

- Engineering lead summarizes the report structure.
- Note the number of findings in each severity bucket.

### Phase 2: Critical findings (30 min)

For each Critical finding:

1. Read vendor description (2 min).
2. Engineering explains root cause (5 min).
3. Decide: fix-forward or rollback (5 min).
4. Assign owner + ETA (3 min).

### Phase 3: High findings (15 min)

For each High finding:

1. Read vendor description (1 min).
2. Engineering explains root cause (2 min).
3. Decide: fix-forward, accept, or schedule (2 min).

### Phase 4: Medium + Low (5 min)

Quick pass. Add to backlog with priority tags.

---

## 6. Post-triage actions (owner)

### 6.1 If ALL Critical/High fixed → proceed

- Vendor delivers re-test report (if in scope).
- Update TASK_TRACKER: TASK-0045 status → "Done".
- Proceed to §8.4 beta launch per `BETA_LAUNCH_CHECKLIST.md`.

### 6.2 If Critical/High cannot be fixed in time → delay launch

- Honest communication to cohort merchants.
- Re-schedule launch date based on engineering ETA.
- Update COMMITMENTS.md: "Beta launch delayed to YYYY-MM-DD due to pen-test findings."

### 6.3 If data breach found → PDPL Article 17 protocol

1. **Contain** within 1 hour (disable affected endpoints).
2. **Notify SDAIA** within 72 hours.
3. **Notify affected data subjects** within 30 days.
4. **Document** the breach + response.
5. **Coordinate** with founder on public communication.

---

## 7. Tracking format

After triage meeting, update the task tracker:

```markdown
## TASK-0045 §8.3 — Pen-Test Triage [YYYY-MM-DD]

### Vendor: [Vendor Name]
### Report received: [YYYY-MM-DD]
### Triage meeting: [YYYY-MM-DD]
### Findings summary:
- Critical: [N] — [all fixed | N remaining]
- High: [N] — [all fixed | N remaining]
- Medium: [N] — [backlog | in-progress]
- Low: [N] — [backlog | accepted]
- Info: [N]

### Decision: [PROCEED | DELAY | PDPL_BREACH]

### Next steps:
- [ ] [Fix N] — Owner: [name] — ETA: [date]
- [ ] [Re-test with vendor] — ETA: [date]
- [ ] [Update §8.4 checklist] — ETA: [date]
```

---

## 8. Reference templates

### 8.1 Email to vendor (re-test request)

```
Subject: Haa Stores pen-test — re-test request for [finding IDs]

Hi [Vendor contact],

Per our pen-test engagement contract, we'd like to schedule a
re-test for the following findings:

- [Finding ID]: [Brief title] — fixed on [date]
- [Finding ID]: [Brief title] — fixed on [date]

We've deployed the fixes to our staging environment at
https://staging.haastores.sa. Please verify the fixes are
effective.

Expected re-test duration: [N days]
Available re-test window: [date range]

Please confirm availability.

Thanks,
[Your name]
```

### 8.2 Slack message to engineering team (after triage)

```
:white_check_mark: **Pen-test triage complete** — [N] findings total

**Critical (must fix before beta launch):**
- Finding 1: [title] — fix ETA [date] — owner [name]
- Finding 2: [title] — fix ETA [date] — owner [name]

**High (fix within 2 weeks of launch):**
- ...

**Medium + Low:** Added to backlog.

**Decision:** [Proceed to beta launch YYYY-MM-DD | Delay to YYYY-MM-DD]

Meeting notes: [link to doc]
```

---

## 9. References

- `docs/ops/MARKETPLACE_HARDENING_PLAN.md` §8 §8.3 (plan section)
- `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md` (engagement brief)
- `docs/ops/BETA_LAUNCH_CHECKLIST.md` §0 (prerequisites)
- `docs/ops/BETA_LAUNCH_MONITORING.md` (post-fix monitoring)
- `docs/INCIDENT_RESPONSE.md` (incident handling)
- `docs/security/` (security baseline + audit docs)
- CVSS 3.1 calculator: https://www.first.org/cvss/calculator/3.1

---

**Last Updated:** 2026-06-17 (TASK-0045 §8.3 triage prep — Session S engineering)
**Owner Action:** Run within 48 hours of pen-test report delivery
**Engineering Effort:** 1 hour triage + 2-5 days fixing Critical/High findings
