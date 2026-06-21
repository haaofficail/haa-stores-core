# Geidea Readiness — DECISION-OS-011

> Geidea is the intended primary payment provider. Build the infrastructure now; **no live API calls** until official endpoints / credentials / signature rules arrive.

---

## Readiness states

| State                | Meaning                                                                               | Code surface                                                               |
| -------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `not_configured`     | `GEIDEA_MERCHANT_PUBLIC_KEY` and/or `GEIDEA_API_PASSWORD` not set                     | `GeideaPaymentProvider.isAvailable === false` (`geidea.ts:30-32`)          |
| `mock_ready`         | `FakePaymentProvider` simulates the Geidea-shaped flow for dev/CI                     | covered by Wave 3 scenarios                                                |
| `sandbox_configured` | sandbox credentials set in env; `PAYMENT_MODE=sandbox`; no live money                 | `geidea.ts:22, 24, 25`                                                     |
| `sandbox_verified`   | sandbox round-trip executed manually with success/declined/3DS proofs                 | tracked in launch readiness checklist, not in code                         |
| `live_locked`        | live capabilities advertised as `false` until refund + partial refund are implemented | **current state** — `base.ts: GEIDEA_CAPABILITIES.supportsRefunds = false` |
| `live_ready`         | live credentials present, refund implemented, DPA + PCI-ASV signed off, owner GO      | gated by G6 + G9 owner gates                                               |

## Why refund capabilities are off

`supportsRefunds: false` and `supportsPartialRefunds: false` (in `base.ts: GEIDEA_CAPABILITIES`) hide refund actions from the merchant UI until `GeideaPaymentProvider.refundPayment()` (`geidea.ts:91-94`) is implemented for real. The stub currently returns `{ success: false }` regardless of input — advertising refund support while it always fails is worse than not advertising it.

When the live implementation lands:

1. Replace the stub in `geidea.ts:91-94` with a real Geidea Refund API call.
2. Flip both capability flags back to `true` in `base.ts`.
3. Add `tests/geidea-refund.test.ts` exercising success / partial / failure paths against the sandbox.

## Required env (none committed)

These are listed for documentation only. **Never commit values.**

- `GEIDEA_MERCHANT_PUBLIC_KEY`
- `GEIDEA_API_PASSWORD`
- `GEIDEA_API_BASE_URL` (defaults to `https://api.merchant.geidea.net`)
- `GEIDEA_CALLBACK_URL` — server-side webhook endpoint
- `GEIDEA_RETURN_URL` — storefront return URL after the hosted page

## Webhook contract

- Endpoint: `POST /webhooks/payments/geidea` (Caddy strips `/api/*` per DECISION-OS-015; the Hono mount is `/webhooks/payments/:provider`).
- Signature: `verifyGeideaCallbackSignature` in `base.ts` (HMAC-SHA256 + `crypto.timingSafeEqual`).
- Dedup: `deduplicateWebhook` middleware key = `(provider, rawBody, signature)` or `x-idempotency-key` if provided.

## Idempotency

- Provider-level: provider's `merchantReferenceId` (`geidea.ts:47`) is unique per attempt.
- Payment-level: `payments.idempotency_key` UNIQUE constraint (DB-enforced).
- Wallet-level: `platform_fee` has DB UNIQUE per `(storeId, referenceId)`; the other 7 wallet types relying on in-memory dedup pending Wave 16 migration (DECISION-OS-018).

## Operator runbook (when credentials arrive)

1. Open `docs/ops/PRODUCTION_READINESS_CHECKLIST.md` §3 (Geidea).
2. Populate `deploy/production/.env` with the 5 env vars above.
3. Verify `isAvailable` returns true in staging via diagnostics endpoint.
4. Run sandbox happy path manually; capture proofs.
5. Implement refund (see "Why refund capabilities are off" above).
6. Flip capability flags + open PR `feat(payment-providers): implement Geidea refund`.
7. Owner GO required before flipping `PAYMENT_MODE=live`.
