# Risk Register

> All known project risks with impact assessment and mitigation.

---

## Risk Template

- **ID:** R-XXXX
- **Risk:**
- **Area:**
- **Impact:**
- **Likelihood:** 1–5
- **Severity:** 1–5
- **Mitigation:**
- **Owner:**
- **Status:** Open / Mitigated / Closed
- **Related Tasks:**

---

## Active Risks

### R-0001: Working from wrong directory

- **Risk:** Developer/agent works from `haa-stores-core-spec.md/` instead of `haa-stores-core/`
- **Area:** Operations
- **Impact:** Changes written to wrong location, wasted effort, confusion
- **Likelihood:** 4
- **Severity:** 5
- **Mitigation:** `pnpm preflight` now exits with code 1 from any path other than the exact project root; checks `.haa-project-root` + 6 required files/dirs
- **Owner:** All agents
- **Status:** Mitigated
- **Related Tasks:** TASK-0001, TASK-0002

### R-0002: Executing abbreviated requests without expansion

- **Risk:** Short user commands executed directly without scope definition
- **Area:** Process
- **Impact:** Scope creep, regressions, untested changes, undocumented assumptions
- **Likelihood:** 5
- **Severity:** 4
- **Mitigation:** Mandatory Request Expansion Rule in AGENTS.md; all tasks require Interpreted Task template
- **Owner:** All agents
- **Status:** Open
- **Related Tasks:** TASK-0001

### R-0003: Editing outside task scope

- **Risk:** Modifying files unrelated to the task
- **Area:** Process
- **Impact:** Regressions, broken features, difficult debugging
- **Likelihood:** 4
- **Severity:** 4
- **Mitigation:** Scope must be defined in task plan; git diff review before completion
- **Owner:** All agents
- **Status:** Open
- **Related Tasks:** TASK-0001

### R-0004: Theme CSS leaking to merchant dashboard

- **Risk:** Theme changes in storefront affect merchant-dashboard layout
- **Area:** Architecture
- **Impact:** Broken dashboard UI, confused merchants
- **Likelihood:** 3
- **Severity:** 4
- **Mitigation:** Architecture boundaries enforced; AGENTS.md Section 6; REGRESSION_CHECKLIST includes CSS leakage check
- **Owner:** All agents
- **Status:** Open

### R-0005: Permissions applied in UI only without API enforcement

- **Risk:** UI hides actions but API does not enforce permissions
- **Area:** Security
- **Impact:** Unauthorized access to restricted actions
- **Likelihood:** 3
- **Severity:** 5
- **Mitigation:** QUALITY_GATES mandates API enforcement check for any RBAC change
- **Owner:** All agents
- **Status:** Open

### R-0006: Breaking RTL or mobile layout

- **Risk:** UI changes that work on LTR/desktop break RTL or mobile layout
- **Area:** UX
- **Impact:** Poor Arabic user experience, mobile usability issues
- **Likelihood:** 4
- **Severity:** 3
- **Mitigation:** REGRESSION_CHECKLIST and QUALITY_GATES require RTL and mobile verification
- **Owner:** All agents
- **Status:** Open

### R-0007: Not running tests before completion

- **Risk:** Task marked done without running typecheck or relevant tests
- **Area:** Quality
- **Impact:** Undetected errors, regressions in production
- **Likelihood:** 4
- **Severity:** 4
- **Mitigation:** DEFINITION_OF_DONE requires tests passed or reason documented
- **Owner:** All agents
- **Status:** Open

### R-0008: No version control / git

- **Risk:** No git repository — no history, no branches, no rollback
- **Area:** Operations
- **Impact:** Cannot track changes, cannot revert, cannot collaborate
- **Likelihood:** 5
- **Severity:** 5
- **Mitigation:** docs/ops/ files track state; git init recommended as next action
- **Owner:** Project owner
- **Status:** Open
- **Related Tasks:** TASK-0001

### R-0009: Duplicate project folders causing path confusion

- **Risk:** Two similar folders (`haa-stores-core` and `haa-stores-core-spec.md`) cause confusion
- **Area:** Operations
- **Impact:** Work done in wrong folder, wasted effort
- **Likelihood:** 4
- **Severity:** 4
- **Mitigation:** `pnpm preflight` validates project root by checking for `package.json` and `pnpm-workspace.yaml`
- **Owner:** All agents
- **Status:** Open

### R-0010: Not updating documentation after changes

- **Risk:** Task completed but docs/ops/ files not updated
- **Area:** Process
- **Impact:** Stale state, lost context for future sessions
- **Likelihood:** 4
- **Severity:** 3
- **Mitigation:** DEFINITION_OF_DONE requires documentation updates; Final Report Rule requires doc update verification
- **Owner:** All agents
- **Status:** Open
