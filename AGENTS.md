# Haa Stores Core — Development Constitution

> هذا الدستور ملزم لأي وكيل ذكاء أو مطور يعمل على هذا المشروع.
> أي انحراف عن هذه القواعد يجب توثيقه في DECISIONS.md مع السبب.

---

## 1. Project Identity

This is a **multi-tenant SaaS e-commerce platform**, not a single store.

### Layers

| Layer              | Directory                    | Responsibility               |
| ------------------ | ---------------------------- | ---------------------------- |
| Platform Admin     | `apps/admin-dashboard`       | Platform-wide management     |
| Merchant Dashboard | `apps/merchant-dashboard`    | Merchant store management    |
| Storefront         | `apps/storefront`            | Public customer-facing store |
| API                | `apps/api`                   | Backend API                  |
| Database           | `packages/db`                | Schema, migrations, seeds    |
| Shared Packages    | `packages/shared`            | Types, schemas, utilities    |
| Theme System       | `packages/theme-*`           | Storefront theming engine    |
| Commerce Core      | `packages/commerce-core`     | E-commerce business logic    |
| Auth Core          | `packages/auth-core`         | Authentication & RBAC        |
| Shipping Core      | `packages/shipping-core`     | Shipping & logistics         |
| Notification Core  | `packages/notification-core` | Notifications                |
| Integration Core   | `packages/integration-core`  | Third-party integrations     |
| Marketplace Core   | `packages/marketplace-core`  | Marketplace features         |
| Wallet Core        | `packages/wallet-core`       | Digital wallet               |
| UI                 | `packages/ui`                | Shared UI components         |

---

## 2. Mandatory Start Rule

Before ANY task:

1. **Verify path** — `pwd` must be `/Users/thwany/Desktop/haa-stores-core`
2. **Run** — `pnpm preflight`
3. **Read** — `docs/system-map/SYSTEM_MAP.md` (architecture overview)
4. **Read** — `docs/ops/CURRENT_STATE.md`
5. **Search** — `docs/ops/TASK_TRACKER.md`, `docs/ops/ISSUE_KNOWLEDGE_BASE.md`, `docs/ops/DECISIONS.md`
6. **Classify** — Determine task type (see Section 4)
7. **Expand** — Convert user request to professional brief (see Section 3)
8. **Plan** — Write a short plan before any edit
9. **One task only** — Never mix scopes
10. **Test** — Run relevant checks
11. **Update** — Update logs, tracker, and state
12. **Report** — Write final report

---

## 3. Request Expansion Rule

No short command is executed directly. Every request must be expanded using this template:

### Interpreted Task

- **Original user request:**
- **What I think the user wants:**
- **Task type:**
- **Assumptions:**
- **Scope:**
- **Out of scope:**
- **Affected areas:**
- **Files to inspect:**
- **Risks:**
- **Acceptance criteria:**
- **Test plan:**
- **Documentation updates needed:**

---

## 4. Work Types

Every task must be classified as one or more of:

| Type                 | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| Audit                | Systematic review of code, security, performance, or architecture |
| Bug Fix              | Fixing a defect                                                   |
| Feature              | New functionality                                                 |
| UX/UI Polish         | Visual refinement without changing behavior                       |
| Refactor             | Restructuring code without changing behavior                      |
| Security             | Security hardening                                                |
| Performance          | Performance optimization                                          |
| Architecture         | Architectural change                                              |
| Documentation        | Documentation creation or update                                  |
| Testing              | Test creation or improvement                                      |
| Data/DB              | Database schema, migration, or data work                          |
| Integration          | Third-party integration                                           |
| Theme Work           | Storefront theme changes                                          |
| Permission/RBAC Work | Permissions and roles                                             |
| Product Planning     | Product decisions, scoping                                        |
| Support/Ops          | Operational or support tasks                                      |
| Monitoring           | Monitoring, observability                                         |
| Incident Response    | Production incident                                               |

---

## 5. Product Boundaries

Strict separation is enforced between these layers. No crossing without documented architectural reason.

