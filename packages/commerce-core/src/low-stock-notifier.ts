/**
 * HAA-LOW-STOCK-EMAIL — per-product low-stock merchant alert dispatcher.
 *
 * Wired into `CheckoutService` AFTER the payment transaction commits.
 * Never inside a transaction. Email failure must NEVER throw from
 * checkout — the DB row (`products.stock_quantity`) is the source of
 * truth.
 *
 * Behaviour contract:
 *
 *   - For each updated product, check whether `stock_quantity` is
 *     at-or-below the per-store threshold (`store_settings.low_stock_threshold`,
 *     fallback 5).
 *   - Filter by the 24h dedupe window: only send when
 *     `last_low_stock_alerted_at` IS NULL OR older than 24h ago.
 *   - On successful send, UPDATE `last_low_stock_alerted_at = NOW()`.
 *     A failure MUST NOT consume the window — the next dip re-arms.
 *
 * Reset hook: when stock is incremented back above the threshold
 * (refund path), `resetForUpdatedProducts` clears `last_low_stock_alerted_at`
 * so the next dip re-triggers the alert.
 *
 * Provider precedence: shared with welcome + publish-success emails
 * via `pickWelcomeEmailProvider()` (SMTP > Resend). No provider, no
 * recipient, no merchant — silent no-op.
 *
 * Logging: kind=low_stock store=${id} ids=${count} err=${msg}. NEVER
 * logs product names, SKUs, or the merchant email — those are PII.
 */

