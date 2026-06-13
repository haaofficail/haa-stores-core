# API Reference

## Base URLs

- Merchant API: `/merchant/:storeId/*` (authenticated)
- Storefront API: `/s/:slug/*` (public)

## Authentication

All merchant endpoints require:
```
Authorization: Bearer <jwt_token>
```

JWT payload: `{ userId, tenantId, activeStoreId, roles, permissions }`

Auth middleware chain: `requireAuth()` → `requireStoreAccess()` → `requirePermission()`

## Merchant Routes

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/merchant/auth/login` | - | Login, returns JWT |

### Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/summary` | - | Dashboard stats (sales, orders, products, alerts) |

### Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/products` | products:read | List products (query: status, categoryId, search) |
| GET | `/merchant/:storeId/products/:id` | products:read | Get product |
| POST | `/merchant/:storeId/products` | products:create | Create product |
| PATCH | `/merchant/:storeId/products/:id` | products:update | Update product |
| DELETE | `/merchant/:storeId/products/:id` | products:update | Archive product |

### Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/categories` | categories:manage | List categories |
| POST | `/merchant/:storeId/categories` | categories:manage | Create category |
| PATCH | `/merchant/:storeId/categories/:id` | categories:manage | Update category |

### Customers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/customers` | customers:read | List customers |
| GET | `/merchant/:storeId/customers/:id` | customers:read | Get customer |
| POST | `/merchant/:storeId/customers/find` | customers:read | Find by phone |

### Cart

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/merchant/:storeId/cart` | - | Create cart |
| GET | `/merchant/:storeId/cart/:cartId` | - | Get cart |
| POST | `/merchant/:storeId/cart/:cartId/items` | - | Add item |
| PATCH | `/merchant/:storeId/cart/:cartId/items/:productId` | - | Update item qty |
| DELETE | `/merchant/:storeId/cart/:cartId/items/:productId` | - | Remove item |
| DELETE | `/merchant/:storeId/cart/:cartId` | - | Clear cart |

### Checkout

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/merchant/:storeId/checkout/sessions` | - | Create session |
| POST | `/merchant/:storeId/checkout/sessions/:sessionId/confirm` | - | Confirm + process payment |

### Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/orders` | orders:read | List orders (query: status, paymentStatus, page, limit) |
| GET | `/merchant/:storeId/orders/:id` | orders:read | Get order detail with items, status history, payment info |
| GET | `/merchant/:storeId/orders/:orderId/transitions` | orders:read | Get allowed status transitions |
| POST | `/merchant/:storeId/orders/:orderId/refund` | orders:update | 💳 Refund order (full or partial). Body: `{ amount?: number, reason?: string }`. Validates: order must be paid, amount ≤ paid amount. Returns `{ success, status, message }`. |

### Shipping

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/shipping/methods` | shipping:manage | List methods |
| POST | `/merchant/:storeId/shipping/methods` | shipping:manage | Create method |
| PATCH | `/merchant/:storeId/shipping/methods/:id` | shipping:manage | Update method |
| GET | `/merchant/:storeId/shipping/zones` | shipping:manage | List zones |
| POST | `/merchant/:storeId/shipping/zones` | shipping:manage | Create zone |
| PATCH | `/merchant/:storeId/shipping/zones/:id` | shipping:manage | Update zone |
| GET | `/merchant/:storeId/shipping/rates` | shipping:manage | List rates |
| POST | `/merchant/:storeId/shipping/rates` | shipping:manage | Create rate |
| GET | `/merchant/:storeId/shipping/provider-status` | - | 🚚 Shipping provider status |
| GET | `/merchant/:storeId/shipments` | shipping:manage | List shipments (query: status) |
| GET | `/merchant/:storeId/shipments/:id` | shipping:manage | Get shipment + tracking events |
| POST | `/merchant/:storeId/orders/:orderId/shipments` | shipping:manage | 🚚 Create shipment for order |
| POST | `/merchant/:storeId/shipments/:id/label` | shipping:manage | 🚚 Create shipment label (mock) |
| GET | `/merchant/:storeId/shipments/:id/label` | shipping:manage | 🚚 Get shipment label |
| PATCH | `/merchant/:storeId/shipments/:id/status` | shipping:manage | Update shipment status + tracking |
| POST | `/merchant/:storeId/shipments/:id/events` | shipping:manage | 🚚 Add tracking event |
| POST | `/merchant/:storeId/shipments/:id/return` | shipping:manage | 🚚 Create return |
| GET | `/merchant/:storeId/shipments/returns/list` | shipping:manage | 🚚 List returns |
| POST | `/merchant/:storeId/shipments/:id/cancel` | shipping:manage | 🚚 Cancel shipment |

### Wallet

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/wallet/summary` | wallet:read | Get balance summary |
| GET | `/merchant/:storeId/wallet/entries` | wallet:read | List ledger entries (query: page, limit) |

