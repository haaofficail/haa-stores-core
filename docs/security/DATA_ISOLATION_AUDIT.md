# Data Isolation Audit

> Assessment of tenant, merchant, store, customer, and order data isolation.
> Local-development scope only.

---

## Merchant Isolation

| Check | Status | Details |
|-------|--------|---------|
| Tenant-level JWT | ✅ | JWT contains `tenantId` — all requests scoped to tenant |
| Login scoping | ✅ | Authentication requires valid `tenantId` association |
| Registration creates isolated tenant | ✅ | Each registration creates a new tenant + store |
| Cross-tenant data access | ✅ Blocked | `requireStoreAccess()` validates store → tenant ownership |
| Admin can see all tenants | ✅ | Separate admin JWT with `isAdmin: true` |

**Verdict: GOOD** — Tenant isolation is enforced at the JWT level and verified by middleware on every request.

---

## Store Isolation

| Check | Status | Details |
|-------|--------|---------|
| Store-scoped URLs | ✅ | All merchant routes use `/:storeId/...` pattern |
| requireStoreAccess middleware | ✅ | Three-layer check: auth → storeId in URL → tenant ownership |
| Store ID in JWT | ✅ | `activeStoreId` in token payload |
| Storefront store resolution | ✅ | `resolveActiveStore()` validates store is active and published |
| Store theme isolation | ⚠️ | Themes are applied per-store — needs verification that switching stores loads correct theme |

**Verdict: GOOD** — `requireStoreAccess()` is the key defense against Broken Object Level Authorization (BOLA/IDOR). Every merchant route uses it.

---

## Branch/Location Isolation

| Check | Status | Details |
|-------|--------|---------|
| Branch concept exists | ❌ | No branch/location data model |
| Branch-scoped queries | ❌ | Not applicable |
| Branch-scoped permissions | ❌ | Not applicable |

**Verdict: NOT IMPLEMENTED** — Branches/locations are not part of the current data model. If added later, `requireStoreAccess()` must be extended to check branch scope.

---

## Customer Data Isolation

| Check | Status | Details |
|-------|--------|---------|
| Customers scoped to store | ✅ | All customer queries filter by `storeId` from URL params |
| Phone lookup requires store access | ✅ | `GET /phone/:phone` requires auth + store access |
| Customer data returned only for own store | ✅ | Service layer filters by store |
| Customer export controls | ❌ Not inspected | Any user with `customers:read` can export all customer data |

**Finding: Customer export scope**

Customer data export (if exists) would use the same `customers:read` permission. A user with read access can potentially see phone numbers, names, addresses of all customers in the store.

**Verdict: ADEQUATE** — Customers are isolated by store. The permission misconfiguration (`customers:read` used for writes) is a separate concern.

---

## Order Data Isolation

| Check | Status | Details |
|-------|--------|---------|
| Orders scoped to store | ✅ | All order queries filter by `storeId` from URL params |
| Order number public lookup | ⚠️ | Storefront `GET /:slug/order/:orderNumber` requires phone number — no auth |
| Refund audit | ✅ | Refund operations log actor identity |
| Order export scope | ✅ | Scoped to store via `requireStoreAccess` |

**Finding: Public order lookup**

The storefront endpoint `GET /:slug/order/:orderNumber` returns order details (status, items, amounts) with only a phone number query param. If someone knows the order number and the customer's phone, they can look up the order.

**Risk level:** LOW for local dev. For production, this needs rate limiting or verified-phone access.

**Verdict: ADEQUATE** — Orders are isolated by store. The public lookup is minimal risk (requires both order number + phone).

---

## API Query Risks

| Risk | Status | Notes |
|------|--------|-------|
| SQL injection | ⚠️ | Drizzle ORM uses parameterized queries — low risk |
| Mass assignment | ⚠️ | Zod validation on all mutation routes — mitigated |
| Data leakage via error messages | ✅ | Production returns user-friendly messages only |
| GraphQL-style over-fetching | ✅ | REST endpoints return fixed schemas |

---

## Public Storefront Data Exposure

| Data Point | Exposed | Risk |
|------------|---------|------|
| Product name, price, images | ✅ Required | Customer needs to see these |
| Product cost | ❌ Stripped by `toPublicProduct()` | Cost never exposed to storefront |
| Product barcode | ❌ Stripped | Internal only |
| Store phone, address | ✅ If configured | Merchant chooses what to expose |
| Store theme CSS | ✅ Required | Theme is visual only |
| Store analytics | ❌ Not exposed | Dashboard only |
| Customer data | ❌ Not exposed | No customer data on storefront |
| Order data | ⚠️ Limited | Order number + phone required |

**Verdict: GOOD** — Storefront exposes only what customers need. Sensitive fields are stripped in `toPublicProduct()`.

---

## Risk Rating Summary

| Area | Rating | Key Risk |
|------|--------|----------|
| Merchant isolation | 🟢 Low | Tenant JWT + requireStoreAccess |
| Store isolation | 🟢 Low | requireStoreAccess on every merchant route |
| Branch/location | 🟡 Not applicable | No branch model yet |
| Customer isolation | 🟢 Low | Scoped by store; permission issue is separate |
| Order isolation | 🟢 Low | Scoped by store; public lookup is minimal risk |
| Public API exposure | 🟢 Low | Strips sensitive fields |
| Storefront exposure | 🟢 Low | Public by design |

---

## Recommended Fixes

| Priority | Fix | Area |
|----------|-----|------|
| P1 | Add customer write audit logging | Customer data |
| P2 | Rate limit public order lookup by phone | Order data |
| P2 | Document branch/location isolation requirements for future | Architecture |
| P3 | Add customer export audit if export route exists | Customer data |
