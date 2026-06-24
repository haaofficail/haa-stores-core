# OTO Shipping Aggregator — Readiness Guide

> Status: **CODE COMPLETE — CREDENTIALS REQUIRED**
> Implementation: `packages/shipping-core/src/oto.ts`

---

## What is Implemented

| Feature                           | File                                           | Status |
| --------------------------------- | ---------------------------------------------- | ------ |
| `ShippingProvider` interface      | `packages/shipping-core/src/base.ts`           | ✅     |
| `OtoShippingProvider` class       | `packages/shipping-core/src/oto.ts`            | ✅     |
| Sandbox API support               | `OTO_SANDBOX_API_KEY` or `OTO_SANDBOX_API_KEY` | ✅     |
| Live API support                  | `OTO_API_KEY` or `OTO_ACCESS_TOKEN`            | ✅     |
| Webhook secret verification       | `OTO_WEBHOOK_SECRET`                           | ✅     |
| Shipping rates fetch              |                                                | ✅     |
| Shipment creation                 |                                                | ✅     |
| Shipment tracking                 |                                                | ✅     |
| `SHIPPING_PROVIDER=oto` env guard | `apps/api/src/env.ts`                          | ✅     |

---

## Required Environment Variables

Set these in `deploy/production/.env` before enabling OTO:

```env
SHIPPING_PROVIDER=oto
SHIPPING_MODE=sandbox           # → 'live' after OTO approval

# Choose ONE of these credentials:
OTO_API_KEY=<your-live-api-key>            # Preferred for live
OTO_ACCESS_TOKEN=<your-access-token>       # Alternative
OTO_SANDBOX_API_KEY=<your-sandbox-key>     # Sandbox only

# Optional
OTO_MARKETPLACE_TOKEN=<marketplace-token>  # If using OTO marketplace flow
OTO_PLATFORM_MODE=live                     # 'live' or 'sandbox'

# Webhook verification (recommended)
OTO_WEBHOOK_SECRET=<webhook-secret>
OTO_WEBHOOK_PUBLIC_KEY=<webhook-public-key>
OTO_WEBHOOK_AUTHORIZATION_KEY=<auth-key>

# Optional — defaults to OTO production API
# OTO_API_BASE_URL=https://api.tryoto.com/rest/v2
```

---

## API Endpoints

| Mode    | Base URL                                 |
| ------- | ---------------------------------------- |
| Sandbox | `https://staging-api.tryoto.com/rest/v2` |
| Live    | `https://api.tryoto.com/rest/v2`         |

The provider auto-selects based on `OTO_PLATFORM_MODE` or presence of `OTO_SANDBOX_API_KEY`.

---

## Env Guardrails (enforced by `apps/api/src/env.ts`)

| Rule                                                         | Enforcement                             |
| ------------------------------------------------------------ | --------------------------------------- |
| `SHIPPING_PROVIDER=oto` requires at least one OTO credential | `superRefine` in `envSchema`            |
| `SHIPPING_MODE=live` is rejected by shipping factory         | `packages/shipping-core/src/factory.ts` |

`SHIPPING_MODE=live` must be unblocked in `factory.ts` once OTO live keys are in hand.

---

## Shipping Flow

```
Customer → Storefront → GET /api/shipping/rates
       → getShippingRates({origin, destination, parcel})
       → OTO /rates endpoint
       → Return array of {provider, price, eta}

Customer selects rate → POST /api/orders/confirm
       → createShipment({orderId, rate, address})
       → OTO /shipments endpoint
       → Receive {trackingNumber, label}

Fulfillment → GET /api/shipping/track/:trackingNumber
       → getTrackingStatus(trackingNumber)
       → OTO /tracking endpoint
       → Return {status, events[]}

OTO events → POST /api/shipping/webhooks/oto
       → verifyWebhookSignature()
       → Update order fulfillment status
```

---

## Sandbox Testing Steps

1. Register at [OTO Dashboard](https://dashboard.tryoto.com) and obtain sandbox API key
2. Set `OTO_SANDBOX_API_KEY`, `SHIPPING_MODE=sandbox`, `OTO_PLATFORM_MODE=sandbox`
3. Deploy to staging
4. Create a test shipment via checkout flow
5. Verify shipping rates are returned
6. Verify tracking number received
7. Trigger a test webhook event and verify it is processed

---

## Going Live (SHIPPING_MODE=live)

1. Obtain live API key from OTO account team
2. Set `OTO_API_KEY` to live value and `OTO_PLATFORM_MODE=live`
3. Remove the `throw` in `factory.ts` that blocks `SHIPPING_MODE=live`
4. Set `SHIPPING_MODE=live` in production `.env`
5. Create a test live shipment with a real (small) package
6. Verify webhook delivery to production endpoint

---

## Supported Shipping Carriers (via OTO)

OTO aggregates multiple Saudi carriers. The available carriers depend on your OTO merchant agreement. Common carriers include:

- Aramex
- SMSA Express
- DHL Express
- Saudi Post

Carrier availability is returned dynamically from the OTO rates API per shipment.

---

## Fallback: manual shipping

If OTO is not yet configured, the system falls back to `SHIPPING_PROVIDER=manual`:

```env
SHIPPING_PROVIDER=manual
SHIPPING_MODE=manual
```

Manual shipping means orders are fulfilled offline — merchants coordinate shipping themselves. This is the safe default until OTO credentials are available.

---

## Relevant Files

| File                                    | Purpose                                       |
| --------------------------------------- | --------------------------------------------- |
| `packages/shipping-core/src/oto.ts`     | Full provider implementation                  |
| `packages/shipping-core/src/base.ts`    | `ShippingProvider` interface                  |
| `packages/shipping-core/src/factory.ts` | Provider factory (`SHIPPING_MODE=live` guard) |
| `apps/api/src/env.ts`                   | Zod guardrails for OTO credentials            |
| `tests/production-guardrails.test.ts`   | Automated guardrail tests                     |
| `deploy/production/.env.example`        | Env variable template                         |

---

## W5 Failure Scenarios (Autopilot Phase 3)

The shipping aggregator must handle the following 6 failure modes
without crashing the checkout flow or silently dropping orders.
Each scenario maps to a specific guard in the shipping-core layer:

| Scenario                  | Handler module                                              | Guard                                                                                                      |
| ------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Provider unavailable      | `packages/shipping-core/src/factory.ts`                     | `getShippingProviderStatus()` returns `provider_error`; UI falls back to manual.                           |
| Invalid webhook signature | `apps/api/src/routes/shipping-webhooks.ts` + provider class | `verifyWebhookSignature()` returns false → 401 + audit log, no DB mutation.                                |
| Duplicate webhook         | `apps/api/src/routes/shipping-webhooks.ts`                  | `deduplicateWebhook()` via `@haa/integration-core` — second arrival returns `duplicate_ignored`.           |
| Rate timeout              | `packages/shipping-core/src/rate-cache.ts`                  | Cached rate served when provider exceeds the timeout budget; otherwise empty rates returned (no throw).    |
| Label creation failure    | Provider class `createLabel()`                              | Returns `{ success: false }` shape (no exception); merchant dashboard surfaces the message + retry button. |
| Return request failure    | `packages/shipping-core/src/returns.ts`                     | `requestReturn()` returns failure with a reason; UI prompts merchant to escalate to ops.                   |

**Live shipping is gated** by the readiness state machine in
`readiness.ts` — providers stay in `live_locked` until: (a) credentials
are present, (b) sandbox is `sandbox_verified`, (c) owner has flipped
the launch gate.
