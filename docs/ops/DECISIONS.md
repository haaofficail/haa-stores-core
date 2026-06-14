# Decision Records

> Architectural, process, and product decisions are recorded here with context and consequences.

---

## DECISION-0001: Short requests must be expanded before execution

- **Date:** 2026-06-13
- **Status:** Accepted
- **Decision:** Any abbreviated user request (e.g., "fix footer", "store not working", "make it professional") must NOT be executed directly. It must first be converted to a structured professional brief using the Interpreted Task template defined in AGENTS.md.
- **Context:** Previous development suffered from inconsistent quality, scope creep, undocumented assumptions, and untested changes due to executing short commands without analysis.
- **Options Considered:**
  1. Execute directly and fix iteratively (rejected — causes regressions and waste)
  2. Require full product spec for every change (rejected — too heavy for simple tasks)
  3. Structured expansion with scope, risks, and acceptance criteria (selected)
- **Reason:** Prevents random development, ensures shared understanding, and enforces quality before execution.
- **Consequences:**
  - Positive: Clear scope, fewer regressions, documented decisions
  - Negative: Slight overhead for very simple tasks (acceptable trade-off)
- **Related Tasks:** TASK-0001
- **Related Risks:** R-0002

---

## DECISION-0002: Development Operating System as foundational layer

- **Date:** 2026-06-13
- **Status:** Accepted
- **Decision:** Before any feature work, bug fix, or refactor, the project must have a formal Development Operating System consisting of AGENTS.md constitution and docs/ops/ methodology files.
- **Context:** Multiple sessions showed inconsistent behavior, path confusion, lack of documentation, and no quality enforcement.
- **Options Considered:**
  1. Start fixing bugs immediately (rejected — same problems would repeat)
  2. Build ops system first (selected)
- **Reason:** Without process discipline, every session starts from zero and quality is unpredictable.
- **Consequences:**
  - Positive: All future work follows a defined, auditable process
  - Negative: Short-term delay on feature work
- **Related Tasks:** TASK-0001

---

## DECISION-0003: No git repository — mitigation via docs/ops

- **Date:** 2026-06-13
- **Status:** Accepted
- **Decision:** Although the project lacks a git repository, the docs/ops/ files serve as the source of truth for project state, task tracking, and decisions until git is initialized.
- **Context:** `git status` returns "not a git repository". No version control exists.
- **Options Considered:**
  1. Initialize git immediately (recommended but requires user action)
  2. Proceed with docs-only tracking (selected — enables work to continue)
- **Reason:** Version control initialization requires user confirmation. The ops system provides interim tracking.
- **Consequences:**
  - Positive: Work can proceed with documented state
  - Negative: No branching, no diff history, no rollback
- **Related Tasks:** TASK-0001
- **Related Risks:** R-0001

---

## DECISION-0004: Quality Pass 1-5 before any major Feature Pass

- **Date:** 2026-06-14
- **Status:** Accepted
- **Decision:** No major Feature Pass (tiered billing, multi-region, white-label, new payment providers beyond existing ones, new themes, mobile app) will be opened before Quality Pass 1 through 5 is closed. The same methodology that successfully produced RBAC Pass 1-5 will be applied to quality.
- **Context:** Architectural audit and leadership vision reports identified that the project is in the middle of its operational lifetime. The foundation (apps/packages, auth, RBAC, error monitoring) is solid, but the middle layer (routes, services, frontend pages) has accumulated production-fast decisions:
  - Schema duplication in `marketing-actions.ts` + `marketing_actions.ts` (P0 ticking bomb)
  - Migrations duplication (`0036` + `0046`)
  - `payment.ts` god class (1429 lines, 5 providers in one file)
  - Routes exceeding 800 lines (`storefront.ts` 876, `marketplaces.ts` 910, `admin.ts` 692)
  - `DashboardHome.tsx` at 2743 lines
  - CSRF absent + CORS `credentials: true`
  - In-memory rate limiter (multi-process break)
  - No CI/CD
  - `AnyRecord` and `as any` spread in critical paths
- **Options Considered:**
  1. Continue with feature development (rejected — wasted investment on unstable foundation)
  2. Quality Pass 1-5 first, then Feature Pass (selected)
  3. Parallel quality + feature work (rejected — would dilute both efforts)
- **Reason:** Adding SaaS features on top of an unstable foundation is wasted investment. The 6-month cost of technical debt already accumulated will compound if features are added without first stabilizing the middle layer. RBAC Pass 1-5 proved the team can execute focused quality work — same methodology will work here.
- **Consequences:**
  - Positive: Product becomes sellable, maintainable, and extensible for 3-5 years
  - Positive: Same successful methodology as RBAC Pass 1-5
  - Negative: 10 weeks of quality work before major features
  - Negative: Some marketplace visual polish deferred until Pass 2+
- **Quality Pass Scope:**
  - **Pass 1 (weeks 1-2):** Schema drift fix, migrations merge, ADMIN_JWT_SECRET, CI/CD, FK cascade, requirePermission gaps
  - **Pass 2 (weeks 3-4):** Route splitting (storefront, marketplaces, admin), payment provider extraction, DashboardHome decomposition, helpers extraction, ProductCard unification
  - **Pass 3 (weeks 5-6):** CSRF, webhook idempotency, customer mutations audit, public order rate limit, password validation, error sanitizer recursion, bcryptjs replacement
  - **Pass 4 (weeks 7-8):** Full CI/CD, Sentry/OTEL, Redis rate limiter, queue for auto-publish, soft delete pattern, NDJSON rotation, .env placeholders
  - **Pass 5 (weeks 9-10):** Repository layer, DI container, BullMQ, theme system rationalization, i18n unification, E2E tests
- **Related Files:** `docs/ops/COMMITMENTS.md` (binding commitment)
- **Related Risks:** R-0001 to R-0014 (security baseline risks)
