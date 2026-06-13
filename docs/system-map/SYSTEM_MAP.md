# System Map

> Operational architecture map for any agent or developer working on this project.
>
> Answers: Where is everything? What connects to what? What must never be mixed?

---

## 1. Layer Locations

| Layer | Directory | Purpose |
|-------|-----------|---------|
| **API Server** | `apps/api/` | Hono backend — routes, middleware, services, workers |
| **Merchant Dashboard** | `apps/merchant-dashboard/` | React SPA for merchants managing their store |
| **Storefront** | `apps/storefront/` | React SPA for customers browsing & buying |
| **Admin Dashboard** | `apps/admin-dashboard/` | React SPA for platform-wide admin |
| **Shared Types/Schemas** | `packages/shared/` | Zod schemas, TypeScript types, error codes, constants |
| **Database** | `packages/db/` | Drizzle schema, migrations, seeds, client |
| **Commerce Core** | `packages/commerce-core/` | Order state machine, cart logic, pricing |
| **Auth Core** | `packages/auth-core/` | Authentication, RBAC, permission checks |
| **Shipping Core** | `packages/shipping-core/` | Carrier integration, label generation |
| **Notification Core** | `packages/notification-core/` | Email, SMS, push notifications |
| **Integration Core** | `packages/integration-core/` | Third-party integrations |
| **Marketplace Core** | `packages/marketplace-core/` | Marketplace features |
| **Wallet Core** | `packages/wallet-core/` | Digital wallet |
| **Theme Engine** | `packages/theme-engine/` | Theme rendering core |
| **Theme System** | `packages/theme-system/` | Theme management |
| **Theme React** | `packages/theme-react/` | React bindings for themes |
| **Theme Web** | `packages/theme-web/` | Web-specific theme utilities |
| **System Themes** | `packages/system-theme/` | Built-in system themes |
| **Storefront Themes** | `packages/storefront-themes/` | Storefront theme packages |
| **UI Components** | `packages/ui/` | Shared React UI components |
| **Ops / Monitoring** | `scripts/` | Health checks, monitoring, error analysis |
| **Support Docs** | `docs/support/` | Error catalog, playbook, escalation |
| **Ops Docs** | `docs/ops/` | Task tracker, state, changelog, decisions |
| **System Map** | `docs/system-map/` | This directory |
| **Storage** | `storage/` | NDJSON event logs |
| **Agent Constitution** | `AGENTS.md` | Project rules and methodology |

---

## 2. Layer Responsibilities

### apps/api
- **Only backend** — no frontend code, no React, no JSX
- Routes, middleware, services, workers, webhooks
- Talks to database through `@haa/db`
- Talks to shared types through `@haa/shared`
- Talks to business logic through `@haa/commerce-core`, `@haa/auth-core`, etc.
- Mounts error handlers, request ID middleware, CORS, auth middleware
- Has its own `src/middleware/`, `src/routes/`, `src/services/`

### apps/merchant-dashboard
- **Only merchant UI** — no customer-facing code, no theme packages
- React SPA with Vite
- Uses `@haa/ui` for shared components
- Uses `@haa/shared` for types and schemas
- Must NOT import from `storefront/`, `storefront-themes/`, `theme-*` packages

### apps/storefront
- **Only customer-facing UI** — no dashboard code, no admin code
- React SPA with Vite
- Uses themes from `packages/storefront-themes/`
- Uses `@haa/shared` for types
- Must NOT import from `merchant-dashboard/`, `admin-dashboard/`

### packages/shared
- **Leaf dependency** — imports nothing from other workspace packages
- Pure types, Zod schemas, constants, error codes, utilities
- Everything else depends on it

### packages/db
- **Database gateway** — schema, migrations, seeds, Drizzle client
- No business logic
- No HTTP knowledge

### packages/commerce-core
- **Order & cart business logic** — state machine, pricing, validation
- Pure logic, no HTTP, no I/O
- Depends on `@haa/shared` for types

---

## 3. Strict Boundaries (Must NOT Cross)

This is the most important section. Violations cause data leakage, permission bypass, and runtime errors.

```
admin-dashboard ──✗── storefront themes (main entry)
merchant-dashboard ──✗── storefront themes (main entry)
storefront ──✗── merchant-dashboard components
theme-* packages ──✗── dashboard apps
api ──✗── any frontend app code
packages/shared ──✗── any app package
```