| Layer                | Must NOT import from                                |
| -------------------- | --------------------------------------------------- |
| `admin-dashboard`    | `storefront`, `merchant-dashboard`, theme packages¹ |
| `merchant-dashboard` | `storefront`, theme packages¹                       |
| `storefront`         | `admin-dashboard`, `merchant-dashboard`             |
| `api`                | Any frontend app                                    |
| theme packages       | Dashboard apps                                      |
| `packages/shared`    | Any app                                             |

> ¹ **DECISION-OS-009 carve-out:** dashboards MAY import from `@haa/storefront-themes/server` (and `@haa/theme-system/server`) — these subpaths expose only types and pure registry/validation helpers (no DOM, no analytics, no CSS-variable mutation). `@haa/system-theme` is the dashboard's own visual-identity package. Direct imports of `@haa/storefront-themes`, `@haa/theme-system`, `@haa/theme-engine`, or `@haa/theme-web` from dashboards are forbidden and locked by `tests/theme-boundary.test.ts` + `eslint.config.mjs`.

---

## 6. Storefront vs Merchant Dashboard

- Storefront uses themes.
- Merchant Dashboard does NOT use storefront themes.
- Theme components must NOT be imported in merchant-dashboard.
- No CSS leakage between apps.
- Any theme change must verify impact on both storefront and merchant-dashboard.

---

## 7. Non-Negotiable Rules

**Forbidden:**

- Executing a short command directly without expansion
- Editing more than one scope in a single task
- Editing unrelated files
- Adding permissions in UI only without API enforcement
- Ignoring TypeScript errors
- Ignoring RTL and mobile in UI changes
- Ignoring tests
- Relying on memory instead of reading current files
- Deleting code or large refactors without clear justification
- Considering a task complete without a report
- Forgetting to update logs

---

## 8. Final Report Rule

After every task, provide a report containing:

- What changed?
- Why did it change?
- Files modified
- Tests run
- Manual checks performed
- What was NOT changed
- Remaining risks
- Were docs updated?
- Was TASK_TRACKER updated?
- Was CURRENT_STATE updated?
- Suggested next step

---

## 9. Design System & Storefront Standards

### 9.1 Spacing Governance

Use the approved spacing scale via tokens only (`--space-*`):
| Token | Value | Usage |
|-------|------:|-------|
| `--space-0` | 0 | none |
| `--space-1` | 4px | micro |
| `--space-2` | 8px | icon ↔ text gap |
| `--space-3` | 12px | compact padding |
| `--space-4` | 16px | default card padding |
| `--space-5` | 20px | medium gap |
| `--space-6` | 24px | section inner |
| `--space-8` | 32px | group gap |
| `--space-10` | 40px | large gap |
| `--space-12` | 48px | section separation |
| `--space-16` | 64px | hero/major separation |

### 9.2 Icon Governance

- Default UI icon: 24px
- Small metadata icon: 16px
- Button icon: 18px or 20px
- Feature/trust icon: 32px
- Empty-state icon: 48px or 64px
- Directional icons must respect RTL
- Clickable icons: hit area ≥ 44px

### 9.3 Product Cards

- Equal visual height in grids
- Flex-column layout
- Fixed image aspect ratio
- Title clamped to 2 lines
- Action area pinned to bottom

### 9.4 RTL Rules

- Use logical CSS: `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`, `text-align: start/end`
- No hardcoded `left`/`right`
- Mirror directional icons only when semantically correct

### 9.5 Approved Libraries

- SplideJS — carousels
- Lucide — icons
- Sonner — toasts
- Tailwind CSS — utility CSS
- SarIcon — SAR currency SVG

---

## 10. Per-Task Documentation Update

After any task, update at minimum:

- [ ] `docs/ops/TASK_TRACKER.md`
- [ ] `docs/ops/CURRENT_STATE.md` (if project state changed)
- [ ] `docs/ops/ISSUE_KNOWLEDGE_BASE.md` (if root cause found)
- [ ] `docs/ops/REGRESSION_CHECKLIST.md` (if regression risk exists)
- [ ] `docs/ops/CHANGELOG_INTERNAL.md` (if structural/behavioral change)
- [ ] `docs/ops/DECISIONS.md` (if architectural/process decision made)

