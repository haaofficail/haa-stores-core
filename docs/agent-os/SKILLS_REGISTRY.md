# Skills Registry — Haa Stores

> Single-source catalogue of all Claude Code execution skills available in
> this repo. The authoritative skill definitions live at
> `.claude/skills/<slug>/SKILL.md`; this file maps the 13 canonical task
> types (AGENTS.md §14.4) to the skills that must be considered for each.
>
> **What "skill" means here**: Claude Code execution skills and task
> governance — NOT CSS classes, design tokens, theme files, or visual UI
> work. See AGENTS.md §14.

## How to use this file

1. Classify the task into one of the 13 task types in AGENTS.md §14.4.
2. Pick **1 to 4** skills from the matching row(s) below.
3. Publish the `## Mandatory Skill Gate` block (AGENTS.md §14.2) **before**
   any edit.
4. At "done", publish the Final Skill Compliance Report.

If no skill fits, follow AGENTS.md §14.3 (write `**No matching skill
found**`, pick a fallback, and log a follow-up under "Pending additions"
at the bottom of this file).

## Registry — task type → skills

Each row: skill slug · task types where it applies · when to use · when
NOT to use · required evidence · required verification · risk notes.

### `frontend/design`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `design-ux-excellence-gate` | New UI surfaces, redesigns, polish that touches multiple components | Single-token tweak or copy edit | Before/after screenshots; token diff | RTL + mobile manual check; vitest run on UI tests | RTL regression risk; token leakage across apps |
| `single-source-of-truth-gate` | Touching design tokens, theme files, or shared utilities | Local component-only style | Token diff; grep of consumers | Cross-app boundary tests; lint | Forbidden cross-app imports (theme packages) |
| `regression-safety-gate` | Any change to shared component library | Page-only edit with no exported component | List of consumers grepped | Run vitest for impacted apps | Silent visual breakage in storefront vs dashboards |
| `acceptance-criteria-gate` | New feature; requirements ambiguous | Cosmetic fix | Written A/C up front | Trace each A/C to a check or test | Drift between intent and delivery |
| `verification-before-completion` | Every "done" claim | N/A — always required at done | `git diff` review + tests output | The 4 mandatory commands | Skipping verification is the top-failure mode |

### `backend/api`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `acceptance-criteria-gate` | New route, contract change | Comment-only edit | Endpoint contract written down | Contract test + boundary test | Silent API breakage |
| `regression-safety-gate` | RBAC or middleware change | Doc-only route description update | List of impacted clients | Full RBAC test pass | Auth/permission silently broken |
| `implementation-quality-gate` | Service-layer or query change | Trivial typo | Code review checklist run | Typecheck + targeted tests | N+1, missing pagination, missing index |
| `verification-before-completion` | Every "done" claim | N/A | git diff + tests | The 4 mandatory commands | Same as above |
| `single-source-of-truth-gate` | Schema or validator that exists in shared package | Route-local only | Grep showing one definition wins | Lint + typecheck | Duplicate Zod schemas drift |

### `database/migration`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `environment-safety-gate` | Any schema or migration change | Read-only query review | Confirmation that db:migrate was NOT run | `pnpm db:generate` output only | Auto-migrate could wreck staging/prod state |
| `regression-safety-gate` | Any schema change with existing data | Index-only add on empty table | Fresh-DB replay output | `pnpm db:reset && pnpm db:generate` locally | Backfill failure under concurrent writes |
| `acceptance-criteria-gate` | Adding a constraint with business meaning | Pure rename | Explicit invariant the constraint enforces | Test that violates the invariant pre-fix | Constraint silently widens scope |
| `verification-before-completion` | Every "done" claim | N/A | Fresh-DB replay log | The 4 mandatory commands | Owner-only `db:migrate` |