### Compliance

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/compliance/profile` | compliance:read | Get KYC profile |
| PUT | `/merchant/:storeId/compliance/profile` | compliance:write | Update KYC profile |
| POST | `/merchant/:storeId/compliance/submit` | compliance:submit | Submit for review |
| GET | `/merchant/:storeId/compliance/status` | compliance:read | KYC status + completion % |
| GET | `/merchant/:storeId/compliance/documents` | compliance:read | List documents |
| POST | `/merchant/:storeId/compliance/documents` | compliance:documents | Upload document |
| DELETE | `/merchant/:storeId/compliance/documents/:id` | compliance:documents | Delete document |
| GET | `/merchant/:storeId/compliance/bank-account` | compliance:read | Get bank accounts |
| PUT | `/merchant/:storeId/compliance/bank-account` | compliance:write | Update bank account |

### Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/settings/payment-status` | - | 💳 Payment provider status. Returns `{ activeProvider, activeMode, moyasarConfigured }`. |

### Coupons

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/coupons` | coupons:manage | List coupons |
| POST | `/merchant/:storeId/coupons` | coupons:manage | Create coupon |
| PATCH | `/merchant/:storeId/coupons/:id` | coupons:manage | Update coupon |
| DELETE | `/merchant/:storeId/coupons/:id` | coupons:manage | Delete coupon |

### Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/reports/sales` | reports:read | Sales report (query: period) |
| GET | `/merchant/:storeId/reports/low-stock` | reports:read | Low stock products |

### Export/Import

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/exports/csv` | products:read | Export products as CSV |
| POST | `/merchant/:storeId/imports/products` | products:create | Import products from CSV body |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/notifications/preferences` | notifications:read | Get notification preferences |
| PUT | `/merchant/:storeId/notifications/preferences` | notifications:write | Update notification preferences |
| GET | `/merchant/:storeId/notifications/logs` | notifications:read | List notification logs (query: page, limit) |

### Subscriptions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/merchant/:storeId/subscriptions/current` | - | Get current subscription with plan details |
| POST | `/merchant/:storeId/subscriptions/change-plan` | - | Change plan (body: `planCode`) |
| GET | `/merchant/:storeId/subscriptions/invoices` | - | List invoices (query: page, limit) |
| GET | `/merchant/:storeId/subscriptions/plans` | - | List available plans |

### Integrations — Public API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/merchant/:storeId/integrations/api-keys` | integrations:manage | Create API key |
| GET | `/merchant/:storeId/integrations/api-keys` | integrations:manage | List API keys |
| DELETE | `/merchant/:storeId/integrations/api-keys/:id` | integrations:manage | Revoke API key |

Public API (API key auth, header `x-api-key`):
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/products` | List products |
| GET | `/api/v1/products/:id` | Get product |
| GET | `/api/v1/orders` | List orders |
| GET | `/api/v1/orders/:id` | Get order |
| GET | `/api/v1/orders/:id/transitions` | Get allowed transitions |
| POST | `/api/v1/orders/:id/refund` | Refund order |

### Migration Hub

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/merchant/:storeId/migration/upload` | migration:import | Upload migration file |
| GET | `/merchant/:storeId/migration/template/:source` | migration:import | Download CSV template (source: salla, zid, shopify, csv) |
| GET | `/merchant/:storeId/migration/status/:jobId` | migration:import | Get migration job status |

### AI Commerce Agent

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/merchant/:storeId/ai/chat` | - | Send message to AI agent. Body: `{ message, sessionId? }`. Returns: `{ reply, sessionId, context? }` |
| POST | `/merchant/:storeId/ai/analyze-sales` | - | Analyze sales data. Body: `{ period?, storeId }`. Returns: sales analysis |
| POST | `/merchant/:storeId/ai/stock-recommendations` | - | Get stock recommendations |
| POST | `/merchant/:storeId/ai/optimize-shipping` | - | Get shipping optimization |
| POST | `/merchant/:storeId/ai/pricing-suggestions` | - | Get pricing suggestions |
| POST | `/merchant/:storeId/ai/discount-plan` | - | Get discount plan |
| POST | `/merchant/:storeId/ai/ad-copy` | - | Generate ad copy |
| POST | `/merchant/:storeId/ai/product-description` | - | Generate product description |
| POST | `/merchant/:storeId/ai/export-report` | - | Export AI report as PDF

## Admin Routes

Admin authentication: JWT via admin-specific login at `/admin/login`. Requires `isAdmin` flag on user record.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/login` | Admin login, returns admin JWT |
| GET | `/admin/tenants` | List all tenants |
| GET | `/admin/stores` | List all stores |
| GET | `/admin/stores/:id` | Get store detail |
| PATCH | `/admin/stores/:id` | Update store |
| GET | `/admin/kyc` | List KYC submissions |
| GET | `/admin/kyc/:id` | Get KYC detail with documents |
| POST | `/admin/kyc/:id/approve` | Approve KYC |
| POST | `/admin/kyc/:id/reject` | Reject KYC |
| GET | `/admin/payments` | List payments |
| GET | `/admin/audit-logs` | List audit logs |
| GET | `/admin/subscriptions` | List subscription plans |
| POST | `/admin/subscriptions` | Create subscription plan |
| PATCH | `/admin/subscriptions/:id` | Update subscription plan |
| GET | `/admin/reports/summary` | Platform-wide summary stats |

