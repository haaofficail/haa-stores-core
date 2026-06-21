---
name: design-ux-excellence-gate
description: Use this skill when changing any UI/storefront/dashboard surface and before claiming done. Checks RTL, mobile, hierarchy, spacing, typography, contrast, CTA, states, accessibility, tokens.
disable-model-invocation: true
---

# Design UX Excellence Gate

## Purpose

Stop "ship-the-mockup" design. Every UI change clears a concrete bar, not a vibe check.

## Read First

- `AGENTS.md §9` (spacing, icons, cards, RTL, libraries).
- `docs/agent-os/QUALITY_GATES.md §6` (design/UX quality).
- `docs/agent-os/DEFINITION_OF_DONE.md §UI`.
- `docs/agent-os/OWNER_DECISIONS.md` DECISION-OS-003 (no parallel theme system).

## Rules

1. RTL first. No hardcoded `left`/`right`; use `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`, `text-align: start/end`.
2. Mobile (~360–414px viewport) is required, not optional. No horizontal overflow.
3. Spacing through tokens (`--space-0` … `--space-16`). No hardcoded `px` in components.
4. Icons through Lucide (`AGENTS.md §9.5`); sizes per `§9.2`; hit area ≥ 44px.
5. Product cards equal visual height in grids; title clamped to 2 lines; action area pinned to bottom (`§9.3`).
6. States required: empty, loading, error, success. Each tested at least once.
7. Contrast ≥ WCAG AA for text.
8. CTA hierarchy: one primary CTA per screen section; secondary actions visually subordinate.
9. New theme work goes into `@haa/storefront-themes` (DECISION-OS-003); no parallel theme package.
10. Auth pages background pure white (per memory `auth-pages-pure-white`).

## Steps

1. Identify the change (component, page, theme).
2. Manual viewport check at ~390px (mobile) and ≥1280px (desktop), both with RTL.
3. Walk the four states (empty/loading/error/success) for the affected surface.
4. Verify spacing/icons/cards/contrast/CTA hierarchy against the rules.
5. Run accessibility focus check (Tab through interactive elements, focus ring visible).
6. Confirm no theme drift introduced.

## Output

```
UX check — <component/page>
Viewport: desktop ✓ mobile ✓
RTL: ✓ no hardcoded left/right
Spacing/icons/cards: ✓
Contrast: ✓ AA
CTA hierarchy: ✓
States: empty ✓ loading ✓ error ✓ success ✓
Accessibility (focus, hit area): ✓
Theme canonical: extends @haa/storefront-themes
Result: PASSED / NEEDS-FIX (list)
```
