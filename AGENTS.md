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
| `pnpm ops:alerts`          | Emit local NDJSON monitoring alerts for P0, repeated P1, and repeated fingerprints                                                                                         |
| `pnpm ops:monitor`         | Run health + synthetic + error analysis + local alert emission in sequence                                                                                                 |
| `pnpm ops:monitor:report`  | Generate a Markdown monitoring report                                                                                                                                      |
| `pnpm ops:monitor:tail`    | View recent monitoring events                                                                                                                                              |
| `pnpm typecheck`           | TypeScript type checking                                                                                                                                                   |
| `pnpm test`                | Run vitest tests                                                                                                                                                           |
| `pnpm lint`                | Run ESLint                                                                                                                                                                 |

---

## 14. Mandatory Skill Gate (REVISED — 2026-06-22)

> **No task, sub-task, file edit, commit, push, or "done" claim may begin
> without a written Mandatory Skill Gate. This is a hard rule, not a guideline.
> A task without a documented Skill Gate is treated as a task failure.**

> **Terminology — read this first.** "Skills" in this repository means
> Claude Code execution skills and task governance, defined in
> `.claude/skills/<name>/SKILL.md`. It does **NOT** mean CSS classes,
> Tailwind utilities, design tokens, theme files, or UI visual changes.
> Any report that proves "skills applied" via CSS or asset-hash evidence is
> invalid and will be rejected.

### 14.1 Source of truth

- All available skills live in `.claude/skills/<slug>/SKILL.md`.
- The human-readable catalogue is `docs/agent-os/SKILLS_REGISTRY.md`.
- The short reference cards are `docs/agent-os/SKILL_CARDS.md`.
- The file-glob → required-skill map is `docs/agent-os/SKILL_FILE_MAPPING.md`.
- The compliance report template is
  `docs/agent-os/templates/SKILL_COMPLIANCE_REPORT.md`.

### 14.2 The Skill Gate (declare in writing BEFORE any edit)

Before touching any file or running any state-changing command, the agent
MUST publish — in the user-visible response — a Skill Gate block. Use this
exact template:

```markdown
## Mandatory Skill Gate

**Task type:** <one of the 13 task types in §14.4>
**Task title:** <one sentence>
**Risk level:** <low | medium | high>
**Skills selected (all applicable; no numeric cap):**

- `<skill-slug>` — <one-line why it fits>
- `<skill-slug>` — <one-line why it fits>

**Files expected to change:** <comma-separated paths or globs>
**Verification planned:** <exact commands the agent will run later>
**Safety constraints respected:** no deploy · no db:migrate · no secrets · no production action
```

The gate is required for: any code change, any test, any commit, any push,
any new task entry, and any "done" claim.

Skill selection rule: select the maximum applicable set of skills from
`docs/agent-os/SKILLS_REGISTRY.md` and `docs/agent-os/SKILL_FILE_MAPPING.md`
for the task type and touched files. There is no 1–4 cap. Do not pad the gate
with unrelated skills; every selected skill must have a concrete one-line
reason tied to the current task.

### 14.3 If no skill fits

Write the literal line `**No matching skill found**`, then:

1. Explain in one paragraph why no existing skill covers the task.
2. Pick a fallback method (closest sibling skill + explicit additional
   safety steps).
3. Log a follow-up to add the missing skill — add an entry to
   `docs/agent-os/SKILLS_REGISTRY.md` "Pending additions" section so it
   becomes a real skill on the next pass.

Do not silently skip the gate.

### 14.4 Task types (must classify into exactly one)

The 13 canonical task types — pick the dominant one even if the work
crosses categories:

1. `frontend/design` — UI, components, theme tokens, RTL, visual polish
2. `backend/api` — Hono routes, services, RBAC, validation
3. `database/migration` — Drizzle schema, migrations, seeds, indexes
4. `payments/wallet` — wallet ledger, idempotency, refunds, providers
5. `shipping` — shipping-core providers, rates, cache, label flow
6. `security` — auth, sessions, CSRF, secrets, dependency CVEs
7. `ci/deploy` — workflows, Docker, Caddy, runners, environments
8. `docs/truth-sync` — docs alignment, decision logs, registries
9. `launch-readiness` — gates, owner-action separation, go/no-go
10. `observability` — monitoring, queues, alerts, error capture, Sentry
11. `performance` — bundle size, queries, caching, Lighthouse, images
12. `accessibility` — WCAG, keyboard nav, screen reader, RTL keyboard
13. `testing/e2e` — vitest, playwright, smoke, regression, contracts