| Violation | Risk |
|-----------|------|
| Dashboard imports storefront theme main entry | DOM manipulation, CSS leakage, wrong UI |
| Dashboard imports `@haa/theme-system` main entry | `applyTheme()` writes to `document.documentElement`, mutates CSS globally, injects GTM/GA/FB scripts |
| API imports dashboard component | Runtime error, wrong dependency |
| Storefront imports dashboard component | Cross-context confusion |
| Theme imports dashboard logic | Security bypass |
| shared imports anything from apps | Circular dependency, build breaks |

### Allowed Import Map

| App / Package | May Import From | Must NOT Import From |
|--------------|----------------|---------------------|
| `apps/storefront` | `@haa/storefront-themes` (full), `@haa/theme-system` (full), `@haa/ui`, `@haa/shared` | `apps/merchant-dashboard`, `apps/admin-dashboard` |
| `apps/merchant-dashboard` | `@haa/ui`, `@haa/shared`, `@haa/system-theme`, `@haa/theme-react`, `@haa/theme-system/server`\*, `@haa/storefront-themes/server`\* | `@haa/theme-system` (main), `@haa/storefront-themes` (main), `apps/storefront`, `apps/admin-dashboard` |
| `apps/admin-dashboard` | `@haa/ui`, `@haa/shared`, `@haa/system-theme`, `@haa/theme-react`, `@haa/theme-system/server`\*, `@haa/storefront-themes/server`\* | `@haa/theme-system` (main), `@haa/storefront-themes` (main), `apps/storefront`, `apps/merchant-dashboard` |
| `apps/api` | `@haa/shared`, `@haa/db`, business logic packages, `@haa/theme-system/server`\* | Any frontend-only package (`@haa/ui`, `@haa/storefront-themes` main, `apps/*`) |
| `packages/shared` | nothing workspace-internal | Everything else |
| `packages/storefront-themes` | `@haa/theme-system` (full), `@haa/shared`, `react` | Dashboard apps, `@haa/system-theme` |
| `packages/theme-system` | `@haa/shared` | Dashboard apps, `@haa/system-theme` |
| `packages/system-theme` | `@haa/shared`, `@haa/ui` | `@haa/storefront-themes`, `@haa/theme-system` (main) |
| `packages/theme-react` | `@haa/shared`, `@haa/theme-engine` | `@haa/storefront-themes`, `@haa/theme-system` (main) |

> \* `@haa/theme-system/server` and `@haa/storefront-themes/server` are dashboard-safe subpaths that export only server-safe functions (registry reads, config resolution, validation). No DOM manipulation.

---

## 4. Request Flow (UI → API → DB)

```
Browser
  │
  ▼
[storefront] or [merchant-dashboard]
  │  React SPA, makes fetch() to /api/*
  │  Carries X-Request-Id header (set by request-id middleware)
  ▼
[api] Hono router
  │  ├─ auth middleware → checks JWT + RBAC
  │  ├─ request-id middleware → generates/forwards correlationId
  │  ├─ validation middleware → Zod schema check
  │  └─ error handler → catches all errors, writes to support-error-log
  ▼
[api service or commerce-core]
  │  Business logic, validation, state transitions
  ▼
[db] Drizzle query
  │
  ▼
PostgreSQL
```

### Response flow

```
db → api service → api route → Hono response → Browser
                                      │
                                      └─ error handler (if error)
                                           ├─ writes support-error-event (NDJSON)
                                           ├─ returns safe JSON to client
                                           └─ (optional) external monitor.captureException()
```

---

## 5. Theme Flow

```
[merchant selects theme in dashboard]
  │
  ▼
[api] updates merchant.theme_id
  │
  ▼
[customer visits storefront]
  │
  ▼
[storefront] loads theme package from packages/storefront-themes/
  │  ├─ theme-{id} package contains components, styles, templates
  │  └─ rendered inside storefront Layout component
  ▼
[customer sees themed storefront]
  │
  └─ If theme fails → ErrorBoundary catches → STORE-001/THEME-001 event
```

**Key rule:** Themes ONLY affect storefront. Merchant dashboard and admin dashboard use their own fixed UI (`packages/ui`).

---

## 6. Permission / RBAC Flow

```
[user action in dashboard]
  │
  ▼
[API route] calls checkPermission(userId, action, resource)
  │
  ▼
[auth-core] checks:
  │  ├─ Does user have role with this permission?
  │  ├─ Does user have branch/location scope?
  │  └─ Is the resource in the user's scope?
  │
  ├─ ✅ Allowed → proceed
  └─ ❌ Denied → return RBAC-001 error
```

**Enforcement points:**
- API middleware: `requirePermission('orders:update')`
- UI: Conditional rendering based on `usePermissions()` hook
- **UI hiding is NOT a substitute for API enforcement**

---

## 7. Order / Payment / Shipping Flow

