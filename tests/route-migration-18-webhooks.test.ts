import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const webhooksRouteFile = resolve(projectRoot, 'apps/api/src/routes/webhooks.ts');
const paymentWebhookServiceFile = resolve(projectRoot, 'packages/commerce-core/src/payment-webhook-service.ts');
const commerceCoreIndex = resolve(projectRoot, 'packages/commerce-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 18/24
 *
 * Pins the contract that the webhooks route
 * (apps/api/src/routes/webhooks.ts) was migrated from
 * direct Drizzle + service-mixing access to a new
 * PaymentWebhookService in @haa/commerce-core.
 *
 * The route had ~80 lines of business logic inlined:
 *   1. Raw body extraction + signature header parsing
 *      (HTTP transport — stays in the route)
 *   2. Signature verification (provider boundary)
 *   3. Deduplication check (idempotency at the edge)
 *   4. JSON parse + provider.handleWebhook
 *   5. Post-payment orchestration in a transaction:
 *      - order status update
 *      - wallet credit (sale entry)
 *      - platform fee with snapshot (TASK-0030 path #2)
 *      - outbox events (payment.succeeded, order.paid)
 *      - notification (payment_success)
 *   6. Failure branch: failed payment + outbox + notification
 *   7. Refund branch: status update only
 *
 * The service owns concerns 2-7. The route is now a thin
 * transport shell that:
 *   - reads the raw body and signature header
 *   - calls PaymentWebhookService.process(...)
 *   - maps the structured result to 200/400/401
 *
 * The service composes PaymentService, OrdersService,
 * WalletLedger, StoreBillingSettingsService,
 * WebhookOutboxService, NotificationService — all
 * pre-existing services, no re-implementation.
 */
describe('Quality Pass 5 — Route Migration 18/24: webhooks.ts', () => {
  it('webhooks.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(webhooksRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('webhooks.ts route must NOT call db.* directly (no inline DB queries)', () => {
    const content = read(webhooksRouteFile);
    expect(content).not.toMatch(/db\.select|db\.update|db\.insert|db\.delete/);
    expect(content).not.toMatch(/db\.transaction/);
    expect(content).not.toMatch(/createDbClient/);
  });

  it('webhooks.ts route must use PaymentWebhookService for all data access', () => {
    const content = read(webhooksRouteFile);
    expect(content).toMatch(/PaymentWebhookService/);
    // The route should NOT directly instantiate the
    // orchestrating services anymore.
    expect(content).not.toMatch(/new\s+PaymentService\s*\(/);
    expect(content).not.toMatch(/new\s+OrdersService\s*\(/);
    expect(content).not.toMatch(/new\s+WalletLedger\s*\(/);
    expect(content).not.toMatch(/new\s+StoreBillingSettingsService\s*\(/);
    expect(content).not.toMatch(/new\s+WebhookOutboxService\s*\(/);
    expect(content).not.toMatch(/new\s+NotificationService\s*\(/);
  });

  it('webhooks.ts must preserve the single POST /webhooks/payments/:provider endpoint', () => {
    const content = read(webhooksRouteFile);
    expect(content).toMatch(/webhooksRouter\.post\(['"]\/payments\/:provider['"]/);
    expect(content).toMatch(/export\s*\{\s*webhooksRouter\s*\}/);
  });

  it('webhooks.ts must NOT have a requireAuth or requireStoreAccess guard (webhooks are unauthenticated, verified by signature)', () => {
    // The route is intentionally unauthenticated — payment
    // provider webhooks are signed, not session-based. This
    // pins the security model.
    const content = read(webhooksRouteFile);
    expect(content).not.toMatch(/requireAuth/);
    expect(content).not.toMatch(/requireStoreAccess/);
    expect(content).not.toMatch(/requirePermission/);
  });

  it('webhooks.ts must preserve all status codes (200, 400, 401) — these are decided by the route from the result envelope', () => {
    // After the migration, the route no longer hard-codes
    // 200/400/401 inline; it returns result.httpStatus from
    // the PaymentWebhookResult envelope. The service is what
    // decides which code to surface. We assert the route
    // uses the envelope.
    const content = read(webhooksRouteFile);
    expect(content).toMatch(/result\.httpStatus/);
    // The service must still surface 200/400/401 — the
    // contract with clients is preserved.
    const serviceContent = read(paymentWebhookServiceFile);
    expect(serviceContent).toMatch(/200/);
    expect(serviceContent).toMatch(/400/);
    expect(serviceContent).toMatch(/401/);
  });

  it('webhooks.ts must preserve all error codes (INVALID_SIGNATURE, WEBHOOK_ERROR, duplicate_ignored) — these live in the service', () => {
    // The route reads the error code from the result
    // envelope; the service is the source of truth.
    const content = read(webhooksRouteFile);
    expect(content).toMatch(/result\.code/);
    const serviceContent = read(paymentWebhookServiceFile);
    expect(serviceContent).toMatch(/INVALID_SIGNATURE/);
    expect(serviceContent).toMatch(/WEBHOOK_ERROR/);
    expect(serviceContent).toMatch(/duplicate_ignored/);
  });

  it('webhooks.ts must still read the raw body via c.req.text() (HTTP transport concern)', () => {
    const content = read(webhooksRouteFile);
    expect(content).toMatch(/c\.req\.text\(\)/);
  });

  it('webhooks.ts must still read signature headers (HTTP transport concern)', () => {
    const content = read(webhooksRouteFile);
    // Multiple provider-specific header names
    expect(content).toMatch(/x-moyasar-signature/);
    expect(content).toMatch(/x-signature/);
    expect(content).toMatch(/x-notification-token/);
    expect(content).toMatch(/x-idempotency-key|idempotency-key/);
  });

  it('webhooks.ts must delegate the dedup check to the service (dedup is a business concern, not a transport concern)', () => {
    // After the migration, dedup lives in the service
    // (called via the pure deduplicateWebhook helper,
    // re-exported from @haa/integration-core). The route
    // passes the idempotency key to the service as part of
    // the input envelope; the service runs the dedup check.
    const content = read(webhooksRouteFile);
    // The route does NOT call dedup directly anymore
    expect(content).not.toMatch(/deduplicateFromContext\s*\(/);
    expect(content).not.toMatch(/deduplicateWebhook\s*\(/);
    // The service does
    const serviceContent = read(paymentWebhookServiceFile);
    expect(serviceContent).toMatch(/deduplicateWebhook/);
  });

  it('webhooks.ts must not touch payments / orders / stores / walletEntries / paymentWebhookEvents tables directly', () => {
    const content = read(webhooksRouteFile);
    expect(content).not.toMatch(/s\.payments/);
    expect(content).not.toMatch(/s\.orders/);
    expect(content).not.toMatch(/s\.stores\)/);
    expect(content).not.toMatch(/s\.walletEntries/);
    expect(content).not.toMatch(/s\.paymentWebhookEvents/);
  });

  it('PaymentWebhookService must exist in @haa/commerce-core', () => {
    expect(existsSync(paymentWebhookServiceFile)).toBe(true);
    const content = read(paymentWebhookServiceFile);
    expect(content).toMatch(/export\s+class\s+PaymentWebhookService/);
    expect(content).toMatch(/export\s+type\s+PaymentWebhookResult/);
  });

  it('PaymentWebhookService must own the webhook processing (process, signature verify, dedup, post-payment orchestration)', () => {
    const content = read(paymentWebhookServiceFile);
    expect(content).toMatch(/async\s+process\b/);
    // Internal helpers for the post-payment branches
    expect(content).toMatch(/verifySignature|verifyWebhookSignature/);
    expect(content).toMatch(/deduplicate|deduplicateFromContext/);
    // Post-payment branches (paid, failed, refunded)
    expect(content).toMatch(/internalStatus\s*===\s*['"]paid['"]/);
    expect(content).toMatch(/internalStatus\s*===\s*['"]failed['"]/);
    expect(content).toMatch(/internalStatus\s*===\s*['"]refunded['"]/);
  });

  it('PaymentWebhookService must wrap the post-payment orchestration in a single DB transaction (atomicity preserved)', () => {
    const content = read(paymentWebhookServiceFile);
    // The service uses a transaction; the route does not.
    expect(content).toMatch(/db\.transaction/);
    // All the side-effects (order update, wallet credit, fee
    // entry, outbox, notification) live INSIDE the transaction.
    expect(content).toMatch(/updatePaymentStatus/);
    expect(content).toMatch(/changeStatus/);
    expect(content).toMatch(/recordEntry/);
    expect(content).toMatch(/hasPlatformFeeForOrder/);
    expect(content).toMatch(/recordEvent/);
  });

  it('PaymentWebhookService must preserve the TASK-0030 platform-fee snapshot (feeRatePct, feeFixed, feeSource)', () => {
    // This is the second site where platform fees are
    // recorded (the first is checkout.ts). The webhook path
    // must snapshot the policy onto the fee entry the same
    // way checkout does, to keep the immutability guarantee
    // consistent across both entry points.
    const content = read(paymentWebhookServiceFile);
    expect(content).toMatch(/feeRatePct/);
    expect(content).toMatch(/feeFixed/);
    expect(content).toMatch(/feeSource/);
    expect(content).toMatch(/['"]platform_policy['"]/);
  });

  it('PaymentWebhookService must compose the pre-existing services (no re-implementation)', () => {
    const content = read(paymentWebhookServiceFile);
    expect(content).toMatch(/PaymentService/);
    expect(content).toMatch(/OrdersService/);
    expect(content).toMatch(/WalletLedger/);
    expect(content).toMatch(/StoreBillingSettingsService/);
    expect(content).toMatch(/WebhookOutboxService/);
    expect(content).toMatch(/NotificationService/);
  });

  it('PaymentWebhookService must depend on @haa/integration-core (for WebhookOutboxService) — already in commerce-core deps', () => {
    const content = read(paymentWebhookServiceFile);
    expect(content).toMatch(/from\s+['"]@haa\/integration-core['"]/);
  });

  it('PaymentWebhookService must NOT re-implement provider.verifyWebhookSignature or provider.handleWebhook', () => {
    const content = read(paymentWebhookServiceFile);
    // The service calls into the provider via the factory,
    // not by re-implementing provider methods.
    expect(content).toMatch(/createPaymentProvider/);
    expect(content).toMatch(/provider\.verifyWebhookSignature/);
    expect(content).toMatch(/provider\.handleWebhook/);
  });

  it('PaymentWebhookService must be exported from @haa/commerce-core index', () => {
    const indexContent = read(commerceCoreIndex);
    expect(indexContent).toMatch(/PaymentWebhookService/);
    expect(indexContent).toMatch(/payment-webhook-service/);
    expect(indexContent).toMatch(/PaymentWebhookResult/);
  });
});
