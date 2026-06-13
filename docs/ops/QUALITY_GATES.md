# Quality Gates

> Mandatory checks that must pass before a task can be marked Done.

---

## General Gate

- [ ] `pnpm preflight` passes
- [ ] `pnpm typecheck` passes
- [ ] Relevant tests pass (or reason documented)
- [ ] `git diff` reviewed — no unrelated changes
- [ ] docs/ops/ files updated if needed

## UI Gate

- [ ] RTL layout correct
- [ ] Mobile layout correct (responsive)
- [ ] Spacing uses design tokens
- [ ] Visual hierarchy is clear
- [ ] Loading states present
- [ ] Empty states present
- [ ] Error states present
- [ ] No random colors — tokens used
- [ ] No layout break or overflow

## API Gate

- [ ] Input validation works
- [ ] Authentication enforced
- [ ] Permissions enforced
- [ ] Error handling is safe (no stack traces)
- [ ] No sensitive data leaked
- [ ] API consumers (storefront, dashboard, admin) considered

## Theme Gate

- [ ] Storefront only — changes don't affect dashboard
- [ ] No CSS leakage to merchant-dashboard
- [ ] Fallback theme exists (if applicable)
- [ ] RTL and mobile verified
- [ ] CSS is scoped properly
- [ ] ProductDetail, Home, Header, Footer checked

## RBAC Gate

- [ ] Page-level permissions enforced
- [ ] Action-level permissions enforced
- [ ] Branch/location scope respected
- [ ] API enforces permissions (not just UI)
- [ ] Audit logging considered for sensitive actions

## Data Gate

- [ ] No destructive migration without approval
- [ ] Seed data not polluted
- [ ] No test data in production-like flows
- [ ] Rollback plan exists for migrations

## Ops Gate

- [ ] Known errors in area checked
- [ ] Related incidents in ISSUE_KNOWLEDGE_BASE checked
- [ ] Monitoring notes updated if needed
- [ ] Support impact considered
