# Phase 2 Roadmap — Marketplace / SFDA / Affiliate

> **Status:** Tracking only. Engineering execution gated.
> **Scope:** Items intentionally deferred to Phase 2 per Autopilot W19.
> **Source of truth:** This file lists Phase 2 items. Owner gates G1–G10
> still apply where indicated.

---

## 1. Public Marketplace (Haa Marketplace) — Phase 2 hardening

**Current state:** Working in beta on `/marketplace` storefront route.
`apps/api/src/routes/haa-marketplace.ts` + `packages/marketplace-core/`.

**Phase 2 hardening (deferred):**

- New marketplace audit pass. The two existing audits
  (`MARKETPLACE_AUDIT_REPORT.md` at repo root + `docs/ops/PUBLIC_MARKETPLACE_AUDIT.md`)
  are STALE per DECISION-OS-002 and are NOT authoritative.
- Anti-spam: rate-limit on listing creation per merchant.
- Featured-listing flow + ranking algorithm definition.
- Anti-fraud signals on the order side (high-risk customer / cancellations).
- Cross-merchant search relevance tuning (currently naive).

**Blockers:**

- Marketplace beta success criteria not yet defined by owner.
- SFDA category enforcement (item 2 below) is a hard prerequisite for
  the "regulated goods" surface (food, cosmetics, medical).

---

## 2. SFDA / Category enforcement — public marketplace prerequisite

**Current state:** No SFDA-controlled-category enforcement. Merchants
can list anything in any category. For closed-beta this is acceptable.
For a public marketplace it is NOT.

**Phase 2 work:**

- Map SFDA-regulated categories to internal `category.code` values.
- Add per-category submission requirement (e.g. cosmetics → SFDA
  registration number on the product page).
- Admin review queue for newly-listed regulated products.
- Audit-log row on every SFDA-relevant approval.

**Blockers:**

- Owner provides the official SFDA category list (currently no
  authoritative copy in the repo).
- Owner decides the human-review threshold (auto-approve below X SAR?
  always require review?).

---

## 3. Affiliate / Referral — Phase 2, AFTER wallet idempotency

**Current state:** Skeleton affiliate-tracking skill exists in
`.claude/skills/affiliate-engine/` (legacy local input, NOT shipped).
No DB tables. No routes. No commission engine.

**Phase 2 work (depends on Wallet idempotency landing first):**

- Platform-affiliate program for new-merchant referrals.
- Merchant-affiliate program for new-customer referrals.
- `ref` / `aff` link rewriter.
- Attribution window + last-click model.
- Commission policy table: % or fixed; pending / approved / rejected
  / paid / reversed lifecycle.
- Manual payout (no automatic transfer in MVP).
- Opt-in only — affiliate commission is NEVER mandatory on merchants.

**Hard dependency:**

- DECISION-OS-018 (Wallet DB idempotency) must be applied on staging
  - verified before affiliate commission can touch the wallet ledger.
    Without it, commission writes can race and double-pay.

**Blockers:**

- Wallet idempotency migration 0073 awaiting owner-gated execution.
- Affiliate UX flow not yet designed.
- Legal review for the affiliate-terms-of-service document.

---

## 4. Anti-references — what NOT to do in Phase 2

- ❌ Do NOT build affiliate before wallet idempotency lands. Race
  conditions on commission posting break the ledger.
- ❌ Do NOT enable the public marketplace tab without SFDA
  enforcement for regulated categories.
- ❌ Do NOT treat the legacy `MARKETPLACE_AUDIT_REPORT.md` or
  `docs/ops/PUBLIC_MARKETPLACE_AUDIT.md` as authoritative — both are
  STALE per DECISION-OS-002.

---

## Cross-reference

- `docs/HAA_TASK_LEDGER.md` §L (Themes/Marketplace) — high-level
  status.
- `docs/agent-os/OWNER_DECISIONS.md` DECISION-OS-002 — marketplace
  audit truth.
- `docs/agent-os/WALLET_IDEMPOTENCY_PLAN.md` — affiliate's hard dep.
- `docs/ops/MARKETPLACE_HARDENING_PLAN.md` — pre-existing detailed plan.
