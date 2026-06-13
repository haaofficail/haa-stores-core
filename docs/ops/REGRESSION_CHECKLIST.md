# Regression Checklist

> Use this checklist whenever making changes to prevent reintroducing past issues.
> Update this list when a new root cause is identified.

---

## General

- [ ] `pnpm preflight` passes
- [ ] `pnpm typecheck` passes
- [ ] Relevant tests pass (or reason documented)
- [ ] `git diff` reviewed — no unrelated changes
- [ ] No files outside scope were modified
- [ ] docs/ops/ files updated if needed

## UI / UX

- [ ] RTL layout correct
- [ ] Mobile layout correct (responsive breakpoints)
- [ ] Spacing consistent with design tokens
- [ ] Loading states present where needed
- [ ] Empty states present where needed
- [ ] Error states present where needed
- [ ] No random colors — tokens used
- [ ] No layout overflow or scroll issues
- [ ] Touch targets ≥ 44px on mobile

## Theme

- [ ] Storefront theme works correctly
- [ ] Fallback theme works (if applicable)
- [ ] No CSS leakage to merchant-dashboard
- [ ] Merchant dashboard unaffected
- [ ] ProductDetail page works
- [ ] Home page works
- [ ] Header/Footer work correctly

## Permissions / RBAC

- [ ] UI hides unauthorized actions
- [ ] API rejects unauthorized actions
- [ ] Branch/location scope respected
- [ ] No cross-store data leakage
- [ ] Audit logged where relevant

## Orders / Payment / Shipping

- [ ] Order state transitions valid
- [ ] Payment methods unaffected
- [ ] Checkout safe path works
- [ ] Shipping label flow unaffected
- [ ] Webhooks considered (if relevant)

## API

- [ ] Input validation works
- [ ] Authentication enforced
- [ ] Error handling is safe (no stack traces in responses)
- [ ] No sensitive data leaked in responses
- [ ] API consumers (storefront, dashboard, admin) considered

## Database

- [ ] Migrations are reversible
- [ ] No destructive changes without approval
- [ ] Seed data not polluted
- [ ] Rollback plan exists

## Previous Issue Checks

*(Add specific checks here as issues are resolved)*