---

## 11. System Health Operating System Rule

Before any significant development or bug fix:

1. **Run:**
   `pnpm ops:monitor`

2. **Read:**
   `docs/ops/LATEST_MONITORING_REPORT.md` if it exists

3. **If P0 alert is active:**
   - Stop all normal development
   - Record an Incident in `docs/ops/INCIDENTS.md`
   - Focus on restoring system health first

4. **If P1 is repeated (≥3 times):**
   - Create or update a Task in `docs/ops/TASK_TRACKER.md`

5. **If a fingerprint is repeated (≥3 times):**
   - Open a Root Cause Analysis in `docs/ops/ISSUE_KNOWLEDGE_BASE.md`

6. **After any health-related fix:**
   - Re-run `pnpm ops:monitor`
   - Update `docs/ops/TASK_TRACKER.md`
   - Update `docs/ops/INCIDENTS.md` if it was an incident
   - Update `docs/ops/ISSUE_KNOWLEDGE_BASE.md` if root cause found
   - Update `docs/ops/REGRESSION_CHECKLIST.md`
   - Update `docs/ops/CURRENT_STATE.md`

7. **Do not wait for the merchant to report a problem.** If monitoring detects it, act on it.

---

## 13. Local Dynamic Error Capture Rule

1. **All runtime errors** must be captured as structured events with errorCode + correlationId + eventId + fingerprint.
2. **Error codes** live in `packages/shared/src/error-codes.ts` with 14 predefined codes (API-001, SYS-001, STORE-001, etc.).
3. **Events** are written as NDJSON to `storage/support-error-events.ndjson` via `apps/api/src/services/support-error-log.ts`.
4. **ErrorBoundary** components in dashboard and storefront catch React errors, generate correlationIds, and POST to `/internal/support-errors/report`.
5. **The report endpoint** is local-development only (404 in production).
6. **Sanitization** strips passwords, tokens, secrets, card data, and authorization fields before storage.
7. **Stack traces** are stripped unless NODE_ENV=development.
8. **Simulate events** with `pnpm ops:errors:simulate`; analyze with `pnpm ops:errors`.
9. **Analyze scripts** read both `monitoring-events.ndjson` and `support-error-events.ndjson`, report by severity/top errorCode/top fingerprint/top origin/top app/top route.
10. **P0 alerts** recommend incidents; repeated P1 (≥3) recommends tasks; repeated fingerprints (≥3) recommends RCA.
11. **ErrorMonitor** interface in `error-handler.ts` is wired to the local NDJSON logger — no external services.
12. **Always update** `docs/support/ERROR_CATALOG.md`, `ERROR_CODE_TAXONOMY.md`, and `SUPPORT_PLAYBOOK.md` when adding new error codes.

---

## 12. Available Commands