If a task is genuinely multi-category, pick the dominant type and call out
the secondary type in the gate's _why_ lines.

### 14.5 Common gate examples (mirroring real repo skills)

```markdown
## Mandatory Skill Gate

**Task type:** backend/api
**Task title:** Add `requirePermission` to dashboard routes
**Risk level:** medium
**Skills selected:**

- `acceptance-criteria-gate` — endpoint contract must be defined first
- `regression-safety-gate` — RBAC change can silently break existing clients
- `verification-before-completion` — git diff + boundary tests are mandatory
  **Files expected to change:** apps/api/src/routes/dashboard/_.ts, tests/rbac-_.test.ts
  **Verification planned:** pnpm typecheck && pnpm vitest run tests/rbac
  **Safety constraints respected:** no deploy · no db:migrate · no secrets · no production action
```

```markdown
## Mandatory Skill Gate

**Task type:** database/migration
**Task title:** Add wallet-entries idempotency unique index
**Risk level:** high
**Skills selected:**

- `environment-safety-gate` — no auto-migrate; owner runs db:migrate
- `regression-safety-gate` — existing wallet flows must keep passing
- `evidence-led-reporting` — final report must show fresh-DB replay output
  **Files expected to change:** packages/db/src/schema/_.ts, packages/db/migrations/_.sql
  **Verification planned:** pnpm db:generate; tests against staging snapshot only
  **Safety constraints respected:** no deploy · no db:migrate · no secrets · no production action
```

```markdown
## Mandatory Skill Gate

**Task type:** ci/deploy
**Task title:** Fix Caddyfile syntax that blocks reload
**Risk level:** medium
**Skills selected:**

- `environment-safety-gate` — staging-only file, must not touch production
- `evidence-led-reporting` — paste actual failure line from Deploy logs
- `verification-before-completion` — PR CI must pass before commit-to-done claim
  **Files expected to change:** deploy/staging/Caddyfile
  **Verification planned:** gh run watch + smoke gate on staging URL
  **Safety constraints respected:** no deploy · no db:migrate · no secrets · no production action
```

### 14.6 Final Skill Compliance Report (required at "done")

Before claiming a task is done, the agent MUST publish (and link from the PR
body) a Final Skill Compliance Report using
`docs/agent-os/templates/SKILL_COMPLIANCE_REPORT.md`. The report must answer
every checkbox in the template — including the four safety confirmations
(no deploy / no db:migrate / no secrets / no production action) — or the
task is incomplete.

### 14.7 Forbidden actions inside any gated task

No matter which skill is selected, the following are NEVER permitted
without explicit, written owner approval in the same PR:

- `db:migrate` execution (file generation is fine; running it is owner-only)
- production deploy of any kind
- SSH to production hosts
- printing secrets or `.env` contents
- live payment-provider calls
- live shipping-provider calls
- editing `main` directly or force-pushing to any protected branch
- using the forbidden server `187.124.41.239`
- changing DNS, Nginx, firewall, or SSH keys

### 14.8 When the gate does NOT apply

The gate is skippable only for:

- Pure conversational answers (no file or state change).
- Reading files for context (`Read`, `Grep`, `Glob` without follow-up edits).
- Single-line quick lookups whose result is shown to the user verbatim.

Anything that mutates the repo, the registry files, or external state (PRs,
issues, CI) requires the gate.

### 14.9 Violation penalty

A PR or task that lacks a published Skill Gate or a Final Skill Compliance
Report will be:

1. Treated as incomplete in `docs/ops/TASK_TRACKER.md` (`Skills Used:` blank
   counts as failure).
2. Subject to revert at owner discretion.
3. Logged as a process deviation in `docs/agent-os/DECISIONS.md` if
   recurring.

### 14.10 Related references

- All skills: `.claude/skills/<slug>/SKILL.md`
- Registry: `docs/agent-os/SKILLS_REGISTRY.md`
- Short cards: `docs/agent-os/SKILL_CARDS.md`
- File mapping: `docs/agent-os/SKILL_FILE_MAPPING.md`
- Compliance template: `docs/agent-os/templates/SKILL_COMPLIANCE_REPORT.md`
- PR checklist: `.github/pull_request_template.md`
- Pre-execution gate checklist: `docs/agent-os/EXECUTION_CHECKLIST.md`
- Enforcement check script: `pnpm check:skills`

---