```
[customer adds to cart]
  │  commerce-core: CartService
  ▼
[customer checks out]
  │  commerce-core: OrderService.create()
  ▼
[order created] status: pending
  │
  ├─ [payment] → PAY-001 if provider fails
  │     commerce-core: PaymentService.initialize()
  │     status: paid | failed
  ▼
[order confirmed] status: confirmed
  │
  ├─ [shipping] → SHIP-001 if carrier fails
  │     shipping-core: LabelService.generate()
  │     status: shipped
  ▼
[order delivered] status: delivered
```

**State machine:** `pending → confirmed → processing → shipped → delivered → completed`
**Cancellation allowed from:** `pending`, `confirmed`, `processing`
**Errors produce:** ORDER-001 (invalid transition), PAY-001, SHIP-001

---

## 8. Error Entry Points

Where errors enter the system:

| Entry Point | Component | Default Code |
|-------------|-----------|-------------|
| API route handler | `apps/api/src/middleware/error-handler.ts` | API-001 |
| Dashboard React error | `apps/merchant-dashboard/src/components/ErrorBoundary.tsx` | DASH-001 |
| Storefront React error | `apps/storefront/src/components/ErrorBoundary.tsx` | STORE-001 |
| Theme runtime error | Theme component → ErrorBoundary catches | THEME-001 / THEME-002 |
| Payment provider error | `commerce-core` → API error handler | PAY-001 |
| Shipping provider error | `shipping-core` → API error handler | SHIP-001 |
| RBAC denial | `auth-core` → API middleware | RBAC-001 |
| Webhook failure | `apps/api/src/routes/webhooks/` | WEBHOOK-001 |
| Background job failure | `apps/api/src/worker/` | JOB-001 |
| Validation failure | Zod schema → API middleware | VALIDATION-001 |
| Network failure | Browser fetch() fails | NETWORK-001 |
| Unclassified | Fallthrough in error-handler.ts | SYS-001 |

---

## 9. Error Logging Flow

```
[error occurs]
  │
  ▼
[ErrorBoundary or error-handler.ts]
  │  ├─ Generates correlationId (if not already present)
  │  ├─ Determines errorCode (from error.code or default by component)
  │  └─ Calls reportSupportError()
  ▼
[support-error-log.ts]
  │  ├─ Sanitizes sensitive fields (passwords, tokens, cards → [REDACTED])
  │  ├─ Strips stack traces unless NODE_ENV=development
  │  ├─ Builds SupportErrorEvent with eventId, fingerprint, severity
  │  └─ Appends to storage/support-error-events.ndjson
  ▼
[support-error-events.ndjson]
  │
  ├─ Read by scripts/analyze-support-errors.mjs (pnpm ops:errors)
  │     ├─ Shows counts by severity, errorCode, fingerprint, app, route
  │     ├─ Highlights P0 alerts → suggests INCIDENT
  │     ├─ Highlights repeated P1 (≥3) → suggests TASK
  │     └─ Highlights repeated fingerprints (≥3) → suggests RCA
  │
  └─ Read by scripts/generate-monitoring-report.mjs
        └─ Included in monitoring report
```

---

## 10. Error → Task/Incident Flow

```
[event in support-error-events.ndjson]
  │
  ▼
[pnpm ops:errors analyzes]
  │
  ├─ P0 detected? → Recommend INCIDENT
  │     Create entry in docs/ops/INCIDENTS.md
  │     Stop normal development
  │
  ├─ P1 repeated ≥3? → Recommend TASK
  │     Create entry in docs/ops/TASK_TRACKER.md
  │     Assign to developer
  │
  └─ Fingerprint repeated ≥3? → Recommend RCA
        Create entry in docs/ops/ISSUE_KNOWLEDGE_BASE.md
        Investigate root cause
```

**Closed loop:**
1. Error captured → 2. Event stored → 3. Analysis runs → 4. Task/Incident created → 5. Fix implemented → 6. Verification → 7. Regression check

---

## Critical Paths Summary

| Critical Path | Breaks If | Detected By |
|---------------|-----------|-------------|
| Store loads | storefront server down, theme broken | STORE-001, THEME-001 |
| Dashboard loads | dashboard server down, API down | DASH-001, API-001 |
| Checkout completes | payment/shipping provider down | PAY-001, SHIP-001 |
| Order state changes | commerce-core bug, DB down | ORDER-001, SYS-001 |
| User permissions | auth-core bug, RBAC config wrong | RBAC-001 |
| Webhook receives | integration-core bug, endpoint down | WEBHOOK-001 |
| Background job runs | worker down, queue broken | JOB-001 |