| Command                    | Purpose                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm preflight`           | **Hardened:** fails with exit code 1 if not in correct project root. Checks `.haa-project-root`, package.json, pnpm-workspace.yaml, apps/, packages/, AGENTS.md, docs/ops/ |
| `pnpm ops:health`          | Run health checks on project and apps                                                                                                                                      |
| `pnpm ops:synthetic`       | Run synthetic HTTP checks on running servers                                                                                                                               |
| `pnpm ops:errors`          | Analyze recorded errors and suggest actions                                                                                                                                |
| `pnpm ops:errors:simulate` | Write a random fake error event to support-error-events.ndjson                                                                                                             |
| `pnpm ops:monitor`         | Run health + synthetic + error analysis in sequence                                                                                                                        |
| `pnpm ops:monitor:report`  | Generate a Markdown monitoring report                                                                                                                                      |
| `pnpm ops:monitor:tail`    | View recent monitoring events                                                                                                                                              |
| `pnpm typecheck`           | TypeScript type checking                                                                                                                                                   |
| `pnpm test`                | Run vitest tests                                                                                                                                                           |
| `pnpm lint`                | Run ESLint                                                                                                                                                                 |

---

## 14. Mandatory Skill Selection Rule (NEW — 2026-06-14)

> **No task, sub-task, or significant action may begin without first declaring and loading the relevant skill(s).**

### The 4-Step Skill Gate (apply before EVERY action)

For every action — no matter how small — complete these 4 steps **in order, in writing, before touching any file or command**:

#### Step 1: **STATE** the task

One sentence. What are you about to do?

#### Step 2: **SELECT** the skill(s)

Which skill(s) apply? List them by name. If unsure, consult `~/.mavis/skills/` or use the `find-skills` skill.

Common skill triggers:

| Task pattern                                 | Required skill                   |
| -------------------------------------------- | -------------------------------- |
| Any new feature, bug fix, or refactor        | `plan-mode`                      |
| Any bug investigation or unexpected behavior | `systematic-debugging`           |
| Any new code or test                         | `test-driven-development`        |
| Before claiming "done"                       | `verification-before-completion` |
| After any significant change                 | `requesting-code-review`         |
| Any creative/design work                     | `brainstorming-2`                |
| Any complex multi-step task                  | `plan-mode`                      |
| Stuck / unsure why                           | `mavis-doctor`                   |
| Multi-step parallel work                     | `mavis-team`                     |
| Code review of existing code                 | `code-review`                    |

#### Step 3: **STATE WHY** the skill fits

One sentence per skill. Why does this skill apply to this specific task?

#### Step 4: **LOAD** the skill(s)

Use the `skill` tool to load each selected skill. Do not proceed until loaded.

### Enforcement Format (use this exact template)

Before EVERY sub-task, write this in your response:

```markdown
## Pre-Action Skill Gate

**Task:** [one sentence]
**Skills selected:**

- `[skill-name]` — [why it fits]
- `[skill-name]` — [why it fits]

**Loading now...**
[then call the skill tool]
```

### Examples

#### Example 1: Merging duplicate schemas

```markdown
## Pre-Action Skill Gate

**Task:** Delete duplicate `marketing-actions.ts` schema file.

**Skills selected:**

- `plan-mode` — this is a data-integrity change requiring deliberate planning
- `systematic-debugging` — need to confirm root cause of duplication before removal
- `verification-before-completion` — must verify no test breaks after removal

**Loading now...**
```

#### Example 2: Adding a new API endpoint

```markdown
## Pre-Action Skill Gate

**Task:** Add `requirePermission` to `dashboard.ts` routes.

**Skills selected:**

- `plan-mode` — multi-step change across multiple endpoints
- `test-driven-development` — need boundary tests before applying changes
- `verification-before-completion` — must verify all tests pass

**Loading now...**
```

#### Example 3: Investigating a failing test

```markdown
## Pre-Action Skill Gate

**Task:** Investigate why `compliance-regression-gate.test.ts` fails on local DB.

**Skills selected:**

- `systematic-debugging` — debugging a test failure requires root cause analysis
- `mavis-doctor` — could be environment, migration state, or seed data issue

**Loading now...**
```

### Why This Rule Exists

- LLMs forget skills between turns without explicit invocation
- The system prompt lists skill triggers but does not enforce them
- Without this rule, agents default to "fast obvious solution" and skip methodology
- Skills exist to cover known gaps in agent reasoning (test coverage, verification, root cause analysis)

### When This Rule Does NOT Apply

- Pure conversational answers (questions, explanations, greetings)
- Reading files for context
- Format conversions (markdown, JSON parsing)
- Quick lookups (grep, glob, single reads)

### When This Rule APPLIES (default)

- Any code change (any file, any line)
- Any new task
- Any decision that affects architecture, security, or data
- Any commit, push, or merge
- Any test run considered "verification"

### Violation Penalty

- Every task entry in `TASK_TRACKER.md` must now include a `**Skills Used:**` field
- A task with `**Skills Used:**` blank will be treated as incomplete
- The owner may reject work that did not follow the skill gate

### Related

- Full skill list: `~/.mavis/skills/`
- Skill description: see the `available_skills` block in this session's system prompt
- `find-skills` skill can be used to discover relevant skills when unsure

---
