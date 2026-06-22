# Haa Stores — Comprehensive System Map

> Operational source map for agents, developers, and launch-readiness work.
>
> Purpose: answer **where everything lives**, **what connects to what**, **what is canonical**, **what must never be mixed**, and **what remains gated before production**.
>
> Last remote refresh: 2026-06-22. This refresh is based on GitHub remote inspection only; it does not claim local `pwd`, `git status`, or runtime test execution.

---

## 0. Source-of-truth order

When files disagree, use this order:

1. `AGENTS.md` — project constitution and boundary rules.
2. `docs/agent-os/OWNER_DECISIONS.md` — locked owner/agent decisions.
3. `docs/agent-os/REMAINING_WORK.md` — current remaining work and blocked items.
4. `docs/ops/CURRENT_STATE.md` and `docs/ops/TASK_TRACKER.md` — operations state once truth-synced.
5. Current code under `apps/**`, `packages/**`, `scripts/**`, `.github/workflows/**`.
6. Historical root-level reports only when explicitly marked current; otherwise treat them as archive candidates.

Do **not** treat stale root-level audits or old master plans as canonical unless a current decision explicitly reactivates them.

---

## 1. Canonical product identity

- Product: **Haa Stores / متاجر هاء**.
- System type: **multi-tenant SaaS e-commerce platform**, not a single store.
- Canonical local path for agents: `/Users/thwany/Desktop/haa-stores-core`.
- Official Haa Stores server: `72.61.108.208`.
- Forbidden server for Haa Stores: `187.124.41.239`.
- DNS manager for `haastores.com`: Cloudflare.
- Registrar/mail can remain at Hostinger if MX/SPF/DKIM/DMARC are preserved.
- Canonical platform color: `#5c9cd5`.
- Production live payments/shipping are blocked until owner credentials and explicit approval.

---

## 2. Workspace layout

