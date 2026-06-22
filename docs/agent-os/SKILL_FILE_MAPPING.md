# Skill File Mapping — Haa Stores

> Maps file globs to the skills that MUST be selected in the Mandatory
> Skill Gate (AGENTS.md §14.2) when those files are about to change.
>
> If your `Files expected to change` list in the gate touches any glob
> below, the corresponding skills must appear in your `Skills selected`
> list, OR you must explicitly justify why a closer-fit skill substitutes.

## How to use

1. Take the file paths from your gate's `Files expected to change` line.
2. For each path, find the glob it falls under.
3. Add the listed skills to your `Skills selected` (1–4 cap still applies
   — combine with judgement; pick the dominant 1–4).
4. If a path doesn't match anything, classify by task type (AGENTS.md
   §14.4) and use `docs/agent-os/SKILLS_REGISTRY.md`.

## Glob → required skills

| Glob | Required skills (consider) | Why |
| --- | --- | --- |
| `apps/*/src/routes/**` | `acceptance-criteria-gate`, `regression-safety-gate`, `verification-before-completion` | Backend route changes can silently break clients; need contract + boundary tests |
| `apps/api/src/services/**` | `implementation-quality-gate`, `regression-safety-gate`, `verification-before-completion` | Service-layer logic; needs typecheck + targeted tests |
| `apps/api/src/middleware/**` | `agent-permission-boundary`, `regression-safety-gate`, `verification-before-completion` | Auth/RBAC/CSRF middleware; any change can widen surface |
| `apps/*/src/components/**` | `design-ux-excellence-gate`, `regression-safety-gate`, `verification-before-completion` | UI changes need RTL + mobile + consumer check |
| `apps/*/src/pages/**` | `design-ux-excellence-gate`, `verification-before-completion` | Page-level UI; same as above |
| `apps/*/src/lib/auth*/**` | `agent-permission-boundary`, `environment-safety-gate`, `regression-safety-gate` | Auth code; secret-handling + RBAC risk |
| `packages/db/src/schema/**` | `environment-safety-gate`, `regression-safety-gate`, `acceptance-criteria-gate` | Schema change; auto-migrate forbidden; backfill risk |
| `packages/db/migrations/**` | `environment-safety-gate`, `regression-safety-gate`, `evidence-led-reporting` | Migration files; owner runs `db:migrate`, not the agent |
| `packages/wallet-core/**` | `acceptance-criteria-gate`, `regression-safety-gate`, `environment-safety-gate` | Money invariants; no live provider calls |
| `packages/shipping-core/**` | `acceptance-criteria-gate`, `regression-safety-gate`, `single-source-of-truth-gate` | Provider contracts must stay consistent |
| `packages/notification-core/**` | `regression-safety-gate`, `environment-safety-gate` | No live sends; capture-only in dev |
| `packages/auth-core/**` | `agent-permission-boundary`, `regression-safety-gate`, `environment-safety-gate` | Auth core; full RBAC sweep needed |
| `packages/tokens/**` | `single-source-of-truth-gate`, `design-ux-excellence-gate`, `regression-safety-gate` | Tokens flow to multiple apps; cross-app boundary risk |
| `packages/ui/**` | `design-ux-excellence-gate`, `regression-safety-gate`, `single-source-of-truth-gate` | Shared components; need consumer grep + visual check |
| `packages/theme-*/**` | `single-source-of-truth-gate`, `regression-safety-gate`, `agent-permission-boundary` | Theme packages forbidden in dashboard apps (DECISION-OS-009) |
| `packages/shared/**` | `single-source-of-truth-gate`, `regression-safety-gate` | Shared types/schemas; drift risk across consumers |
| `.github/workflows/**` | `environment-safety-gate`, `branch-pr-hygiene-gate`, `regression-safety-gate` | CI/CD; no auto-migrate, no prod side effects |
| `deploy/**` | `environment-safety-gate`, `branch-pr-hygiene-gate`, `evidence-led-reporting` | Deploy config; staging-only; cite log evidence |
| `scripts/**` | `environment-safety-gate`, `implementation-quality-gate` | Repo scripts; no secrets; safe defaults |
| `tests/e2e/**` | `test-strategy-gate`, `regression-safety-gate`, `acceptance-criteria-gate` | E2E layer; pick correct test layer |
| `tests/**/*.test.ts` (non-e2e) | `test-strategy-gate`, `regression-safety-gate`, `verification-before-completion` | Unit/integration tests; correct layer + don't disable guards |
| `docs/agent-os/**` | `documentation-handoff-gate`, `single-source-of-truth-gate`, `cross-agent-continuity-protocol` | Docs the next agent reads; drift is high-cost |
| `docs/ops/**` | `documentation-handoff-gate`, `evidence-led-reporting` | Ops truth files; cite source for any change |
| `docs/system-map/**` | `documentation-handoff-gate`, `single-source-of-truth-gate` | Architecture map; must match code |
| `AGENTS.md`, `CLAUDE.md` | `documentation-handoff-gate`, `single-source-of-truth-gate`, `cross-agent-continuity-protocol` | Constitution files; affect every future agent |
| `.claude/skills/**` | `single-source-of-truth-gate`, `documentation-handoff-gate` | Skill definitions; touch this only with intent |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | `environment-safety-gate`, `regression-safety-gate`, `branch-pr-hygiene-gate` | Dependency or workspace change; CVE + supply-chain risk |
| `apps/api/src/observability/**`, `*/services/observability*` | `environment-safety-gate`, `regression-safety-gate`, `evidence-led-reporting` | Telemetry pipeline; DSN/secret risk |
| `Caddyfile`, `deploy/*/Caddyfile` | `environment-safety-gate`, `evidence-led-reporting`, `branch-pr-hygiene-gate` | Reverse-proxy config; validate before reload |

## Wildcard fallback

If your file path matches no glob above:

1. Pick the dominant task type (AGENTS.md §14.4).
2. Apply the row in `docs/agent-os/SKILLS_REGISTRY.md`.
3. Always include `verification-before-completion` regardless.
4. If still unclear, write `**No matching skill found**` per AGENTS.md §14.3
   and log a follow-up to extend this mapping.

## Examples

### Example 1 — touching a route + a test file

`Files expected to change: apps/api/src/routes/dashboard/products.ts,
tests/dashboard-products.test.ts`

Required skills (pick the dominant 1–4):

- `acceptance-criteria-gate` (route contract)
- `regression-safety-gate` (existing dashboard tests)
- `test-strategy-gate` (correct layer)
- `verification-before-completion`

### Example 2 — adding a new wallet migration

`Files expected to change: packages/db/src/schema/wallet.ts,
packages/db/migrations/0042_wallet_idempotency.sql`

Required skills:

- `environment-safety-gate` (no `db:migrate` run)
- `regression-safety-gate` (fresh-DB replay output mandatory)
- `acceptance-criteria-gate` (state the invariant the index enforces)
- `verification-before-completion`

### Example 3 — refactoring a shared UI component

`Files expected to change: packages/ui/src/Button.tsx`

Required skills:

- `design-ux-excellence-gate` (RTL + mobile + visual check)
- `regression-safety-gate` (grep all consumers)
- `single-source-of-truth-gate` (no parallel duplicate)
- `verification-before-completion`
