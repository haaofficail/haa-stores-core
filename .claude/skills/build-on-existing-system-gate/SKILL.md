---
name: build-on-existing-system-gate
description: Use this skill when about to introduce a new package, service, or system that overlaps an existing one — themes, marketplace, affiliate, payment, shipping, auth. Refuses parallel systems.
disable-model-invocation: true
---

# Build on Existing System Gate

## Purpose

Force every new capability to extend the current architecture, not run beside it. Parallel systems are how monorepos rot.

## Read First

- `docs/agent-os/PROJECT_MEMORY.md` (provider/theme/launch facts).
- `docs/agent-os/CURRENT_SYSTEM_AUDIT.md §6` (existing drift, especially theme packages).
- `docs/agent-os/OWNER_DECISIONS.md` (DECISION-OS-003: no parallel theme system).
- `docs/system-map/SYSTEM_MAP.md` (layer locations).

## Rules

1. Forbidden parallel systems:
   - **Themes** — extend `@haa/storefront-themes` (DECISION-OS-003); do not create a new theme package.
   - **Marketplace** — extend `apps/api/src/routes/haa-marketplace.ts` + `packages/marketplace-core/`; do not start a new marketplace surface.
   - **Affiliate** — does not exist yet (PROJECT_MEMORY OD-NEEDED-004). Implementation requires owner go; until then no scaffolding.
   - **Payment** — extend `packages/payment-providers/`; the `FakePaymentProvider` pattern is the template.
   - **Shipping** — extend `packages/shipping-core/`.
   - **Auth / RBAC** — extend `packages/auth-core/`; do not write a second auth path.
2. New code respects layer boundaries (`AGENTS.md §5`).
3. New code uses shared types/schemas from `packages/shared` (no per-app schema duplication).
4. A "side system" disguised as a "POC" still needs a documented exit (when does it merge into the canonical surface?).

## Steps

1. Name the capability being added.
2. Identify the canonical owner package/file (use `SYSTEM_MAP.md`).
3. Extend it; if it cannot be extended, state why in a `DECISIONS.md` entry and propose owner approval.
4. If the change crosses layer boundaries (`AGENTS.md §5`), stop — owner ruling needed.
5. Reflect any new shared type into `packages/shared`.

## Output

```
Capability: <one sentence>
Canonical owner: <package/file>
Extension plan: <what was added/changed>
Boundary crossings: <none | listed>
Forbidden parallel-system check: <passed>
```
