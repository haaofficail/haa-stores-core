# Current State

> This file is the project's memory. Update after every significant change or task closure.

---

- **Last Updated:** 2026-06-13
- **Current Phase:** Local MVP — Post LC6 / Pre-Production
- **Project Summary:** Multi-tenant Saudi e-commerce SaaS platform. Local-only. All 10 phases complete. Deployment gated by owner GO.
- **Active Priorities:**
  - Establish development operating system and process discipline ✅
  - System Health Operating System (next)
  - Ensure theme isolation between storefront and merchant dashboard
  - Complete visual QA pass across all storefront pages
- **Open Tasks:**
  - TASK-0001 (Development OS) — In Verification
- **Known Broken Areas:**
  - (to be documented as discovered)
- **Known Risks:**
  - Duplicate project folders on Desktop causing path confusion ⚠️
  - No automated CI/CD
  - `preflight` Root Guard does not fail if run from wrong directory ⚠️
- **Recently Completed:**
  - Development Operating System: AGENTS.md + 15 docs/ops/ files + preflight script
  - Git repository initialized (commit 076bc40)
  - Phase 1–10: All gates passed
  - LC6 — Local Full Product Gate: PASS
- **Do Not Touch:**
  - Production deployment configuration (requires owner GO)
  - Payment gateway credentials
  - Database production seeds
- **Next Recommended Tasks:**
  - Build System Health Operating System
  - Fix `preflight` to fail hard when not in correct project root
  - Remove or rename duplicate `haa-stores-core-spec.md` folder
- **Local Development Notes:**
  - Requires Node >= 20, pnpm >= 9, PostgreSQL
  - Run `pnpm setup` for initial local environment
  - Three terminals: `pnpm dev:api`, `pnpm dev:dashboard`, `pnpm dev:storefront`
  - First commit: `076bc40` — "chore: add development operating system"
- **Important Decisions:**
  - NO_DEPLOY_POLICY active — local development only until owner GO
  - Short requests must be expanded before execution (DECISION-0001)
  - Development Operating System installed correctly in real project path (DECISION-0002)
- **Monitoring Notes:**
  - No monitoring active (local-only)
