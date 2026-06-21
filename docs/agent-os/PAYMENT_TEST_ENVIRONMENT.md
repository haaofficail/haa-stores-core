# Payment Test Environment — DECISION-OS-012

> The catalogue of fake/mock scenarios for payment integration testing.
> CI uses **mock only**. Staging uses **mock or sandbox only**. No live money.

---

## FakePaymentProvider scenarios (`packages/payment-providers/src/fake.ts`)

Triggered via `metadata.paymentMethod` on `createPaymentIntent`:

| `paymentMethod`                           | Outcome on `confirmPayment`                   | Internal status                     | Purpose                    |
| ----------------------------------------- | --------------------------------------------- | ----------------------------------- | -------------------------- |
| `fake_card_success`                       | `success: true`                               | `paid`                              | Happy path                 |
| `fake_card_failed` / `fake_card_declined` | `success: false`                              | `failed`                            | Card declined              |
| `fake_card_cancelled`                     | `success: false`                              | `failed`                            | User abandoned at provider |
| `fake_card_expired`                       | `success: false`                              | `failed`                            | Intent expired pre-confirm |
| `bank_transfer`                           | `success: true`                               | `pending`                           | Async confirmation flow    |
| `cash_on_delivery`                        | `success: true`                               | `pending`                           | COD flow                   |
| `fake_3ds_challenge`                      | redirect to `/fake-3ds-challenge?paymentId=…` | `requires_3ds` → `paid` on callback | SAMA 3DS simulation        |

## Webhook scenarios (handler-side, not provider-side)

These are orchestrated by `PaymentWebhookService` (`packages/commerce-core/src/payment-webhook-service.ts`) and the `webhook-dedup` middleware (`apps/api/src/middleware/webhook-dedup.ts`):

| Scenario                | Mechanism                                                                                                       | Coverage                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Duplicate webhook       | `deduplicateWebhook` returns cached result on `(provider, rawBody, signature)` or `x-idempotency-key` collision | dedup helper tests + integration                                                                |
| Invalid signature       | `verifyWebhookSignature` returns `false` → 401 `INVALID_SIGNATURE`; `timingSafeEqual` constant-time             | per-provider test                                                                               |
| Delayed webhook         | dedup tolerates arrival after the confirm callback wrote a row by the same provider                             | inherent — confirm and webhook converge on the same `payments` row                              |
| Webhook-before-callback | webhook sets the final status; callback is a UI redirect only                                                   | guarded by `WalletPostingService` dedup (per-instance) + DB unique constraint on `platform_fee` |
| Callback-before-webhook | callback must NOT confirm a payment by itself; final state arrives via webhook                                  | covered by `payment-webhook-service.ts` design (callback is informational)                      |

## Forbidden in CI and staging

- Live provider API calls (`fetch` against real provider hosts).
- Real merchant credentials (always blocked by `PAYMENT_SANDBOX_SECRET_KEY` being unset in CI).
- Webhook calls to live endpoints.
- Printing secret values in logs.

## Test command

```bash
pnpm test
# or per package:
pnpm --filter @haa/payment-providers test
pnpm --filter @haa/commerce-core test
```

## Open follow-ups (tracked in `REMAINING_WORK.md`)

- Geidea sandbox skeleton (Wave 4).
- Webhook simulator CLI for delay/duplicate orchestration.
- Sandbox key vaulting per-store via merchant dashboard diagnostics UI.
