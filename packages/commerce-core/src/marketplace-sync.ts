import { eq, and } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { AuditLogService, WebhookOutboxService } from '@haa/integration-core';

/**
 * Minimal interface for a marketplace provider service that
 * MarketplaceSyncService can call. The actual implementations
 * (Salla, Zid, Noon, Amazon) live in the API routes layer
 * (`apps/api/src/routes/marketplaces/`) because they were
 * originally authored as route handlers. The route injects a
 * resolver function that returns one of these.
 *
 * The interface is intentionally narrow: only the two methods
 * the auto-publish flow needs.
 */
export interface MarketplaceProvider {
  createProduct(input: {
    name: string;
    sku?: string;
    price?: string | number;
    quantity?: number;
  }): Promise<{ marketplaceProductId?: string; id?: string; marketplaceUrl?: string } | null | undefined>;
  updateProduct(productId: string, input: {
    name: string;
    sku?: string;
    price?: string | number;
    quantity?: number;
  }): Promise<{ marketplaceProductId?: string; id?: string; marketplaceUrl?: string } | null | undefined>;
}

/**
 * Resolver function: given a provider code, return a provider
 * service (or null if the code is unknown). Injected by the
 * caller so this service doesn't depend on the route layer.
 */
export type MarketplaceProviderResolver = (providerCode: string) => MarketplaceProvider | null | undefined;

/**
 * MarketplaceSyncService — orchestrates the fire-and-forget
 * sync of a product to all connected marketplaces.
 *
 * Originally the auto-publish logic was an inline helper in
 * `apps/api/src/routes/products.ts` (with 2 direct DB calls +
 * 2 service calls). Extracted to this service as part of
 * Quality Pass 5, Route Migration 8/24 so the route becomes
 * pure transport.
 *
 * The service:
 *   1. Reads the store's connected marketplace providers
 *   2. For each connected provider, calls create or update
 *      based on whether the product already has a channel
 *   3. Persists the updated channels map on the product row
 *   4. On any per-provider failure, records the audit + outbox
 *      event so operators can investigate
 *
 * The route passes a `providerResolver` (typically a thin
 * wrapper over the existing `getProviderService` in
 * `apps/api/src/routes/marketplaces.ts`).
 */

export interface AutoPublishInput {
  productId: number;
  productData: {
    name: string;
    // Loose types because the caller passes a product record
    // from ProductsService.create() which has nullable scalars.
    sku?: string | null;
    slug?: string | null;
    price?: number | string | null;
    stockQuantity?: number | null;
    marketplaceChannels?:
      | Record<string, { productId?: string; url?: string; price?: string; status?: string }>
      | null;
  };
  actorUserId?: number | null;
  providerResolver: MarketplaceProviderResolver;
}

export interface AutoPublishResult {
  channels: Record<string, { productId?: string; url?: string; price?: string; status?: string }>;
  errors: string[];
}

export class MarketplaceSyncService {
  constructor(
    private db: DbClient = createDbClient(),
    private audit: AuditLogService = new AuditLogService(),
    private outbox: WebhookOutboxService = new WebhookOutboxService(),
  ) {}

  /**
   * Find the tenant for a store. Returns null if the store is
   * not found (which would be a data integrity issue).
   */
  private async getStoreTenantId(storeId: number): Promise<number | null> {
    const [store] = await this.db
      .select({ tenantId: s.stores.tenantId })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    return store?.tenantId ?? null;
  }

  /**
   * Record a marketplace sync failure (audit + webhook outbox).
   * Best-effort: errors here are swallowed because we're
   * already in an error-handling path.
   */
  private async recordFailure(
    storeId: number,
    productId: number,
    actorUserId: number | null | undefined,
    details: Record<string, unknown>,
  ): Promise<void> {
    const tenantId = await this.getStoreTenantId(storeId);
    await Promise.allSettled([
      this.audit.record({
        actorUserId: actorUserId ?? null,
        storeId,
        action: 'product_marketplace_sync_failed',
        entityType: 'product',
        entityId: productId,
        newValue: details,
      }),
      tenantId
        ? this.outbox.recordEvent('product.marketplace_sync_failed', storeId, tenantId, {
          productId,
          ...details,
        })
        : Promise.resolve(),
    ]);
  }

