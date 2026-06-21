# Test Strategy — Haa Stores Agent OS

> **Purpose:** pick the right tests for the right change. The project's test commands live in `package.json` (54 scripts) — agents must call them by name, not invent flags.
> **Companion documents:** `DEFINITION_OF_DONE.md`, `QUALITY_GATES.md`, `COMMAND_ROUTING_MATRIX.md`.
> **Reference inventory (confirmed in `package.json`):** `pnpm test`, `pnpm test:e2e`, `pnpm test:e2e:ui`, `pnpm test:coverage`, `pnpm test:smoke`, `pnpm typecheck`, `pnpm lint`, `pnpm lint:fix`, `pnpm preflight`, `pnpm preflight:pentest`, `pnpm smoke`, `pnpm quality`, `pnpm ci:local`, `pnpm env:check`, `pnpm production:check`, `pnpm db:test:setup`, `pnpm db:bootstrap`, `pnpm db:reset`, `pnpm db:migrate`, `pnpm db:generate`, `pnpm load:test`, `pnpm oauth:test`, `pnpm ops:health`, `pnpm ops:monitor`, `pnpm ops:errors`, `pnpm ops:synthetic`. Use these names exactly; do not invent alternatives.

---

## 1. General rule

> If you do not know the command for a task type, write: **"Use the project's existing typecheck/test commands from package.json."** Do not invent.

---

## 2. Per task type

### 2.1 UI / component

- `pnpm typecheck`
- `pnpm lint` (note: pre-commit hook uses `--max-warnings 0`, stricter than CI).
- `pnpm test` (vitest unit tests for changed component + adjacent).
- Manual viewport check (desktop ≥ 1280px, mobile ~390px) with RTL.
- When Playwright is set up locally: `pnpm test:e2e` for the affected journey (see § 2.2 below).

### 2.2 Storefront (`apps/storefront`)

- Unit + RTL: `pnpm test` with the storefront test files.
- E2E: `pnpm test:e2e` then `pnpm test:e2e:ui` for interactive triage when failures appear.
- Critical journeys (see future `playwright-critical-journeys` skill): landing, login/signup, product page, cart, checkout, mobile RTL.

### 2.3 Merchant dashboard (`apps/merchant-dashboard`)

- `pnpm typecheck` + `pnpm lint`.
- `pnpm test` for affected pages/services.
- Browser check at desktop and tablet viewports.
- Never import `apps/storefront/**` or theme packages (`AGENTS.md §5, §6`).

### 2.4 Admin dashboard (`apps/admin-dashboard`)

- Same as merchant dashboard.
- RBAC enforcement is the highest sensitivity surface — see `§2.13 security` below.

### 2.5 API route (`apps/api/src/routes/`)

- `pnpm typecheck` + `pnpm lint`.
- `pnpm test` for the route's tests and any service it consumes.
- Tenant-isolation assertion: any test that touches tenant data must scope by `storeId` / `tenantId`.
- Local smoke when possible: start `pnpm dev:api`, hit the route at least once.
- For new routes, register Hono path **without** `/api` prefix (Caddy strips it — conversational memory).

### 2.6 Service (`packages/*/src/services/` or business-logic modules)

- `pnpm typecheck` (per-package).
- `pnpm test` for the package.
- Dedup keys, idempotency, and rollback paths must have explicit tests.

### 2.7 DB / migration (`packages/db/`)

- `pnpm db:generate` only when schema files changed (creates migration). Never edit a numbered migration after it is generated and pushed.
- `pnpm db:test:setup` to prime test DB; `pnpm db:bootstrap` for a fresh dev DB.
- `pnpm test` (migrations have structural assertions per `docs/ops/CURRENT_STATE.md` Drizzle snapshot chain).
- Manual sanity: a fresh DB via `pnpm db:reset` must pass `pnpm db:migrate` end-to-end (see `ISSUE_KNOWLEDGE_BASE.md` ISSUE-0012 for the historical cast failure).
- Apply migrations manually with `drizzle-kit` (or the project scripts) **before** deploying schema changes — staging deploy does not auto-migrate (conversational memory).

### 2.8 CI changes (`.github/workflows/*.yml`)

- Out of scope per `RISK_AND_PERMISSION_POLICY.md` unless explicitly authorized.
- When authorized: `pnpm ci:local` to mimic the CI sequence locally first.

### 2.9 Theme system

- DECISION-OS-003: target `@haa/storefront-themes` for new code; do not create a parallel system.
- `pnpm typecheck` for affected theme packages.
- `pnpm test` for theme test files.
- Visual regression: load a representative storefront page locally and visually compare.

### 2.10 Checkout / Cart

- `pnpm test` for `packages/commerce-core` + `apps/api` route tests.
- E2E: `pnpm test:e2e` for the checkout journey.
- Manual flow at least once locally end-to-end.

### 2.11 Payment

- `pnpm test` for `packages/payment-providers`, `packages/commerce-core` (wallet, encryption), and the relevant API route tests.
- Use `FakePaymentProvider` (`packages/payment-providers/src/fake.ts`) for local end-to-end.
- Live provider credentials are owner-driven and out of scope here.

### 2.12 Shipping

- `pnpm test` for `packages/shipping-core` and related API routes.
- For rate calculation changes, replay representative scenarios via the relevant unit tests.

### 2.13 Affiliate / referral

- **No implementation exists** (`ISSUE_REGISTER.md` ISSUE-0011; `PROJECT_MEMORY.md §9`). Building requires owner go (OD-NEEDED-004).
- If/when built: unit tests for code generation, attribution window, last-click, state-machine transitions; integration tests for cross-tenant isolation.

### 2.14 Docs

- No automated test. Required: cross-reference the new content with `OWNER_DECISIONS.md` and `PROJECT_MEMORY.md`. Run `git diff --check` for whitespace.

### 2.15 Cleanup / refactor

- The full suite that covers the touched packages: `pnpm typecheck` + `pnpm lint` + `pnpm test` for each.
- For wide refactors: run `pnpm quality` (project-defined quality target).
- For deletions: confirm no inbound references (`grep -r`) before removing.

### 2.16 Release readiness

- `pnpm preflight` (must pass from canonical repo path per DECISION-OS-006).
- `pnpm typecheck` (all packages).
- `pnpm lint` (no warnings).
- `pnpm test` (all suites).
- `pnpm test:e2e` (relevant journeys).
- `pnpm smoke` or `pnpm test:smoke`.
- Snapshot scan via `gitleaks dir` (see future `security-debt-gate` skill).
- Migrations dry-run.
- See `release-gate` skill (Batch C) for the GO / NO-GO checklist.

---

## 3. What not to do

- **Do not disable** failing tests to make CI green. File the failure and fix it.
- **Do not skip** the wider suite when the change is small but in a sensitive area (auth, payment, tenant isolation).
- **Do not run** `pnpm install` to "fix" a test failure; that masks dependency drift and may change the lockfile (forbidden per `RISK_AND_PERMISSION_POLICY.md`).
- **Do not invent** test commands. If `package.json` does not have it, do not pretend it exists.

---

## 4. Failure triage flow

1. Run the failing command once with full output captured.
2. Classify the failure: code defect / test defect / environment defect / pre-existing.
3. If pre-existing: document in `ACTIVE_WORK.md` "Known failures" and continue (do not silently inherit).
4. If new and in your diff: fix root cause, do not patch the symptom.
5. If repeated 3× without progress: stop, switch to read-only diagnosis (`systematic-debugging` mindset), escalate if needed.
