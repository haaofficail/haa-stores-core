# Strategic Commitments

> This file records binding commitments the agent has made to the project.
> These commitments take precedence over short-term feature requests and must
> not be violated without explicit owner authorization.

---

## COMMITMENT-0001: Quality Pass 1-5 Before Any Major Feature Pass

- **Date:** 2026-06-14
- **Status:** Active (binding)
- **Author:** Mavis (mavis) — strategic planning session
- **Owner:** Project owner
- **Reference:** Internal leadership vision + architectural audit reports

### Commitment

> **No major Feature Pass will be opened before Quality Pass 1 through 5 is closed.**
> The same methodology that produced RBAC Pass 1-5 will be applied to quality.

### Why This Exists

The project is in the middle of its operational lifetime. Foundation is solid,
but the middle layer (routes, services, frontend pages) has accumulated
production-fast decisions. Adding SaaS features on top of an unstable foundation
is wasted investment.

### The 5 Quality Passes (in order)

| Pass | Scope | Duration | Goal |
|------|-------|----------|------|
| **Pass 1** | System health | 1-2 weeks | Remove ticking bombs (schema drift, missing CI/CD, security gaps) |
| **Pass 2** | Component unification | 3-4 weeks | Make code maintainable for 6+ months |
| **Pass 3** | Security & permissions | 5-6 weeks | Production-grade security posture |
| **Pass 4** | Operations & quality | 7-8 weeks | Deployable and observable |
| **Pass 5** | Architectural cleanup | 9-10 weeks | Extensible without duplication |

### Acceptance Criteria for Closing This Commitment

- [ ] Quality Pass 1 closed
- [ ] Quality Pass 2 closed
- [ ] Quality Pass 3 closed
- [ ] Quality Pass 4 closed
- [ ] Quality Pass 5 closed
- [ ] All 12 governing principles respected
- [ ] Owner authorization for Feature Pass

### How to Override

This commitment can be overridden only by explicit owner authorization that
includes:
1. The specific feature being added
2. Justification for why it cannot wait
3. Acceptance of the additional risk

---

## COMMITMENT-0002: 12 Governing Principles

- **Date:** 2026-06-14
- **Status:** Active (binding)
- **Type:** Operating principles

The following principles govern all development. Violations require explicit
owner authorization.

| # | Principle |
|---|-----------|
| 1 | No new feature on top of an unstable area |
| 2 | No duplication of sensitive logic |
| 3 | No new schema before cleaning current schema |
| 4 | No route exceeds 300 lines |
| 5 | No route accesses Drizzle directly (must go through service) |
| 6 | No `c.req.json()` without `zValidator` |
| 7 | No new migration without down script |
| 8 | No production deploy before CI/CD exists |
| 9 | No new theme before unifying theme system |
| 10 | No production scale before CSRF + observability |
| 11 | No major SaaS feature before Quality Pass 1-5 |
| 12 | Every PR must pass typecheck + lint + test before merge |

### Enforcement

- New task requests that violate these principles are flagged and asked
  for owner override.
- Any work that begins in violation is rolled back.
- Quality Pass items themselves may temporarily violate a principle (e.g., Pass 2
  creates new routes) but each violation is documented and closed within the
  same pass.

---

## COMMITMENT-0003: Reject or Defer Pattern for Feature Requests

- **Date:** 2026-06-14
- **Status:** Active

### I will ACCEPT requests that are:

- Bug fixes
- Security patches
- Quality Pass items (Pass 1-5)
- Monitoring / observability work
- Documentation
- Tests
- Operational fixes (migrations, seeds, scripts)

### I will REJECT or DEFER requests that are:

- Major SaaS features (tiered billing, multi-region, white-label)
- Features built on top of unfinished Quality Pass
- New payment provider before Pass 2
- New theme before Pass 5
- Production scale-up before Pass 4

### I will REQUEST OWNER DECISION for:

- Anything violating the 12 principles
- Anything that requires opening a new Feature Pass
- Anything that requires overriding COMMITMENT-0001

---

## Related Decisions

- **DECISION-0001:** Short requests must be expanded before execution
- **DECISION-0002:** Development Operating System as foundational layer
- **DECISION-0003:** No git repository — mitigation via docs/ops

## Related Files

- `docs/ops/CURRENT_STATE.md` — must reflect this commitment
- `docs/ops/TASK_TRACKER.md` — must track Quality Pass tasks
- `docs/ops/CHANGELOG_INTERNAL.md` — must log commitment creation
- `docs/ops/DECISIONS.md` — must link to this commitment

---

**Last Updated:** 2026-06-14 16:36 Asia/Riyadh
**Status:** Active, binding, no exceptions without owner authorization
