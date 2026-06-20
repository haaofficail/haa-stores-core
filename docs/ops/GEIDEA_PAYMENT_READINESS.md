# Geidea Payment Gateway — Readiness Guide

> Status: **CODE COMPLETE — CREDENTIALS REQUIRED**
> Implementation: `packages/payment-providers/src/geidea.ts`

---

## What is Implemented

| Feature                          | File                                                | Status |
| -------------------------------- | --------------------------------------------------- | ------ |
| `PaymentProvider` interface      | `packages/payment-providers/src/base.ts`            | ✅     |
| `GeideaPaymentProvider` class    | `packages/payment-providers/src/geidea.ts`          | ✅     |
| HMAC-SHA256 signature generation | `createGeideaSignature()` in `base.ts`              | ✅     |
| Callback signature verification  | `verifyGeideaCallbackSignature()` in `base.ts`      | ✅     |
| `createPaymentIntent()`          | Returns `{url, orderId}` for 3DS redirect           | ✅     |
| `confirmPayment()`               | Validates HMAC, maps response codes                 | ✅     |
| `getPaymentStatus()`             | Polls Geidea order status API                       | ✅     |
| `handleWebhook()`                | Verifies signature, dispatches events               | ✅     |
| `refundPayment()`                | Stubbed — returns error until confirmed with Geidea | ⚠️     |
| Mada support                     | `GEIDEA_CAPABILITIES.supportsMada = true`           | ✅     |
| Apple Pay support                | `GEIDEA_CAPABILITIES.supportsApplePay = true`       | ✅     |
| 3DS support                      | `GEIDEA_CAPABILITIES.supports3DS = true`            | ✅     |

---

## Required Environment Variables

Set these in `deploy/production/.env` before enabling Geidea:

```env
PAYMENT_PROVIDER=geidea
PAYMENT_MODE=sandbox          # → 'live' after Geidea approval

# From Geidea Merchant Portal
GEIDEA_MERCHANT_PUBLIC_KEY=<your-merchant-public-key>
GEIDEA_API_PASSWORD=<your-api-password>

# Optional — defaults to Geidea production API
# GEIDEA_API_BASE_URL=https://api.merchant.geidea.net

# Must match exactly what is registered in Geidea portal
GEIDEA_CALLBACK_URL=https://haastores.com/api/payments/geidea/callback
GEIDEA_RETURN_URL=https://haastores.com/checkout/result
```

---

## Env Guardrails (enforced by `apps/api/src/env.ts`)

| Rule                                                            | Enforcement                                 |
| --------------------------------------------------------------- | ------------------------------------------- |
| `PAYMENT_PROVIDER=fake` is rejected in `NODE_ENV=production`    | `superRefine` in `envSchema`                |
| `PAYMENT_PROVIDER=geidea` requires `GEIDEA_MERCHANT_PUBLIC_KEY` | `superRefine`                               |
| `PAYMENT_PROVIDER=geidea` requires `GEIDEA_API_PASSWORD`        | `superRefine`                               |
| `PAYMENT_MODE=live` is rejected by payment factory              | `packages/payment-providers/src/factory.ts` |

`PAYMENT_MODE=live` must be unblocked in `factory.ts` once Geidea live keys are in hand.

---

## Payment Flow (3DS)

```
Customer → Storefront → POST /api/checkout/initiate
       → createPaymentIntent()
       → Geidea /api/direct/order (POST)
       → Receive {gatewayOrderId, redirectUrl}
       → Redirect customer to redirectUrl (3DS hosted page)
       → Customer completes authentication
       → Geidea POSTs callback to GEIDEA_CALLBACK_URL
       → verifyGeideaCallbackSignature()
       → confirmPayment()
       → Order status updated → Customer redirected to GEIDEA_RETURN_URL
```

---

## Sandbox Testing Steps

1. Obtain sandbox credentials from [Geidea Developer Portal](https://developer.geidea.net)
2. Set `GEIDEA_MERCHANT_PUBLIC_KEY`, `GEIDEA_API_PASSWORD`, `PAYMENT_MODE=sandbox`
3. Deploy to staging
4. Run a test checkout with a Geidea sandbox card
5. Verify callback received and order status updated
6. Verify webhook signature check passes

---

## Going Live (PAYMENT_MODE=live)

1. Receive live credentials from Geidea account team
2. Update `GEIDEA_MERCHANT_PUBLIC_KEY` and `GEIDEA_API_PASSWORD` to live values
3. Register `GEIDEA_CALLBACK_URL` and `GEIDEA_RETURN_URL` in Geidea merchant portal
4. Remove the `throw` in `factory.ts` that blocks `PAYMENT_MODE=live`
5. Set `PAYMENT_MODE=live` in production `.env`
6. Run a low-value real transaction to confirm end-to-end
7. Contact Geidea to enable refunds before removing the `refundPayment()` stub

---

## Refund Note

`refundPayment()` currently returns:

```json
{
  "success": false,
  "message": "Geidea refunds require live provider confirmation before enabling."
}
```

Enable refunds only after:

- Geidea account team confirms API refund endpoint access
- Refund flow tested in sandbox
- Replace the stub body with the actual Geidea refund API call

---

## Relevant Files

| File                                             | Purpose                                      |
| ------------------------------------------------ | -------------------------------------------- |
| `packages/payment-providers/src/geidea.ts`       | Full provider implementation                 |
| `packages/payment-providers/src/base.ts`         | `PaymentProvider` interface + HMAC helpers   |
| `packages/payment-providers/src/factory.ts`      | Provider factory (`PAYMENT_MODE=live` guard) |
| `apps/api/src/env.ts`                            | Zod guardrails for Geidea keys               |
| `tests/production-guardrails.test.ts`            | Automated guardrail tests                    |
| `tests/geidea-settlement-reconciliation.test.ts` | Geidea settlement tests                      |
| `deploy/production/.env.example`                 | Env variable template                        |
