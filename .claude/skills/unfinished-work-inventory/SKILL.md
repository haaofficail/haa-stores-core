---
name: unfinished-work-inventory
description: Use this skill when auditing the repo for partial/stub/mock/disabled work, or before estimating the cost of a sprint. Catalogues unfinished code without fixing it.
disable-model-invocation: true
---

# Unfinished Work Inventory

## Purpose

Find work that _looks_ shipped but isn't. Catalogue it in `ISSUE_REGISTER.md` so it's visible to planning, without fixing it inline.

## Read First

- `docs/agent-os/CURRENT_SYSTEM_AUDIT.md` (existing inventory).
- `docs/agent-os/ISSUE_REGISTER.md` (existing rows; avoid duplicates).
- `AGENTS.md §7` (forbidden to deliver half-finished implementations).

## Rules

1. Read-only — never fix during inventory.
2. Every entry carries Evidence (file:line or command output).
3. Filter out vendor noise (`node_modules`, `.next`, `dist`, `storybook-static`).
4. Distinguish "intentional placeholder for input UI" from "incomplete feature" — only the latter is unfinished work.
5. Use `priority-triage-gate` to assign priority; do not invent.

## Steps

1. Scan source-only paths:
   ```
   grep -rnE "(TODO|FIXME|HACK|XXX|stub|mock|placeholder|coming soon|@deprecated|disabled|not implemented|hardcoded|temporary|workaround|pending|incomplete)" \
     apps/*/src packages/*/src 2>/dev/null \
     | grep -v "node_modules"
   ```
2. Classify each hit by area: storefront / merchant dashboard / admin / auth-RBAC / products / orders / checkout-cart / payments / shipping / wallet / coupons-marketing / affiliate-referral / domains / themes / analytics / support / onboarding / compliance / CI-CD / docs-runbooks.
3. Verify each hit by reading 5–10 surrounding lines (some are misleading — e.g. placeholders in input fields).
4. Add new rows to `ISSUE_REGISTER.md` with classification, priority, recommended action.
5. Do not edit any source file.

## Output

```
Inventory pass — <date>
Surfaces scanned: apps/*/src + packages/*/src
True findings: <n> (added as ISSUE-NNNN … ISSUE-NNNN)
False positives (excluded): <n> with one-line reason each
Already tracked: <n> (cross-reference existing ISSUE-NNNN)
```
