# TODO triage — Haa Stores

**Audit reference:** P3-002 of the 2026-06-23 deep audit.
**Scan basis:** `grep -rnE "TODO[: ]|FIXME[: ]|XXX[: ]|HACK[: ]" apps/ packages/ --include="*.ts" --include="*.tsx"` on `origin/main` at remediation time.
**Total matches:** 14 (audit baseline reported 38 with a wider regex including `*.md` and inline doc strings; production code surface is the 14 below).

## Classification

| Category                                      | Count | Action                            |
| --------------------------------------------- | ----: | --------------------------------- |
| Tracked under existing issue (lucide P1-#5)   |     7 | KEEP — anchors for `ISSUE-0009`   |
| False positives (escape sequence / docstring) |     2 | KEEP — not TODOs                  |
| Real schema / feature follow-ups              |     3 | TRACK — link to issue register    |
| Real security follow-up (2FA for deletion)    |     1 | TRACK — already `ISSUE-0010` (P1) |
| Other                                         |     1 | KEEP                              |

## Full inventory

### Tracked under `ISSUE-0009` — lucide direct-import migration

| File                                                                               | Line | Note                                           |
| ---------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| `apps/storefront/src/landing/sections/Nav.tsx`                                     | 11   | eslint-disable anchor, `TODO: P1-#5 migration` |
| `apps/storefront/src/components/LoyaltyBalanceCard.tsx`                            | 29   | eslint-disable anchor                          |
| `apps/storefront/src/pages/Cart.tsx`                                               | 10   | eslint-disable anchor                          |
| `apps/storefront/src/pages/Auth.tsx`                                               | 6    | eslint-disable anchor                          |
| `apps/storefront/src/pages/ProductDetail.tsx`                                      | 12   | eslint-disable anchor                          |
| `apps/storefront/src/pages/Checkout.tsx`                                           | 18   | eslint-disable anchor                          |
| `apps/storefront/src/themes/base-elegant/ProductPage.tsx`                          | 11   | eslint-disable anchor                          |
| `apps/storefront/src/themes/luxury-showcase/components/LuxuryProductInfoPanel.tsx` | 3    | eslint-disable anchor                          |

These are intentional eslint-disable comments anchored to the lucide → `<Icon>` migration. **DO NOT remove the comments without completing the migration in the same PR** — the file-level disable is the only thing keeping CI green on those files. Tracked as `ISSUE-0009` (P2).

### False positives

| File                                    | Line | Reason                                                           |
| --------------------------------------- | ---- | ---------------------------------------------------------------- |
| `apps/storefront/src/lib/validation.ts` | 33   | Arabic JSDoc — `05XXXXXXXX` is a phone format mask, not a TODO   |
| `apps/storefront/src/lib/jsonld.ts`     | 6    | Documents `\uXXXX` escape pattern for XSS prevention, not a TODO |

No action.

### Real schema follow-ups (need DB migration + writer + reader changes)

#### TODO-S1: codStatus field on shipments

- **File:** `packages/commerce-core/src/shipments-service.ts:156`
- **Text:** `add a dedicated codStatus field (confirmed/rejected) when the merchant-COD-…`
- **Scope:** schema column + service writer + admin UI reader.
- **Owner action:** stakeholder approval on the COD state machine before engineering.
- **Suggested issue:** TODO-S1 → file in `ISSUE_REGISTER.md` as a new P2.

#### TODO-S2: preparationStatus field on orders

- **File:** `packages/commerce-core/src/shipments-service.ts:164`
  Also referenced from `apps/merchant-dashboard/src/lib/order-actions.ts:120` (the merchant-dashboard gate that will consume the field once it exists).
- **Text:** `add a preparationStatus field (unfulfilled → prepared → packed) and gate`
- **Scope:** schema column + state machine + merchant UI status badges.
- **Owner action:** stakeholder approval on the preparation states.
- **Suggested issue:** TODO-S2 → file as a new P2.

### Real security follow-up — already tracked as ISSUE-0010

| File                                   | Line | Status                                                            |
| -------------------------------------- | ---- | ----------------------------------------------------------------- |
| `apps/api/src/routes/merchant-data.ts` | 22   | `// No 2FA confirmation step for deletion (TODO for Session #3+)` |

This is `ISSUE-0010` in `docs/agent-os/ISSUE_REGISTER.md` (P1, security-sensitive). **No action this batch** — needs a 2FA infrastructure decision first. The comment IS the tracker.

## Outcome

- 7 lucide anchors → kept; tracked as ISSUE-0009
- 2 false positives → kept (not TODOs)
- 3 real schema/security TODOs → tracked under TODO-S1, TODO-S2, ISSUE-0010 (existing)
- 0 code changes from this triage

This is a **classification PR**, not a code change. It produces the audit's missing index of what each TODO is for, so future agents don't keep rediscovering them.
