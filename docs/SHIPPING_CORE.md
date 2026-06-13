# Shipping Core (Phase 3 — Shipping Pro Foundation)

## Architecture

```
ShippingProviderFactory
  ├── ManualShippingProvider (default, manual mode)
  ├── HaaMockShippingProvider (mock mode, labels + tracking)
  └── OtoShippingProvider (sandbox-ready, disabled w/o env)

ShippingService ──→ CRUD for methods, zones, rates, shipments, tracking, labels, returns
LabelService     ──→ Label generation (mock)
ReturnService    ──→ Return creation and tracking
```

## Shipping Modes

| Mode | Provider | Description |
|------|----------|-------------|
| `manual` | ManualShippingProvider | Default local mode. No labels. Manual tracking. |
| `mock` | HaaMockShippingProvider | Generates mock labels, tracking numbers, and return RMA. |
| `sandbox` | OtoShippingProvider | OTO sandbox adapter. Requires `OTO_SANDBOX_API_KEY`. Falls back to Manual if missing. |
| `live` | ❌ Blocked | Rejected at startup and factory level. |

**Env vars:** `SHIPPING_PROVIDER` (manual|haa_mock|oto), `SHIPPING_MODE` (manual|mock|sandbox).

## ShippingProvider Contract

| Method | Description |
|--------|-------------|
| `calculateRates(input)` | Get shipping rates for items + destination |
| `createShipment(input)` | Create shipment with tracking, status `label_created` |
| `cancelShipment(id)` | Cancel shipment |
| `getShipmentStatus(id)` | Get status from provider or DB |
| `getTracking(id)` | Get tracking info with last event |
| `createLabel(id)` | Generate shipping label (mock PDF URL) |
| `getLabel(id)` | Get existing label |
| `createReturn(input)` | Create return shipment with RMA |
| `verifyWebhookSignature(payload, sig)` | HMAC signature verification |
| `handleWebhook(payload, key)` | Process incoming webhook with idempotency |
| `mapProviderStatus(status)` | Map provider status → UnifiedShipmentStatus |
| `mapProviderError(code)` | Map provider error codes |
| `validateAddress(address)` | Validate shipping address |

Capabilities: `supportsRates`, `supportsLabels`, `supportsTracking`, `supportsReturns`, `supportsCOD`, `supportsPickup`, `supportsInternational`, `supportsWebhook`.

## Providers

### ManualShippingProvider
- Code: `manual`, mode: `manual`, always available
- Capabilities: rates, tracking, returns, COD, pickup
- No labels (returns placeholder)
- No webhook support
- Uses DB for all operations

### HaaMockShippingProvider
- Code: `haa_mock`, mode: `mock`, always available
- Capabilities: rates, labels, tracking, returns, webhooks
- Generates mock tracking: `HAA-MOCK-{random}`
- Mock label URL: `/api/mock/labels/shipment-{id}.pdf`
- Mock RMA number generation
- Creates initial tracking event on shipment creation
- Webhook signature always accepted (mock)

### OtoShippingProvider
- Code: `oto`, mode: `sandbox`
- `isAvailable` = false without `OTO_SANDBOX_API_KEY`
- All methods throw placeholder errors
- Factory falls back to ManualShippingProvider
- Webhook signature rejected without `OTO_WEBHOOK_SECRET`

### Factory
```typescript
createShippingProvider(code?, mode?)
// Falls back: oto → manual (if no keys)
// Throws on: mode === 'live'
// Default: manual
```

## Unified Shipment Statuses

| Status | Arabic | Color |
|--------|--------|-------|
| `draft` | مسودة | gray |
| `quoted` | تم التسعير | blue |
| `label_created` | تم إنشاء البوليصة | purple |
| `awaiting_pickup` | بانتظار الاستلام | yellow |
| `picked_up` | تم الاستلام | indigo |
| `in_transit` | قيد التوصيل | blue |
| `out_for_delivery` | خارج للتوصيل | cyan |
| `delivered` | تم التوصيل | green |
| `delivery_failed` | فشل التوصيل | red |
| `return_requested` | طلب إرجاع | orange |
| `return_in_transit` | الإرجاع قيد التوصيل | orange |
| `returned` | تم الإرجاع | gray |
| `cancelled` | ملغي | red |
| `exception` | استثناء | red |

## Shipment Creation Flow

```
Order (confirmed/processing)
  → Validate: not cancelled, has address
  → Choose shipping method
  → createShipment() → DB insert
  → Provider generates tracking number (mock)
  → Initial tracking event: 'label_created'
  → Status: label_created
```

## Labels

- `POST /merchant/:storeId/shipments/:id/label` → creates mock label
- `GET /merchant/:storeId/shipments/:id/label` → returns label info
- Mock labels: local PDF URL, no real carrier
- Format: `pdf`
- Stored in `shipmentLabels` table

## Tracking Events

- Table: `shipmentTrackingEvents` (shipmentId, status, location, description, occurredAt)
- Events created: on shipment creation, manual add, webhook
- Get tracking: returns last event + shipment info
- Dashboard: timeline with Arabic labels
- Storefront: simplified timeline for customer

## Returns Foundation

- `POST /merchant/:storeId/shipments/:id/return` → creates return shipment
- Status flow: `return_requested` → `return_in_transit` → `returned`
- RMA number generated (mock)
- Linked to original shipment/order
- No automatic refund (payment domain)
- Return fee placeholder (documented, not charged)

## Webhooks

- `POST /webhooks/shipping/:provider` — receives carrier webhooks
- Signature verification via provider adapter
- Invalid signature → 401 + logged to `shipmentErrors`
- Duplicate ignored via idempotency key
- Unknown events logged but safely ignored

## Wallet Impact

- Shipping fee charged to customer is part of order total (existing)
- Manual shipping cost recorded on shipment (shippingCost, customerFee, merchantCost, platformCost)
- Real carrier fees deferred to OTO live integration
- No duplicate entries on duplicate label

## Rate Calculation (existing)

```
For each active method:
  Look up rate for (method, zone matching destination city)
  Apply: baseRate + (perKgRate × totalWeightKg)
  If total >= freeAboveAmount → free shipping
  If no rate found → method unavailable
```

## LC2D Enhancements (existing)

### Shipping Overview
- `activeMethods` / `totalMethods`, `zones`, `rates`, `shipments`, `noTracking`, `inTransit`, `delivered`, `lastUpdated`

### Shipment Filters
- `status`, `noTracking`, `city`, `dateFrom` / `dateTo`

### Dashboard UX (Phase 3 enhanced)
- 4 provider cards: Haa Shipping, Carrier Account (coming soon), Local Delivery, Pickup
- 4 tabs: Methods, Zones, Rates, Shipments
- Action buttons: Create Label, View Label, Cancel, Create Return