### `payments/wallet`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `acceptance-criteria-gate` | Ledger entry, refund, idempotency change | Cosmetic copy | Invariant statement (sum, balance, retry) | Property test or equivalent | Money invariants are the highest-blast-radius |
| `regression-safety-gate` | Touching wallet-core or provider boundary | New unit test only | Existing wallet tests still green | Full `packages/wallet-core` vitest | Silent double-charge or missing refund |
| `environment-safety-gate` | No live provider call | Live provider is in scope (forbidden in this gate) | Provider stub used; live calls disabled | Test runs against FakePaymentProvider | Real money movement is owner-only |
| `evidence-led-reporting` | Final report | N/A | Specific test output excerpt | Tests + grep proof | Reports without evidence get rejected |
| `verification-before-completion` | Every "done" claim | N/A | git diff + tests | The 4 mandatory commands | Same as above |

### `shipping`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `acceptance-criteria-gate` | New provider, rate logic, return flow | Provider rename | Defined rate-cache invariants | Targeted vitest run | Silent over/undercharge on rates |
| `regression-safety-gate` | Any change inside `packages/shipping-core` | Doc-only | Existing shipping tests still green | Full shipping vitest | Provider abstraction leaks |
| `single-source-of-truth-gate` | Multiple providers share a contract | Provider-specific tweak | One contract type, many implementations | Lint + typecheck | Contract drift across providers |
| `environment-safety-gate` | No live provider call | Live provider is in scope | Mock or fixture used | Test against MockShippingProvider | Live shipping is owner-only |
| `verification-before-completion` | Every "done" claim | N/A | git diff + tests | The 4 mandatory commands | Same as above |

### `security`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `agent-permission-boundary` | Any auth, session, secrets, or CVE work | Lint-only fix | Threat-model summary | Targeted security tests | Permission silently widens |
| `environment-safety-gate` | Touching `.env`, secrets, or auth paths | Lint-only fix | No secret printed; no `.env` echoed | Tests against fakes | Secret leakage |
| `regression-safety-gate` | Auth or RBAC change | Comment-only | Full RBAC tests pass | `pnpm vitest run rbac` | Token/session breakage |
| `evidence-led-reporting` | Final report | N/A | Specific test/log excerpt | Diff + tests | Security claims without proof |
| `verification-before-completion` | Every "done" claim | N/A | git diff + tests | The 4 mandatory commands | Same as above |

### `ci/deploy`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `environment-safety-gate` | Workflow, Caddy, Docker, runner | Doc-only README edit | No `db:migrate` step added; no prod step | CI run output | Auto-migrate or prod write |
| `branch-pr-hygiene-gate` | Branching, force-push, hooks | Local-only experiment | Branch off latest main; no `--no-verify` | `git status`; gh CI green | Force-push to protected branch |
| `regression-safety-gate` | Any workflow change | Comment-only | Full CI green on the PR | gh run watch | CI silently disabled |
| `evidence-led-reporting` | Final report | N/A | Failure line from Deploy logs | gh run view --log | Reports without log excerpts |
| `verification-before-completion` | Every "done" claim | N/A | git diff + CI | The 4 mandatory commands | Same as above |

### `docs/truth-sync`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `documentation-handoff-gate` | Any doc that the next agent reads | Comment-only nudge | Updated tracker + state | grep proves docs match code | Stale docs silently mislead |
| `single-source-of-truth-gate` | Two docs say different things | Comment-only | One canonical source picked | Lint + grep | Truth drift across files |
| `cross-agent-continuity-protocol` | Handoff between agents/sessions | Solo task | Handoff bundle written | Read by next agent | Lost context across sessions |
| `evidence-led-reporting` | Final report | N/A | Doc snippet + file path | grep | Reports without anchors |
| `verification-before-completion` | Every "done" claim | N/A | git diff + grep | The 4 mandatory commands | Same as above |

### `launch-readiness`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `definition-of-done-gate` | Pre-launch checklist or release | Mid-feature work | DoD table filled per item | Each row links to a check | Premature launch |
| `priority-triage-gate` | Backlog is mixed P0/P1/P2 | Single ticket | P-labelled list | Owner-action separator | Wrong-thing-first |
| `premium-product-quality-council` | Whole-product review | Single component | Council checklist run | Multi-discipline review | Surface polish hides depth issues |
| `evidence-led-reporting` | Final report | N/A | Snapshot of each gate | grep + tests | Status claims without evidence |
| `verification-before-completion` | Every "done" claim | N/A | git diff + tests | The 4 mandatory commands | Same as above |