import { and, eq, inArray, sql } from 'drizzle-orm';
import { type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { renderLowStockEmail, type LowStockContext } from '@haa/notification-core';
import { pickWelcomeEmailProvider } from './email-provider.js';

const ALERT_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_THRESHOLD = 5;

/**
 * Internal — full context required to resolve recipient + render the
 * email. Extends the public `LowStockContext` (which the renderer needs)
 * with `merchantEmail` (which the renderer doesn't, but the provider's
 * `recipient` does). Kept private to this module so we don't leak a
 * recipient field into the notification-core public surface.
 */
interface LowStockEmailContext extends LowStockContext {
  merchantEmail: string;
}

/**
 * Resolve the merchant dashboard base URL. Mirrors `publish-gate.ts`
 * and `auth-flow.ts` — the dashboard is hosted on the apex
 * `merchant.<apex>` subdomain.
 */
function buildDashboardUrl(): string {
  const apex = (process.env.STOREFRONT_APEX_DOMAIN || 'haastores.com').replace(/^https?:\/\//, '');
  return `https://merchant.${apex}`;
}

export class LowStockNotifier {
  constructor(private db: DbClient) {}

  /**
   * Inspect the supplied product ids, decide which crossed the
   * low-stock threshold and are outside the 24h dedupe window, then
   * fire a single merchant alert email and (on success) stamp the
   * dedupe column.
   *
   * Fire-and-forget contract: callers `.catch(() => {})` this. The
   * method itself swallows errors with structured logs (no PII) and
   * never throws.
   */
  async fireForUpdatedProducts(
    storeId: number,
    updatedProductIds: number[],
  ): Promise<void> {
    if (updatedProductIds.length === 0) return;
    const uniqueIds = Array.from(new Set(updatedProductIds));

    try {
      const threshold = await this.resolveThreshold(storeId);

      // Pull each product's current stock + dedupe timestamp.
      const rows = await this.db
        .select({
          id: s.products.id,
          name: s.products.name,
          sku: s.products.sku,
          stockQuantity: s.products.stockQuantity,
          lastLowStockAlertedAt: s.products.lastLowStockAlertedAt,
        })
        .from(s.products)
        .where(
          and(
            eq(s.products.storeId, storeId),
            eq(s.products.trackInventory, true),
            inArray(s.products.id, uniqueIds),
          ),
        );

      const cutoff = new Date(Date.now() - ALERT_WINDOW_MS);

      // Filter to products at-or-below threshold AND outside the 24h
      // dedupe window. NULL last_low_stock_alerted_at counts as "never
      // alerted" (always eligible).
      const eligible = rows.filter(
        (r) =>
          r.stockQuantity <= threshold &&
          (r.lastLowStockAlertedAt === null ||
            r.lastLowStockAlertedAt < cutoff),
      );

      if (eligible.length === 0) return;

      const provider = pickWelcomeEmailProvider();
      if (!provider) return;

      const emailCtx = await this.buildEmailContext(storeId, eligible, threshold);
      if (!emailCtx) return;

      const { subject, html } = renderLowStockEmail({
        merchantName: emailCtx.merchantName,
        storeName: emailCtx.storeName,
        dashboardUrl: emailCtx.dashboardUrl,
        items: emailCtx.items,
      });

      await provider.send({ recipient: emailCtx.merchantEmail, subject, body: html });

      // SUCCESS only: stamp the dedupe column. A failure above means
      // we throw out of try/catch BEFORE this UPDATE — preserving the
      // "failures do NOT consume the 24h window" invariant.
      const eligibleIds = eligible.map((r) => r.id);
      await this.db
        .update(s.products)
        .set({ lastLowStockAlertedAt: sql`NOW()` })
        .where(inArray(s.products.id, eligibleIds));
    } catch (err) {
      console.error(
        '[low-stock-email] kind=low_stock store=' +
          storeId +
          ' ids=' +
          uniqueIds.length +
          ' err=' +
          (err instanceof Error ? err.message : 'unknown'),
      );
    }
  }

  /**
   * Inverse of `fireForUpdatedProducts`. When stock is restocked
   * (refund flow / manual restock), any product whose current
   * `stock_quantity` is now strictly greater than the per-store
   * threshold gets its `last_low_stock_alerted_at` cleared back to
   * NULL — so the next dip below threshold re-arms the alert.
   *
   * Fire-and-forget contract: errors swallowed with structured logs.
   */
  async resetForUpdatedProducts(
    storeId: number,
    productIds: number[],
  ): Promise<void> {
    if (productIds.length === 0) return;
    const uniqueIds = Array.from(new Set(productIds));

    try {
      const threshold = await this.resolveThreshold(storeId);

      // Single statement: clear only when stockQuantity > threshold.
      // Products still at-or-below threshold KEEP their dedupe stamp
      // so we don't re-fire on the same dip.
      await this.db
        .update(s.products)
        .set({ lastLowStockAlertedAt: null })
        .where(
          and(
            eq(s.products.storeId, storeId),
            inArray(s.products.id, uniqueIds),
            sql`${s.products.stockQuantity} > ${threshold}`,
          ),
        );
    } catch (err) {
      console.error(
        '[low-stock-email] kind=low_stock_reset store=' +
          storeId +
          ' ids=' +
          uniqueIds.length +
          ' err=' +
          (err instanceof Error ? err.message : 'unknown'),
      );
    }
  }

  /**
   * Read `store_settings.low_stock_threshold` with a sensible default
   * when the row is missing or the column is NULL.
   */
  private async resolveThreshold(storeId: number): Promise<number> {
    const [row] = await this.db
      .select({ lowStockThreshold: s.storeSettings.lowStockThreshold })
      .from(s.storeSettings)
      .where(eq(s.storeSettings.storeId, storeId))
      .limit(1);
    const t = row?.lowStockThreshold;
    if (typeof t !== 'number' || !Number.isFinite(t) || t < 0) return DEFAULT_THRESHOLD;
    return t;
  }

  /**
   * Assemble the full email context. Mirrors `PublishGateService.buildPublishedContext`:
   * we walk store → tenant → first tenant_user → user, pulling the
   * merchant's display name + email and the store's display name.
   *
   * Filters the `items` list to the eligible rows the caller passed in
   * (already filtered by threshold + dedupe window). Adds the per-item
   * deep link to the merchant dashboard.
   *
   * Returns null if any required field can't be resolved — caller
   * treats null as "skip the email".
   */
  private async buildEmailContext(
    storeId: number,
    eligible: Array<{
      id: number;
      name: string;
      sku: string | null;
      stockQuantity: number;
      lastLowStockAlertedAt: Date | null;
    }>,
    threshold: number,
  ): Promise<LowStockEmailContext | null> {
    const [store] = await this.db
      .select({
        name: s.stores.name,
        slug: s.stores.slug,
        tenantId: s.stores.tenantId,
      })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    if (!store) return null;

    const [tenantUser] = await this.db
      .select({ userId: s.tenantUsers.userId })
      .from(s.tenantUsers)
      .where(eq(s.tenantUsers.tenantId, store.tenantId))
      .limit(1);
    if (!tenantUser) return null;

    const [user] = await this.db
      .select({ name: s.users.name, email: s.users.email })
      .from(s.users)
      .where(eq(s.users.id, tenantUser.userId))
      .limit(1);
    if (!user) return null;
    if (!user.email) return null;
    if (!user.name) return null;

    const dashboardUrl = buildDashboardUrl();

    return {
      merchantName: user.name,
      merchantEmail: user.email,
      storeName: store.name,
      dashboardUrl,
      items: eligible.map((row) => ({
        name: row.name,
        sku: row.sku,
        currentStock: row.stockQuantity,
        threshold,
        productUrl: `${dashboardUrl}/products/${row.id}`,
      })),
    };
  }
}

