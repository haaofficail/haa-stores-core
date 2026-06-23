# OpenAPI spec — Haa Stores

**File:** `haa-stores.yaml` (OpenAPI 3.1.0)
**Audit reference:** P2-004 of the 2026-06-23 deep audit.
**Status:** seed — launch-critical endpoints only.

## What's in it

| Tag        | Endpoints covered                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Health     | `GET /health`                                                                                                                             |
| Auth       | `POST /auth/login`                                                                                                                        |
| Storefront | `GET /s/:slug/products`, `POST /s/:slug/checkout`                                                                                         |
| Merchant   | `POST /merchant/:storeId/whatsapp/pair`, `GET /merchant/:storeId/whatsapp/status`, `GET /merchant/:storeId/orders/:orderId/zatca-invoice` |
| Webhooks   | `POST /webhooks/:provider`                                                                                                                |

This is **~10%** of the 74 route files in `apps/api/src/routes/`. Expanding coverage is a per-area follow-up (each PR that adds a new endpoint SHOULD update this spec).

## What's NOT in it (yet)

- Wallet + payouts (`/merchant/:storeId/wallet/*`, `/admin/settlements/*`)
- Catalog (products/categories/brands/tags) CRUD details
- Orders CRUD
- Customers + segments
- Shipping rates + labels
- Coupons + promotions
- Loyalty earn/redeem
- WhatsApp campaigns + send-media
- Admin tenants/stores/users management
- KYC review
- Marketplace surface

For these, the operational reference is `docs/API.md` (markdown tables) and the source of truth is the Hono route definitions themselves.

## Why a seed spec and not full auto-generation

`hono-openapi` and `@hono/zod-openapi` can derive a spec from route definitions, but adopting either requires re-wiring every route to use the OpenAPI variant of the Hono router. That's a large surface change with real regression risk. The seed spec gets the launch-critical surface documented immediately; an opt-in migration to auto-derivation is tracked as a follow-up.

## Validating the spec

```bash
# Quick syntax check
npx @apidevtools/swagger-cli validate docs/openapi/haa-stores.yaml

# Render locally (browser preview)
npx @redocly/cli preview-docs docs/openapi/haa-stores.yaml
```

Both are zero-install and use npx so we don't grow the prod dep tree.

## Source of truth contract

If the spec disagrees with the runtime, **the runtime wins**. File a PR to fix the spec, never the other way around.

## Compliance

- The 401/403 contract on the merchant endpoints matches `requireAuth()` → `requirePermission(...)` middleware in `apps/api/src/middleware/`.
- The `webhooks/:provider` 200-on-duplicate behaviour matches the P1-002 fix from PR #124 (race-recovered concurrent dedupe).
- The `zatca-invoice.invoiceUuid` is a real UUIDv4 per the P1-001 fix from PR #124.

## Updating the spec

When adding a new endpoint:

1. Add the path block to `haa-stores.yaml` under `paths:`.
2. Reuse existing `components.schemas` where possible, add new ones at the bottom.
3. Run validation (above).
4. Cross-reference the route's middleware chain in the `security` field.
5. PR review: a reviewer must confirm the spec matches the actual route behaviour.
