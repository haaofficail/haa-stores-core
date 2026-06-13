# Release 3 Report — Public Storefront UI

## Summary
Storefront application built at `apps/storefront/`, serving customer-facing pages under `/s/:slug/*`. Full customer journey from browsing to order tracking. Arabic RTL, mobile-first, no auth required.

## Files Created
- `apps/storefront/` — 25 files (scaffold, components, pages, API client, i18n, hooks)
- `docs/PUBLIC_API_SAFETY.md` — public data exposure rules
- `docs/STOREFRONT_FLOW.md` — customer journey documentation

## Files Modified
- `apps/api/src/routes/storefront.ts` — added 4 endpoints (`GET /:slug`, `GET /:slug/order/:orderNumber`, `PATCH/DELETE cart items`), fixed data safety (cost redaction in cart, session response shape, tracking response)

## Storefront Routes
10 routes under `/s/:slug/*` (home, category, product, cart, checkout, order, track, track result, about, contact)

## New Public API Endpoints
- `GET /s/:slug` — store info (redacted)
- `GET /s/:slug/order/:orderNumber?phone=` — order lookup + phone verification
- `PATCH /s/:slug/cart/:cartId/items/:itemId` — update quantity
- `DELETE /s/:slug/cart/:cartId/items/:itemId` — remove item

## Build Results
- `pnpm -r typecheck` — all 11 packages pass
- `pnpm -r build` — all 11 packages pass
- `pnpm test` — 86 tests pass (4 files, up from 74)

## Data Safety
- `toPublicProduct`: strips `cost`
- `toPublicStore`: strips `tenantId`, `createdAt`, `updatedAt`
- `toPublicOrder`: strips `id`, `storeId`, `checkoutSessionId`, `idempotencyKey`
- `toPublicCart`: strips `cost` from each cart item's product
- All cart endpoints use `toPublicCart()`, tracking uses `toPublicOrder()`

## Store Availability
- Inactive/suspended stores: 404 with Arabic message
- Non-existent stores: 404 with Arabic message
- 403 is never used in public storefront responses

## Product Visibility
- Only `status: 'active'` products appear in storefront
- Draft/archived products filtered at API level (ProductsService.list with status filter)
- Out-of-stock (trackInventory=true, stockQuantity=0): button disabled, "غير متوفر حاليًا"
- `CartService.addItem` validates status='active' and stock availability before adding

## Checkout Safety
- Idempotency keys prevent duplicate sessions
- `checkoutSessionId` guard prevents duplicate order creation
- Fake payment: `fake_card_failed` does not create paid orders or wallet entries
- Platform fees never shown in storefront

## Tracking Safety
- Phone number required for order lookup
- Both `/order/` and `/track/` endpoints verify phone match
- Store slug validated against order's storeId
- No internal data returned (id, storeId, checkoutSessionId, etc.)

## Running Locally
```bash
pnpm --filter @haa/api dev      # API on :3000
pnpm --filter @haa/storefront dev  # Storefront on :5174
pnpm --filter @haa/merchant-dashboard dev  # Dashboard on :5173
```

Visit: `http://localhost:5174/s/haa-demo`
