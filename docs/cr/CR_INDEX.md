# Code Review Bundle — `feature/phase-9-cod-fee-policy`

> Everything the reviewer needs. Local-only (no remote / no PR system).
> **Branch:** `feature/phase-9-cod-fee-policy` → `main`
> **Generated:** 2026-06-18

---

## Files in this bundle

| File | Purpose | Read time |
|---|---|---|
| `PR_DESCRIPTION.md` | TL;DR + scope + what shipped + tests + breaking changes | 5 min |
| `CR_DIFF_SUMMARY.md` | 30-second orientation — by-area, by-category, top files | 5 min |
| `CR_RISK_REGISTER.md` | Every area to scrutinize, ranked by blast radius × likelihood | 10 min |
| `CR_REVIEW_CHECKLIST.md` | Systematic 7-phase review procedure (copy-paste) | ongoing |

---

## Quick start

```bash
# 1. Pre-flight
pnpm preflight && pnpm typecheck && pnpm test

# 2. Pre-launch smoke (29 checks, 30s)
pnpm test tests/pre-launch-smoke.test.ts

# 3. Tier-1 risks (financial / regulatory)
#    See CR_RISK_REGISTER.md → Tier 1
```

---

## Verdict template

After review, write your verdict in `CR_VERDICT.md` (one of):

- **APPROVED** — ready to merge to main
- **APPROVED WITH FOLLOW-UPS** — merge now, file issues for non-blockers
- **CHANGES REQUESTED** — must fix before merge
- **BLOCKED** — critical issue, do not merge

---

## Sign-off chain

- [ ] Reviewer: _______________ Date: _______________
- [ ] Owner: _______________ Date: _______________

**Owner sign-off is required** before merging to main (per AGENTS.md: solo founder has final say on all merges).