  /**
   * Auto-publish a product to all the store's connected
   * marketplaces. Fire-and-forget at the call site (no await
   * in the route) — this method returns a Promise but the
   * route does not wait for it. Errors are recorded via audit
   * + webhook outbox so operators can investigate.
   */
  async autoPublishToMarketplaces(
    storeId: number,
    input: AutoPublishInput,
  ): Promise<AutoPublishResult> {
    const connections = await this.db
      .select({
        id: s.marketplaceConnections.id,
        code: s.marketplaceProviders.code,
      })
      .from(s.marketplaceConnections)
      .innerJoin(s.marketplaceProviders, eq(s.marketplaceConnections.providerId, s.marketplaceProviders.id))
      .where(and(
        eq(s.marketplaceConnections.storeId, storeId),
        eq(s.marketplaceConnections.isConnected, true),
      ));

    if (connections.length === 0) {
      return { channels: {}, errors: [] };
    }

    const existingChannels: Record<string, { productId?: string; url?: string; price?: string; status?: string }> =
      input.productData.marketplaceChannels || {};
    // The `channels` map's value type allows `productId` to be
    // optional in the error case (the original route's behavior:
    // preserve the existing entry but mark status='error' even if
    // the entry had no productId). New entries we add always have
    // a productId (defaulted to 'unknown' if the provider doesn't
    // return one), which the schema requires.
    const channels: Record<string, { productId?: string; url?: string; price?: string; status?: string }> = {
      ...existingChannels,
    };
    const errors: string[] = [];

    for (const conn of connections) {
      const providerCode = conn.code;
      if (!providerCode) continue;

      try {
        const service = input.providerResolver(providerCode);
        if (!service) continue;

        const existingListing = existingChannels[providerCode];
        const priceStr = input.productData.price != null
          ? (typeof input.productData.price === 'string'
              ? input.productData.price
              : input.productData.price.toString())
          : undefined;

        let result: Awaited<ReturnType<MarketplaceProvider['createProduct']>>;
        const sku = input.productData.sku || input.productData.slug || undefined;
        if (existingListing?.productId) {
          result = await service.updateProduct(existingListing.productId, {
            name: input.productData.name,
            sku,
            price: priceStr,
            quantity: input.productData.stockQuantity ?? 0,
          });
        } else {
          result = await service.createProduct({
            name: input.productData.name,
            sku,
            price: priceStr,
            quantity: input.productData.stockQuantity ?? 0,
          });
        }

        channels[providerCode] = {
          productId: result?.marketplaceProductId || result?.id || existingListing?.productId || 'unknown',
          url: result?.marketplaceUrl || existingListing?.url,
          price: priceStr,
          status: 'active',
        };
      } catch (err: any) {
        errors.push(`${providerCode}: ${err.message}`);
        if (existingChannels[providerCode]) {
          channels[providerCode] = { ...existingChannels[providerCode], status: 'error' };
        }
      }
    }

    if (Object.keys(channels).length > 0) {
      // Cast to the schema's strict type: the schema requires
      // productId: string on every entry. Our internal `channels`
      // map allows optional productId (for the error case where
      // we preserve a malformed existing entry), so we narrow
      // here. In practice, successful updates always set
      // productId; the error path is rare.
      await this.db
        .update(s.products)
        .set({
          marketplaceChannels: channels as Record<string, { productId: string; url?: string; price?: string; status?: string }>,
          updatedAt: new Date(),
        })
        .where(eq(s.products.id, input.productId));
    }

    return { channels, errors };
  }

  /**
   * Fire-and-forget wrapper: runs autoPublishToMarketplaces and
   * records the failure (audit + outbox) on error. Returns
   * nothing — caller does not await.
   */
  scheduleAutoPublish(storeId: number, input: AutoPublishInput): void {
    this.autoPublishToMarketplaces(storeId, input)
      .then((result) => {
        if (result.errors.length === 0) return;
        this.recordFailure(storeId, input.productId, input.actorUserId, {
          errors: result.errors,
          channels: result.channels,
        });
      })
      .catch((err: any) => {
        this.recordFailure(storeId, input.productId, input.actorUserId, {
          error: err?.message ?? 'Unknown marketplace sync error',
        });
      });
  }
}

/** Shared default instance for ad-hoc callers (most code uses DI). */
export const marketplaceSyncService = new MarketplaceSyncService();