### `observability`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `evidence-led-reporting` | Monitoring or alert change | Comment-only | Sample event payload | Local synthetic run | Alerts that never fire |
| `environment-safety-gate` | Touching DSN, OTEL, queue config | Doc-only | No secret printed | Local-only event capture | Secret leakage in error payload |
| `regression-safety-gate` | Changing error pipeline or queue | Doc-only | Existing capture tests green | `pnpm vitest run observability` | Silent loss of events |
| `verification-before-completion` | Every "done" claim | N/A | git diff + tests | The 4 mandatory commands | Same as above |

### `performance`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `acceptance-criteria-gate` | Numeric perf goal (bundle size, p95) | Subjective polish | Baseline + target numbers | Build/run captures both | Improvement claim without numbers |
| `regression-safety-gate` | Caching, indexes, lazy load | Single-component memoize | Existing perf tests green | Lighthouse delta or vitest | Improving one path, regressing another |
| `evidence-led-reporting` | Final report | N/A | Numeric before/after | Build size diff or trace | Vibes-based reports rejected |
| `verification-before-completion` | Every "done" claim | N/A | git diff + perf data | The 4 mandatory commands | Same as above |

### `accessibility`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `design-ux-excellence-gate` | WCAG, keyboard nav, screen reader | Comment-only | A11y checklist filled | Manual keyboard run | Inaccessible to RTL keyboard order |
| `regression-safety-gate` | Touching focus, ARIA, roles | Pure copy edit | Existing a11y tests green | `pnpm vitest run a11y` if present | Focus trap regressions |
| `evidence-led-reporting` | Final report | N/A | Screen reader or keyboard trace | Manual + tests | A11y claims without proof |
| `verification-before-completion` | Every "done" claim | N/A | git diff + tests | The 4 mandatory commands | Same as above |

### `testing/e2e`

| Skill | When to use | When NOT to use | Required evidence | Required verification | Risk notes |
| --- | --- | --- | --- | --- | --- |
| `test-strategy-gate` | Any new test or test reshuffle | Single-assert tweak | Strategy line picked | `pnpm test:smoke` or targeted vitest | Wrong test layer (e.g. e2e for unit logic) |
| `regression-safety-gate` | Changing a guard test or smoke | Adding an isolated assert | Existing guards still green | Run guard suite | Silently disabling a guard |
| `acceptance-criteria-gate` | New e2e covering business flow | Pure refactor | A/C mapped to assertions | Targeted run | Test that doesn't actually cover the A/C |
| `evidence-led-reporting` | Final report | N/A | Test output excerpt | vitest run | Reports without test output |
| `verification-before-completion` | Every "done" claim | N/A | git diff + tests | The 4 mandatory commands | Same as above |

## Cross-cutting (apply to every task type)

These are not task-type-specific — they wrap every gate:

- `verification-before-completion` — the last gate before "done" (mandatory).
- `evidence-led-reporting` — final reports must paste real output, not summary.
- `branch-pr-hygiene-gate` — required before any push/PR.
- `cross-agent-continuity-protocol` — required when handing off to another agent or session.
- `documentation-handoff-gate` — required when the work changes a doc the next agent reads.
- `anti-runaway-loop` — required when iterating on the same failure ≥3 times.
- `context-budget-guardian` — required when context is tight or many parallel sub-tasks.
- `agent-permission-boundary` — required when the task touches what an agent is allowed to do (forks, sub-agents, deploy).

## Pending additions

When the gate would point to a skill that does not exist, log it here so it
can be authored on the next pass. Format:

- `<proposed-skill-slug>` — proposed by `<agent-id-or-PR>` on `<YYYY-MM-DD>`; covers `<task type>`; gap: `<one line>`.

(Empty.)
