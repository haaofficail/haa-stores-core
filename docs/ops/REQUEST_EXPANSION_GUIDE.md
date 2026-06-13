# Request Expansion Guide

> Practical examples of converting raw user requests into professional task briefs.

---

## Example 1: "صلح الفوتر" (Fix the footer)

### Interpreted Task

- **Original user request:** صلح الفوتر
- **What I think the user wants:** Fix the storefront footer — likely spacing, height, RTL, mobile, or visual consistency issues
- **Task type:** Bug Fix, UX/UI Polish
- **Assumptions:** The footer is in the storefront app; the issue is visual/layout related
- **Scope:**
  - Storefront footer component
  - Spacing, RTL, mobile responsiveness
  - Visual consistency with design tokens
- **Out of scope:**
  - Merchant dashboard footer
  - Admin dashboard footer
  - Footer content/API data
  - Theme engine changes
- **Affected areas:** `apps/storefront`, theme packages
- **Files to inspect:** Footer component files in storefront, theme CSS files
- **Risks:** CSS leakage to merchant-dashboard if theme styles are not scoped
- **Acceptance criteria:**
  - Footer is not excessively tall
  - RTL layout is correct
  - Mobile layout is correct
  - Merchant dashboard is unaffected
  - No CSS leakage
  - Design tokens used for spacing
- **Test plan:**
  - `pnpm typecheck`
  - Visual check on storefront (RTL + mobile)
  - Visual check on merchant-dashboard (no regression)
  - Review CSS for leakage
- **Documentation updates needed:** TASK_TRACKER, CURRENT_STATE (if state changes)

---

## Example 2: "أضف صلاحيات الموظفين" (Add employee permissions)

### Interpreted Task

- **Original user request:** أضف صلاحيات الموظفين
- **What I think the user wants:** Implement or extend RBAC for merchant employees — page permissions, action permissions, branch scope
- **Task type:** Feature, Permission/RBAC Work
- **Assumptions:** RBAC system exists in auth-core; this is adding new permissions or roles
- **Scope:**
  - Permission definitions
  - API endpoint enforcement
  - UI conditional rendering based on permissions
  - Branch/location scope
- **Out of scope:**
  - Storefront permissions (customer-facing)
  - Platform admin permissions (separate system)
  - Authentication flow
- **Affected areas:** `packages/auth-core`, `apps/api`, `apps/merchant-dashboard`
- **Files to inspect:** Auth core permission definitions, API route middleware, dashboard UI components
- **Risks:** Adding permissions in UI without API enforcement creates a security gap
- **Acceptance criteria:**
  - Employee cannot see pages they lack permission for
  - API rejects unauthorized actions with proper error
  - Branch/location scope is respected
  - No cross-store data leakage
  - Audit trail is logged for sensitive actions
- **Test plan:**
  - `pnpm typecheck`
  - Unit tests for permission logic
  - API integration test for unauthorized access
  - UI manual check with different roles
- **Documentation updates needed:** TASK_TRACKER, CURRENT_STATE, REGRESSION_CHECKLIST (add UI-only permission check)

---

## Example 3: "المتجر لا يعمل" (Store not working)

### Interpreted Task

- **Original user request:** المتجر لا يعمل
- **What I think the user wants:** Diagnose why the storefront is not loading or functioning correctly
- **Task type:** Bug Fix, Support/Ops
- **Assumptions:** Storefront was previously working; this is a regression or environmental issue
- **Scope:**
  - Storefront runtime errors
  - API connectivity
  - Route configuration
  - Theme loading
  - Data availability
- **Out of scope:**
  - Merchant dashboard
  - Admin dashboard
  - New features
  - Refactoring
- **Affected areas:** `apps/storefront`, `apps/api` (if API issue), theme packages
- **Files to inspect:** Storefront app entry, routes, API client, theme config, logs
- **Risks:** Applying a fix without knowing the root cause may introduce new issues
- **Acceptance criteria:**
  - Root cause is identified and documented in ISSUE_KNOWLEDGE_BASE
  - Fix is scoped to the root cause only
  - Storefront loads and functions correctly
  - Merchant dashboard is unaffected
  - `pnpm typecheck` passes
- **Test plan:**
  - `pnpm typecheck`
  - Load storefront in browser (RTL + mobile)
  - Test key flows (home, product, cart, checkout)
  - Verify merchant dashboard unaffected
- **Documentation updates needed:** ISSUE_KNOWLEDGE_BASE, TASK_TRACKER, CURRENT_STATE, REGRESSION_CHECKLIST (if new regression check needed)

---

## Example 4: "خلها احترافية" (Make it professional)

### Interpreted Task

- **Original user request:** خلها احترافية
- **What I think the user wants:** General UX/UI polish — improve visual quality, consistency, and professionalism
- **Task type:** UX/UI Polish
- **Assumptions:** This is a broad visual improvement request; must be narrowed to specific pages/components
- **Scope:** (Must be narrowed — ask which page or component)
  - If no specific page given, scope to one page only (e.g., ProductDetail)
  - Hierarchy, spacing, RTL, mobile, states, consistency, accessibility
- **Out of scope:**
  - New features
  - Backend changes
  - Multiple pages in one task
- **Affected areas:** Specific page/component in `apps/storefront`
- **Files to inspect:** Component files for the target page
- **Risks:** Vague scope leads to unbounded work; must fix a specific scope
- **Acceptance criteria:**
  - Visual hierarchy is clear (F/Z scanning pattern)
  - Spacing uses design tokens
  - RTL is correct
  - Mobile layout is correct
  - Loading, empty, error states exist
  - No random colors or hardcoded values
- **Test plan:**
  - `pnpm typecheck`
  - Visual review on storefront (desktop + mobile + RTL)
  - Check merchant dashboard for regressions
- **Documentation updates needed:** TASK_TRACKER, CURRENT_STATE

---

## Example 5: "فيه خطأ" (There's an error)

### Interpreted Task

- **Original user request:** فيه خطأ
- **What I think the user wants:** There is an error occurring somewhere in the application
- **Task type:** Bug Fix, Support/Ops
- **Assumptions:** The error is visible or logged; needs diagnosis before fix
- **Scope:**
  - Identify the error (logs, console, UI)
  - Determine root cause
  - Fix within scope
- **Out of scope:**
  - Unrelated refactoring
  - Features
  - Changes outside the error's area
- **Affected areas:** (Depends on error location)
- **Files to inspect:** Logs (`api.log`, `dashboard.log`), console errors, recently changed files
- **Risks:** Fixing the symptom without fixing the root cause
- **Acceptance criteria:**
  - Error is no longer reproducible
  - Root cause is documented in ISSUE_KNOWLEDGE_BASE
  - No regressions in related areas
  - `pnpm typecheck` passes
- **Test plan:**
  - Reproduce the error scenario
  - Verify error is gone
  - Run `pnpm typecheck`
  - Check related flows for regressions
- **Documentation updates needed:** ISSUE_KNOWLEDGE_BASE, TASK_TRACKER, CURRENT_STATE (if state changed)