The workspace is defined by `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

| Layer | Directory | Purpose |
|---|---|---|
| API Server | `apps/api/` | Hono backend: routes, middleware, services, workers, webhooks, static SPA serving hooks |
| Merchant Dashboard | `apps/merchant-dashboard/` | React/Vite SPA for merchants managing stores |
| Storefront | `apps/storefront/` | React/Vite SPA for public shopping, marketplace, landing/store browsing |
| Admin Dashboard | `apps/admin-dashboard/` | Platform-wide administration UI |
| Database | `packages/db/` | Drizzle schema, migrations, seeds, DB client |
| Shared | `packages/shared/` | Zod schemas, shared types, constants, brand tokens, provider codes |
| Auth Core | `packages/auth-core/` | Authentication, RBAC, token-version verification, store/tenant boundary checks |
| Commerce Core | `packages/commerce-core/` | Orders, cart, checkout business logic, domain service, payment orchestration primitives |
| Payment Providers | `packages/payment-providers/` | Provider contracts/adapters, capabilities, status mapping, webhook signature helpers |
| Shipping Core | `packages/shipping-core/` | Provider factory, rates, readiness states, labels, tracking, mock/provider contracts |
| Wallet Core | `packages/wallet-core/` | Ledger/account semantics, payouts, settlements, idempotency policy |
| Notification Core | `packages/notification-core/` | Email/SMS/push notification abstractions |
| Integration Core | `packages/integration-core/` | Third-party integration primitives |
| Marketplace Core | `packages/marketplace-core/` | Public marketplace and multi-store marketplace primitives |
| UI | `packages/ui/` | Shared React UI primitives |
| Storefront Themes | `packages/storefront-themes/` | Canonical storefront theme gateway |
| Theme System | `packages/theme-system/` | Legacy/compatibility theme package; server subpath may be dashboard-safe |
| Theme Engine | `packages/theme-engine/` | Internal theme rendering primitives |
| Theme React | `packages/theme-react/` | Theme React bindings |
| Theme Web | `packages/theme-web/` | Theme web utilities / preview / legacy surface |
| System Theme | `packages/system-theme/` | Platform/dashboard visual identity, not storefront themes |
| Scripts | `scripts/` | Preflight, monitoring, synthetic checks, production checks, DB helpers |
| CI | `.github/workflows/` | Quality, security, deploy workflows |
| Ops docs | `docs/ops/` | Operational state, production readiness, task tracking |
| Agent OS docs | `docs/agent-os/` | Agent decisions, active work, issue register, provider handoff, quality gates |
| System map | `docs/system-map/SYSTEM_MAP.md` | This file |
| Storage | `storage/` | Local NDJSON support/monitoring event logs |

---

## 3. Non-negotiable boundaries

### 3.1 Dependency direction

```txt
apps/*            → packages/* only
apps/api          → backend packages only; no frontend app imports
apps/storefront   → storefront/theme packages + shared/ui; no dashboard imports
merchant-dashboard→ ui/shared/system-theme + server-safe theme subpaths only
admin-dashboard   → ui/shared/system-theme + server-safe theme subpaths only
packages/shared   → leaf dependency; no app imports
```

### 3.2 Forbidden imports

| Consumer | Forbidden |
|---|---|
| `apps/api` | Any frontend app, React UI packages not explicitly backend-safe |
| `apps/storefront` | `apps/merchant-dashboard`, `apps/admin-dashboard` |
| `apps/merchant-dashboard` | storefront app, `@haa/storefront-themes` main/runtime, `@haa/theme-system` main/runtime |
| `apps/admin-dashboard` | storefront app, merchant-dashboard app, runtime theme packages |
| theme packages | dashboard app logic |
| `packages/shared` | any app or higher-level package |

### 3.3 Allowed theme carve-out

Dashboards may use:

- `@haa/storefront-themes/server`
- `@haa/theme-system/server`

Only for types, validation, registry reads, and server-safe helpers. These subpaths must not mutate DOM, inject analytics, or write CSS variables.

---

## 4. API surface map

The API server mounts Hono routes in `apps/api/src/index.ts`.

### 4.1 Global middleware

| Concern | Location |
|---|---|
| Request ID | `apps/api/src/middleware/request-id.ts` |
| Structured logging | `apps/api/src/middleware/structured-logger.ts` |
| Security headers | `apps/api/src/middleware/security-headers.ts` |
| CORS | `apps/api/src/index.ts` via `env.CORS_ORIGINS` |
| CSRF origin defense | `apps/api/src/middleware/csrf-origin.ts` |
| Error handler | `apps/api/src/middleware/error-handler.ts` |
| Rate limiting | `apps/api/src/middleware/rate-limiter.ts` |
| Storage guard | `apps/api/src/middleware/storage-guard.ts` |
| Tenant resolver cache | `apps/api/src/middleware/store-tenant-cache.ts` |

### 4.2 Public routes

| Route | Purpose |
|---|---|
| `/health` | Health router + DB check |
| `/s/*` | Storefront browse/API surface |
| `/marketplace/*` | Public marketplace surface |
| `/assets/*`, `/vite.svg` | Storefront SPA static assets |
| `/resolve-host` | Resolve active/published store by host for subdomain/custom domain bootstrapping |
| `/internal/tls-check` | Caddy on-demand TLS ask endpoint; must only allow active custom domains |
| `/landing-ai-agent` | Landing page AI agent route |
| `/brand` | Platform brand metadata fallback endpoint |
| `/v1` | Public merchant API after Caddy strips `/api` |
| `/webhooks/*` | Provider webhook ingress |

### 4.3 Merchant API routes

All merchant routes are mounted under `/merchant/:storeId/...` and must enforce store access + permission server-side.

| Route | Router | Domain |
|---|---|---|
| `/products` | `productsRouter` | Product catalog |
| `/categories` | `categoriesRouter` | Categories |
| `/brands` | `brandsRouter` | Brands |
| `/tags` | `tagsRouter` | Tags |
| `/uploads` | `uploadsRouter` | Uploads/storage |
| `/customers` | `customersRouter` | Customers |
| `/cart` | `cartRouter` | Merchant-side cart helpers |
| `/checkout` | `checkoutRouter` | Checkout support |
| `/orders` | `ordersRouter`, `codRouter` | Orders + COD operations |
| `/shipping` | `shippingRouter` | Shipping setup/rates |
| `/shipments` | `shipmentsRouter` | Shipment lifecycle |
| `/wallet` | `walletRouter` | Wallet/ledger/settlements |
| `/dashboard` | `dashboardRouter` | Merchant dashboard metrics |
| `/settings` | `settingsRouter` | Store settings |
| `/settings/pixels` | `pixelsRouter` | Pixels/analytics configuration |
| `/provider-status` | `providerStatusRouter` | Payment/shipping/provider status diagnostics |
| `/coupons` | `couponsRouter` | Coupons |
| `/promotions` | `promotionsRouter` | Promotions/offers |
| `/reports` | `reportsRouter` | Reports |
| `/policies` | `policiesRouter` | Pages/policies |
| `/abandoned-carts` | `abandonedCartsRouter` | Abandoned cart tracking |
| `/abandoned-carts/campaigns` | `cartCampaignsRouter` | Cart recovery campaigns |
| `/compliance` | `complianceRouter` | Verification/compliance |
| `/subscriptions` | `subscriptionsRouter` | Store subscription/billing plan |
| `/notifications` | `notificationsRouter` | Merchant notification settings |
| `/api-keys` | `apiKeysRouter` | API key management |
| `/integrations` | `integrationsRouter` | Integration hub |
| `/migration` | `migrationRouter` | Migration/import support |
| `/feeds` | `feedsRouter` | Marketplace/product feeds |
| `/ai` | `aiRouter` | Store AI assistant route |
| `/marketplaces` | `marketplacesRouter` | Sales channels/marketplaces |
| `/payment-providers` | `paymentSettingsRouter` | Payment provider settings/readiness |
| `/employees` | `employeesRouter` | Staff/employees |
| `/permissions` | `permissionsRouter` | Permission management |
| `/audit` | `auditRouter` | Merchant audit logs |
| `/marketing` | `marketingRouter` | Marketing surface |
| `/whatsapp-campaigns` | `whatsappCampaignsRouter` | WhatsApp marketing/compliance |
| `/loyalty` | `loyaltyRouter` | Loyalty program |
| `/domain` | `customDomainRouter` | Subdomain/custom domain verification |
| `/outbound-webhooks` | `outboundWebhooksRouter` | Merchant outbound webhook subscriptions |
| root `/merchant/:storeId` | `merchantDataRouter`, `supportRouter`, `zatcaRouter` | Store data, support, ZATCA subroutes |

### 4.4 Webhook routes

| Route | Purpose |
|---|---|
| `/webhooks` | General payment/provider webhooks |
| `/webhooks/shipping` | Generic shipping webhooks |
| `/webhooks/oto` | OTO shipping webhook endpoint |
| `/merchant/:storeId/outbound-webhooks` | Merchant-configured outbound webhook subscriptions/delivery controls |

---

## 5. Frontend route map

### 5.1 Merchant Dashboard

`apps/merchant-dashboard/src/App.tsx` lazy-loads pages and wraps protected pages with `AuthGuard` and `PermissionRoute`.

| UI route | Permission | Page |
|---|---|---|
| `/dashboard` | `dashboard:view` | Dashboard home |
| `/products` | `products:read` | Products |
| `/categories` | `categories:manage` | Categories |
| `/brands` | `brands:manage` | Brands |
| `/tags` | `tags:manage` | Tags |
| `/orders`, `/orders/:orderId` | `orders:read` | Orders |
| `/customers` | `customers:read` | Customers |
| `/shipping` | `shipping:manage` | Shipping |
| `/wallet`, `/wallet/settlements`, `/wallet/settlements/:batchId` | `wallet:read` | Wallet/settlements |
| `/coupons` | `coupons:read` | Coupons |
| `/promotions` | `promotions:read` | Promotions |
| `/policies` | `settings:read` | Pages/policies |
| `/abandoned-carts` | `orders:read` | Abandoned carts |
| `/exports` | `exports:create` | Export |
| `/imports` | `imports:create` | Import |
| `/reports`, `/growth`, `/live` | `reports:read` | Reports/growth/live radar |
| `/settings` | `settings:read` | Settings |
| `/theme`, `/theme-store` | `theme:view` | Theme editor/store |
| `/employees` | `employees:view` | Staff |
| `/compliance` | `compliance:read` | Verification/compliance |
| `/subscriptions` | `subscriptions:view` | Subscriptions |
| `/notifications` | `notifications:view` | Notifications |
| `/api-keys` | `api_keys:view` | API keys |
| `/migration` | `settings:read` | Migration hub |
| `/customers/segments` | `customers:read` | Customer segments |
| `/channels*` | `settings:read` | Sales channels/marketplaces |
| `/marketing/actions` | `promotions:read` | Marketing actions |
| `/settings/integrations` | `settings:read` | Integration hub |
| `/ai-assistant` | `settings:read` | AI assistant |
| `/audit-logs` | `stores:read` | Audit logs |
| `/support*` | `support:read` | Support center/ticket detail |

Rules:

- UI permission hiding is not sufficient; API must enforce the same or stricter permission.
- Every merchant page should have loading, empty, error, and retry states before launch.
- RTL/mobile is required for merchant-facing UI.

### 5.2 Storefront

Storefront serves public customer-facing store routes under `/s/:slug` and can also bootstrap from resolved host via `/resolve-host` for merchant subdomains/custom domains.

Storefront responsibilities:

- browse products/categories/brands/tags
- product detail + variants + stock + SAR price rendering
- cart
- checkout
- payment redirect/failure/success recovery
- shipping rate selection
- storefront theme rendering via canonical theme gateway
- marketplace public flows where enabled

### 5.3 Admin Dashboard

Admin Dashboard is platform-wide and must not import merchant/storefront UI internals. Sensitive operations require fine-grained admin permissions, not only admin authentication.

---

## 6. Domain management flow

### 6.1 Runtime host flow

```txt
Browser Host header
  → Caddy/Nginx forwards host
  → API /resolve-host
  → resolveStoreByHost(host)
  → only active + isActive + published stores resolve
  → storefront bootstraps slug/name
```

### 6.2 Custom domain lifecycle

```txt
Merchant configures domain
  → API /merchant/:storeId/domain
  → CustomDomainService
  → ownership verification through DNS records
  → status: pending / verified / failed / active
  → Caddy /internal/tls-check allows only active domains
  → storefront can resolve by host
```

### 6.3 Domain rules

- Do not point production `haastores.com`, `admin.haastores.com`, or `api.haastores.com` to unstable builds.
- On the production-candidate server, staging must be isolated using staging subdomains, separate env, separate DB, and mock/sandbox providers.
- DNS verification misses during propagation should remain pending/retryable; do not mislead merchants with immediate terminal failure unless verification is conclusive.
- `internal/tls-check` must remain protected against arbitrary cert issuance abuse.

---

## 7. Payment architecture

### 7.1 Canonical payment policy

- Geidea is the intended primary provider.
- Live Geidea calls are blocked until official endpoints, credentials, and signature rules arrive.
- Payment test environment must cover success, declined, cancelled, expired, duplicate webhook, invalid signature, delayed webhook, webhook-before-callback, and callback-before-webhook.
- Callback alone must not confirm payment.
- Refund/partial refund must not be advertised as working until implementation is real.

### 7.2 Payment provider package

`packages/payment-providers/src/base.ts` defines:

- provider capabilities
- shared status mapping
- error mapping
- `PaymentProvider` interface
- Geidea signature helpers

Known provider capability rule:

- `GEIDEA_CAPABILITIES.supportsRefunds = false`
- `GEIDEA_CAPABILITIES.supportsPartialRefunds = false`

These remain false until live refund implementation lands.

### 7.3 Payment flow

```txt
Checkout request
  → create order/payment intent/session
  → redirect to provider/mock/sandbox
  → callback returns user to storefront
  → webhook verifies signature and idempotency
  → payment state transition inside safe order flow
  → wallet/ledger posting if captured/settled
```

### 7.4 Required provider-ready state

Before live keys arrive, the system must still provide:

- provider contract
- encrypted credential slots
- masked configuration display
- readiness states
- mock provider
- sandbox provider if official sandbox details exist
- webhook contract
- idempotency tests
- failure-state tests

---

## 8. Shipping architecture

### 8.1 Canonical shipping policy

- Build shipping abstraction now.
- Live shipping waits for provider selection, credentials, and owner approval.
- No live shipping calls without credentials and owner approval.

### 8.2 Shipping readiness model

`packages/shipping-core/src/readiness.ts` defines provider-agnostic readiness states:

| State | Meaning |
|---|---|
| `not_configured` | Credentials missing |
| `mock_ready` | In-process mock/manual provider available |
| `sandbox_configured` | Sandbox credentials present; round-trip pending |
| `sandbox_verified` | Sandbox round-trip externally verified |
| `live_locked` | Credentials present but live blocked by policy |
| `live_ready` | Live credentials + owner approval + sandbox verification |
| `provider_error` | Last health snapshot reported provider failure |

Known providers in readiness list:

- `manual`
- `haa_mock`
- `oto`
- `aramex`
- `smsa`

### 8.3 Shipping flow

```txt
Checkout address
  → rate request
  → active provider factory
  → rate result / provider error
  → customer selects shipping method
  → order created/confirmed
  → shipment creation
  → label creation
  → tracking events / shipping webhook
  → delivery / failure / return / COD state
```

### 8.4 Shipping launch requirements

- mock rates, labels, tracking, COD collected/refused
- provider error states
- duplicate webhook protection
- sandbox round-trip evidence before live
- no zero-cost/empty-item live shipment when order data exists

---

## 9. Wallet / ledger / financial flow

Wallet and ledger are commercial-critical.

```txt
Payment captured / COD collected / refund / payout event
  → idempotency key or DB-level uniqueness
  → wallet entry
  → balance update
  → reconciliation/reporting
```

Rules:

- Wallet idempotency is a commercial-launch prerequisite.
- Migration execution is manual and owner-gated; deploy must not auto-run `db:migrate`.
- Financial posting must be atomic and resistant to duplicate webhooks.
- Platform fee, COD fee, refunds, partial refunds, payouts, payout reversals, and settlement differences must reconcile with reports.

---

## 10. Marketplace map

Canonical truth for marketplace work is current code, not old marketplace audit reports.

Primary surfaces:

- `apps/api/src/routes/haa-marketplace.ts`
- `packages/marketplace-core/**`
- Storefront marketplace pages
- Merchant dashboard `/channels*` routes

Rules:

- Do not treat old marketplace audits as authoritative.
- Marketplace checkout must be explicitly either browse-only or checkout-enabled.
- If checkout-enabled, it requires end-to-end coverage: cart, shipping, payment, order/suborder creation, rollback/recovery.

---

## 11. Theme and brand map

### 11.1 Theme canonical direction

| Package | Current status |
|---|---|
| `@haa/storefront-themes` | Canonical public storefront theme gateway |
| `@haa/storefront-themes/server` | Dashboard-safe registry/types/validation only |
| `@haa/theme-system` | Legacy/compatibility; avoid new runtime dependency where possible |
| `@haa/theme-engine` | Internal primitives |
| `@haa/theme-react` | React theme bindings |
| `@haa/theme-web` | Preview/legacy web utilities |
| `@haa/system-theme` | Platform/dashboard visual identity only |

Rules:

- Do not create a parallel theme system.
- Dashboards must not import storefront runtime themes.
- Custom CSS must not leak to `html`, `body`, `:root`, or dashboard/global UI.
- Storefront themes affect storefront only.

### 11.2 Brand token rules

- Canonical Haa primary: `#5c9cd5`.
- `#007aff` is not the Haa brand color; it is an Apple-style template baseline.
- Tailwind `blue-500/600` is not the platform identity.
- Store theme colors may differ when they are merchant/theme-specific and explicitly scoped.
- Platform brand and merchant brand must remain separated.

---

## 12. RBAC / tenant isolation map

### 12.1 Runtime enforcement

```txt
JWT/auth middleware
  → token version verifier
  → store→tenant resolver
  → requireStoreAccess
  → requirePermission
  → route handler
```

Rules:

- UI permissions do not replace API enforcement.
- `requireStoreAccess` must precede `requirePermission` on non-exempt tenant routes.
- Every store-scoped query must be scoped by store/tenant boundary.
- Admin routes need fine-grained admin permissions for destructive/sensitive operations.

### 12.2 Protected frontend route layers

- Merchant Dashboard: `AuthGuard` + `PermissionRoute`.
- Admin Dashboard: admin auth + fine-grained platform permissions required.
- Storefront: public browsing; checkout mutations require fraud/rate/validation controls, not merchant RBAC.

---

## 13. Webhooks map

### 13.1 Inbound provider webhooks

| Webhook type | Route family | Requirements |
|---|---|---|
| Payment | `/webhooks` | signature verification, replay protection, dedupe before side effects, no callback-only confirmation |
| Shipping | `/webhooks/shipping` | signature verification, event mapping, duplicate protection, delivery/failure/return state handling |
| OTO | `/webhooks/oto` | OTO-specific signature/event handling once credentials/specs arrive |

### 13.2 Outbound merchant webhooks

| Surface | Purpose |
|---|---|
| `/merchant/:storeId/outbound-webhooks` | Merchant-configured event delivery |

Required hardening:

- signed payloads
- body size cap
- retry policy
- max-attempt dead-letter
- paused/circuit-breaker behavior
- secret never persisted or logged in plaintext

---

## 14. CI / quality / deploy map

Root scripts:

| Command | Purpose |
|---|---|
| `pnpm preflight` | Project-root and required file checks |
| `pnpm typecheck` | Workspace TypeScript checks |
| `pnpm test` | Vitest tests |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm test:smoke` | Pre-launch smoke test |
| `pnpm quality` | Typecheck + smoke + E2E |
| `pnpm env:check` | Environment validation |
| `pnpm production:check` | Production readiness checks |
| `pnpm ops:health` | Health checks |
| `pnpm ops:synthetic` | Synthetic HTTP checks |
| `pnpm ops:monitor` | health + synthetic + error analysis |
| `pnpm deps:audit` | Production dependency audit |
| `pnpm load:test` | k6 load readiness |

Deploy rules:

- No deploy path may auto-run migrations.
- Production must remain manually gated.
- GitHub `production` environment secrets are owner-managed.
- Fake/mock providers must not be enabled in production unless a deliberate safe flag explicitly allows a non-money/non-shipping mode.

---

## 15. Environment and server map

### 15.1 Server policy

| Server/IP | Status |
|---|---|
| `72.61.108.208` | Official Haa Stores server; staging now, production-candidate later |
| `187.124.41.239` | Forbidden for Haa Stores; belongs to other projects |

### 15.2 Same-server staging/production rule

If the official server is also the future production server, staging must be isolated:

| Concern | Staging | Production |
|---|---|---|
| Domains | `staging.*`, `admin-staging.*`, `api-staging.*` | `haastores.com`, `admin.haastores.com`, `api.haastores.com` |
| DB | separate staging DB | separate production DB |
| env | staging env | production env |
| payment | mock/sandbox only | live only after owner approval |
| shipping | mock/sandbox only | live only after owner approval |
| data | fake/test | real |
| access | protected | public as appropriate |
| indexing | noindex/blocked | indexed where intended |

---

## 16. Demo isolation map

Demo stores must not trigger real business side effects.

Rules:

- Demo payments must use mock/sandbox only.
- Demo shipping must use mock/sandbox only.
- Demo analytics must not pollute real merchant analytics.
- Demo orders must be clearly marked.
- Demo webhooks/notifications must be suppressed or routed to safe test handlers.
- Demo marketplace entries must be visibly marked or filtered according to product policy.

---

## 17. Launch gates

### 17.1 Engineering gates

| Gate | Status / rule |
|---|---|
| Geidea live | blocked until credentials/docs/signature rules arrive |
| Geidea refunds | disabled until real implementation lands |
| Shipping live | blocked until provider + credentials + owner approval |
| Wallet idempotency | migration execution owner-gated; commercial prerequisite |
| No auto-migrate | locked policy |
| Cloudflare DNS | owner action |
| Theme gateway | `@haa/storefront-themes` canonical |
| Brand convergence | `#5c9cd5` canonical; hardcoded drift must continue shrinking |
| Marketplace checkout | must be explicitly browse-only or fully E2E checkout-enabled |

### 17.2 Owner gates G1–G10

Engineering cannot close these by code alone:

1. Commercial Registration (CR)
2. VAT / ZATCA registration
3. E-commerce license
4. DPO appointed
5. Trademark
6. PCI-DSS ASV scan
7. Pen-test
8. KSA hosting decision
9. Tabby DPA if Tabby remains in scope
10. DR plan + tabletop

---

## 18. Do-not-touch list without explicit approval

- live payment activation
- live shipping activation
- production deploy
- `db:migrate` against staging/production
- secrets and `.env*`
- DNS changes for `haastores.com`
- forbidden server `187.124.41.239`
- root-level historical reports cleanup/moves
- direct tenant deletion or merchant self-deletion during beta
- parallel theme system creation
- Batch C skill adoption/evaluation unless explicitly requested

---

## 19. Verification commands for future local agents

Before claiming a map-affecting change is complete, run the relevant local checks from the canonical path:

```bash
pwd
# must be /Users/thwany/Desktop/haa-stores-core

git branch --show-current
git status --short
pnpm preflight
pnpm typecheck
pnpm test
```

For launch/integration-sensitive changes, also run as applicable:

```bash
pnpm test:e2e
pnpm quality
pnpm env:check
pnpm production:check
pnpm ops:health
pnpm ops:synthetic
```

Remote-only GitHub review cannot replace local preflight or runtime tests.

---

## 20. Map maintenance rule

Update this file whenever any of these change:

- app/package boundary
- route mount path
- Caddy `/api` strip contract
- payment provider policy/capabilities
- shipping provider readiness model
- wallet/ledger launch prerequisite
- domain/TLS flow
- DNS/server decision
- owner gate policy
- theme package canonical direction
- brand token source of truth
- CI/deploy gate

Every update must mention whether it was:

- local verified, or
- remote-inspection only.
