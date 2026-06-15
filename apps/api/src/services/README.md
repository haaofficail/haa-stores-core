# Service Layer Convention

> Codifies Principle 5 from `docs/ops/COMMITMENTS.md`:
> **"No route accesses Drizzle directly (must go through service)"**

---

## The Rule

A route file in `apps/api/src/routes/` is a **transport adapter**:
it parses the request, calls a service function, and shapes the response.

A route **must not**:
- Import from `drizzle-orm`
- Import the database client (`createDbClient` from `@haa/db`)
- Compose SQL or Drizzle query objects

A route **must**:
- Call into a service function (from `packages/commerce-core/src/`
  or `apps/api/src/services/`)
- Return JSON shaped by a DTO (from `packages/shared/src/dto/`)

## Where Service Code Lives

| Location | What belongs there |
|---|---|
| `packages/commerce-core/src/*.ts` | **Business logic** — multi-step operations, transactions, cross-aggregate invariants. The Drizzle client is owned here. |
| `apps/api/src/services/*.ts` | **Cross-cutting services** that the API owns directly (observability, support-error-log, queue, storage). These can use Drizzle because they're not route handlers. |
| `apps/api/src/routes/*.ts` | **Transport only** — Hono routes, RBAC guards, request/response shaping. No Drizzle. |

## How to Migrate a Route That Currently Imports Drizzle

For each route file that fails the principle:

1. **Identify the queries** — every `db.select().from(x).where(...)` etc.
2. **Pick the right home**:
   - If the query involves a multi-step business operation → `packages/commerce-core/src/<domain>.ts`
   - If the query is a single-table CRUD the API owns → `apps/api/src/services/<resource>.ts`
3. **Write a service function** with a clear signature:
   ```ts
   export async function listProducts(
     db: ReturnType<typeof createDbClient>,
     params: ListProductsParams
   ): Promise<ListProductsResult> { ... }
   ```
4. **Update the route** to call the service function and shape the response via a DTO.
5. **Decrement** `MAX_EXISTING_ROUTE_VIOLATIONS` in `tests/service-layer-enforcement.test.ts` by 1.

## Current Migration Backlog

Run the test to see the current list:

```bash
pnpm vitest run tests/service-layer-enforcement.test.ts
```

The test prints a `[Service Layer Migration Backlog]` warning listing
every route file that still imports `drizzle-orm`, and a budget check
that fails if the count grows above `MAX_EXISTING_ROUTE_VIOLATIONS`
(default: 24).

The goal is to shrink the count to **0** by the end of Quality Pass 5.
This can be done in small batches — pick one domain (e.g. `auth.ts`,
`orders.ts`) and migrate it end-to-end.

## Why This Rule Exists

- **Testability** — service functions can be unit-tested without
  spinning up Hono, mocks, or HTTP fixtures.
- **Reuse** — the same service function can power a CLI, a worker, or
  a future GraphQL endpoint without rewriting the query.
- **Tx boundaries** — Drizzle transactions belong in the service
  layer, not the route. A route that calls `db.transaction(...)` is
  almost always a code smell.
- **Schema drift** — when a column is renamed, only service files
  need to change. Routes are insulated.

## Exceptions

- **Webhook handlers** may need a quick lookup-by-id before delegating
  to a service. If the lookup is one line and has no business logic,
  it's acceptable to keep the Drizzle import in the route.
- **Health check / readiness probes** that ping the DB may also be
  exempt — but the cleaner path is to expose a `db.ping()` service
  function.

If you add a new exception, document it here with a one-line reason.
