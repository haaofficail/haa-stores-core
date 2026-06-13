# Testing Strategy

> Defines the testing approach for each change type.

---

## Test Types

### 1. TypeScript Typecheck
- **When:** After every code change
- **Command:** `pnpm typecheck`
- **Scope:** All TypeScript files in affected packages and apps
- **Mandatory:** Yes — must pass or reason documented

### 2. Lint
- **When:** After every code change
- **Command:** `pnpm lint`
- **Scope:** All files
- **Mandatory:** Yes — should pass; warnings documented if unavoidable

### 3. Unit Tests
- **When:** For isolated logic in packages or utility functions
- **Command:** `pnpm test` or targeted vitest run
- **Scope:** Business logic, validation, data transformations
- **Mandatory:** Yes, if the change adds or modifies testable logic

### 4. Integration Tests
- **When:** For API endpoints, service interactions, multi-layer flows
- **Command:** `pnpm test` (integration test files)
- **Scope:** API routes, database interactions, auth flows
- **Mandatory:** Recommended for API changes

### 5. UI Manual Checks
- **When:** For any UI change (storefront, dashboard)
- **Scope:**
  - Visual hierarchy and spacing
  - RTL layout
  - Mobile responsiveness
  - Loading, empty, error states
  - Design token usage
- **Mandatory:** Yes — must be performed and documented

### 6. RBAC Verification Checks
- **When:** For any permission or role change
- **Scope:**
  - UI hides unauthorized actions
  - API rejects unauthorized actions
  - Branch/location scope respected
- **Mandatory:** Yes

### 7. Theme Isolation Checks
- **When:** For any storefront or theme change
- **Scope:**
  - Storefront renders correctly
  - Merchant dashboard unaffected
  - No CSS leakage
- **Mandatory:** Yes

### 8. Regression Checks
- **When:** When fixing a bug that could regress
- **Scope:** REGRESSION_CHECKLIST items relevant to the change
- **Mandatory:** Yes — or reason documented

### 9. Smoke Checks
- **When:** After significant changes or before phase gates
- **Command:** `pnpm smoke`
- **Scope:** Core user paths (home → product → cart → checkout)
- **Mandatory:** Recommended for significant releases

---

## Per-Change Test Requirements

| Change Type | Typecheck | Lint | Unit | Integration | UI Manual | RBAC | Theme Isolation | Regression |
|-------------|-----------|------|------|-------------|-----------|------|----------------|------------|
| Bug Fix (logic) | ✅ | ✅ | ✅ | ✅ | | | | ✅ |
| Bug Fix (UI) | ✅ | ✅ | | | ✅ | | ✅ | |
| Feature (API) | ✅ | ✅ | ✅ | ✅ | | ✅ | | |
| Feature (UI) | ✅ | ✅ | | | ✅ | | ✅ (storefront) | |
| Refactor | ✅ | ✅ | ✅ | ✅ | | | | ✅ |
| Theme | ✅ | ✅ | | | ✅ | | ✅ | ✅ |
| RBAC | ✅ | ✅ | ✅ | ✅ | | ✅ | | ✅ |
| Docs only | | | | | | | | |

---

## Rule

If a required test is not run, the reason must be documented clearly in the final report.
