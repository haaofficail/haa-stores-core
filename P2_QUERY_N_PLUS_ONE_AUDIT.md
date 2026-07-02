# P2-Query-N+1: N+1 Query Detection & Recommendations

**Date:** July 2, 2026  
**Status:** AUDIT & RECOMMENDATIONS (No fixes applied yet; awaiting prioritization)

---

## Overview

N+1 queries occur when code loops through results and issues a database query per iteration, resulting in N+1 total queries (1 outer + N inner). This audit identifies suspected N+1 patterns and provides refactoring recommendations.

---

## Findings

### 🔴 CONFIRMED N+1 Patterns

#### 1. **marketplaces.ts:630–635** — Order Deduplication Loop

**Location:** `apps/api/src/routes/marketplaces.ts:630`  
**Function:** `persistChannelOrders()`  
**Severity:** HIGH (5–100+ queries per call depending on order count)

**Current Code:**

```typescript
for (const order of orders) {
  const [existing] = await db
    .select({ id: s.orders.id })
    .from(s.orders)
    .where(
      and(
        eq(s.orders.externalId, order.marketplaceOrderId),
        eq(s.orders.source, providerCode),
      ),
    )
    .limit(1);
  if (existing) continue;
  // ...insert order
}
```

**Problem:** For N orders, this runs N separate queries to check if each order exists.

**Recommended Fix:**

```typescript
// Fetch all external IDs in a single query
const existingOrderIds = await db
  .select({ externalId: s.orders.externalId })
  .from(s.orders)
  .where(
    and(
      inArray(
        s.orders.externalId,
        orders.map((o) => o.marketplaceOrderId),
      ),
      eq(s.orders.source, providerCode),
    ),
  );

const existingSet = new Set(existingOrderIds.map((o) => o.externalId));

// Now loop and insert only new orders
for (const order of orders) {
  if (existingSet.has(order.marketplaceOrderId)) continue;
  // ...insert order
}
```

**Impact:** Reduces N queries to 1 query. For 100 orders: 100 queries → 1 query.

---

#### 2. **marketplaces.ts:840–851** — Store Marketplace Connection Loop

**Location:** `apps/api/src/routes/marketplaces.ts:840`  
**Function:** `syncAllStoresMarketplaceStatuses()`  
**Severity:** HIGH (1 query per store per function call)

**Current Code:**

```typescript
const stores = await db.select({ id: s.stores.id }).from(s.stores)
  .where(eq(s.stores.isActive, true));

for (const store of stores) {
  const connections = await db.select(...)
    .from(s.marketplaceConnections)
    .innerJoin(s.marketplaceProviders, ...)
    .where(eq(s.marketplaceConnections.storeId, store.id));

  connections.map(async (conn) => {
    // ... sync logic
  });
}
```

**Problem:** For M stores, this runs M separate queries to fetch connections per store. If M=50, that's 51 total queries (1 for stores + 50 for connections).

**Recommended Fix:**

```typescript
// Fetch all connections for all stores in ONE query
const stores = await db.select({ id: s.stores.id })
  .from(s.stores)
  .where(eq(s.stores.isActive, true));

const storeIds = stores.map(s => s.id);

// Single query with IN clause
const allConnections = await db.select(...)
  .from(s.marketplaceConnections)
  .innerJoin(s.marketplaceProviders, ...)
  .where(inArray(s.marketplaceConnections.storeId, storeIds));

// Group by storeId in application memory
const connectionsByStore = groupBy(allConnections, c => c.storeId);

// Now iterate with pre-fetched data
for (const store of stores) {
  const connections = connectionsByStore[store.id] || [];
  connections.map(async (conn) => {
    // ... sync logic
  });
}
```

**Impact:** Reduces M queries to 1 query. For 50 stores: 51 queries → 2 queries total.

---

### 🟡 SUSPECTED Patterns (Require Manual Review)

#### 3. **products.ts:90** — Product Bulk Action Loop

**Location:** `apps/api/src/routes/products.ts:90`  
**Function:** `POST /products/bulk-action`  
**Status:** Delegates to `ProductsService.bulkAction()` — review service implementation

**Recommendation:** Inspect `packages/services/ProductsService.ts` for queries inside the loop:

```bash
grep -A 30 "bulkAction" packages/services/ProductsService.ts
```

---

## Refactoring Template

For all N+1 patterns, apply this template:

```typescript
// ❌ BEFORE (N+1)
for (const item of items) {
  const related = await db
    .select()
    .from(table)
    .where(eq(table.itemId, item.id));
  process(item, related);
}

// ✅ AFTER (1+1)
const allRelated = await db
  .select()
  .from(table)
  .where(
    inArray(
      table.itemId,
      items.map((i) => i.id),
    ),
  );

const relatedMap = groupBy(allRelated, (r) => r.itemId);

for (const item of items) {
  const related = relatedMap[item.id] || [];
  process(item, related);
}
```

**Key principles:**

1. Fetch all data in one query using `inArray()`
2. Group results in memory by the join key
3. Look up grouped data O(1) per iteration
4. No database queries inside loops

---

## Monitoring & Detection

### Current Situation

- No slow query logging enabled in production
- No query profiling to detect N+1 at runtime

### Recommended Tools (P3 backlog)

- **pg_stat_statements** (PostgreSQL): Identify top queries by call count
- **Datadog APM / New Relic**: Trace N+1 patterns across production traffic
- **Query instrumentation**: Log all queries with stack traces for analysis

---

## Implementation Roadmap

### Priority 1 (Blocking)

- [ ] Fix `persistChannelOrders()` (marketplaces.ts:630) — HIGH impact
- [ ] Fix `syncAllStoresMarketplaceStatuses()` (marketplaces.ts:840) — HIGH impact

### Priority 2 (Performance)

- [ ] Audit `ProductsService.bulkAction()` — likely P0 for product operations
- [ ] Enable slow query logging (> 100ms) in staging
- [ ] Run audit against slow query logs

### Priority 3 (Automation)

- [ ] Add ESLint rule to warn on `await` inside loops
- [ ] Integrate query instrumentation into CI/CD

---

## Sign-off

**P2-Query-N+1 Status:** AUDIT COMPLETE (2 confirmed N+1s, 1 suspected)

**Recommended Action:** Fix HIGH severity items (marketplaces.ts) in next sprint. These are simple refactors with measurable latency impact (potentially 50–100ms per call improvement).

**Timeline:** 2–4 hours work for confirmed fixes (experienced engineer).