## Storefront Routes (Public)

No auth required. All under `/s/:slug/*`.

### General

| Method | Path | Description |
|--------|------|-------------|
| GET | `/s/:slug` | Store info (name, description, logo) + featured products |

### Products

| Method | Path | Description |
|--------|------|-------------|
| GET | `/s/:slug/products` | List active products (cost redacted), query: page, limit, categoryId |
| GET | `/s/:slug/products/:productSlug` | Get product detail (cost redacted) |

### Categories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/s/:slug/categories` | List active categories |

### Cart

| Method | Path | Description |
|--------|------|-------------|
| POST | `/s/:slug/cart` | Create cart (no auth) |
| GET | `/s/:slug/cart/:cartId` | Get cart (cost redacted) |
| POST | `/s/:slug/cart/:cartId/items` | Add item (validates status, stock) |
| PATCH | `/s/:slug/cart/:cartId/items/:productId` | Update item quantity |
| DELETE | `/s/:slug/cart/:cartId/items/:productId` | Remove item |

### Checkout

| Method | Path | Description |
|--------|------|-------------|
| GET | `/s/:slug/shipping-methods` | List available shipping methods |
| POST | `/s/:slug/checkout/shipping-rates` | Calculate shipping rates (body: city, items) |
| POST | `/s/:slug/checkout/sessions` | Create checkout session (body: cartId, customer, shipping) |
| POST | `/s/:slug/checkout/sessions/:sessionId/confirm` | Confirm + process payment |

### Orders & Tracking

| Method | Path | Description |
|--------|------|-------------|
| GET | `/s/:slug/order/:orderNumber` | Get order by number (query: phone) |
| GET | `/s/:slug/track/:orderNumber` | Track order (query: phone) |

## Response Format

```json
{
  "success": true,
  "data": { ... }
}
```

Error format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

## Webhooks (Inbound)

### Payment Webhook

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/payments/:provider` | 💳 Payment provider callback (provider: `moyasar`) |

### Shipping Webhook

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/shipping/:provider` | 🚚 Shipping provider callback (provider: `oto`) |

**All webhooks:** signature verification, idempotency, invalid signature → 401, duplicate ignored.

**Payload (Moyasar format):**
```json
{
  "type": "payment.succeeded",
  "data": {
    "id": "moyasar_payment_id",
    "status": "paid",
    "amount": 21900,
    "fee": 584,
    "metadata": {
      "internalPaymentId": "123",
      "orderId": "456"
    }
  }
}
```

**Event types handled:**
- `payment.succeeded` → updates payment/order to paid, creates wallet entries (sale credit + platform_fee debit)
- `payment.failed` → updates payment/order to failed, no wallet entries
- Unknown events → logged but safely ignored

**Idempotency:** Duplicate webhooks are detected via idempotency key and ignored after first processing. Wallet entries are created exactly once.

## Payment Methods

Payment methods are provider-specific and dynamic based on the active provider:

| Provider | Methods |
|----------|---------|
| `fake` | `fake_card_success`, `fake_card_fail` |
| `moyasar` | `moyasar_creditcard`, `moyasar_mada`, `moyasar_applepay`, `moyasar_stcpay` |

`getAvailablePaymentMethods()` returns the methods for the active provider.

## Payment Modes

| Mode | Description | Env |
|------|-------------|-----|
| `fake` | Default local mode. FakePaymentProvider, no real processing. | Default |
| `sandbox` | Moyasar sandbox mode. Requires `PAYMENT_SANDBOX_SECRET_KEY` + `PAYMENT_SANDBOX_PUBLIC_KEY`. | `PAYMENT_MODE=sandbox` with keys |
| `live` | ❌ **Blocked.** Rejected at startup and factory level. | `PAYMENT_MODE=live` → error |

`createPaymentProvider(code, mode)`:
- `createPaymentProvider('moyasar', 'live')` → throws "Live mode is strictly blocked"
- `createPaymentProvider('moyasar')` → falls back to FakePaymentProvider if sandbox keys missing
- `createPaymentProvider('fake')` → returns FakePaymentProvider

## Shipping Modes

| Mode | Provider | Env |
|------|----------|-----|
| `manual` | ManualShippingProvider (default) | Default |
| `mock` | HaaMockShippingProvider — mock labels, tracking | `SHIPPING_PROVIDER=haa_mock` |
| `sandbox` | OtoShippingProvider — needs keys, falls back to manual | `SHIPPING_PROVIDER=oto` + `OTO_SANDBOX_API_KEY` |
| `live` | ❌ Blocked — rejected at startup + factory | `SHIPPING_MODE=live` → error |
