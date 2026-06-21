import { eq, and, count, desc } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { mergeAndResolveThemeConfig, resolveActiveThemeConfig } from '@haa/theme-system/server';
import { resolveStoreThemePrimaryColor } from '@haa/shared';

/**
 * StoreSettingsService — owns the store-level configuration
 * business logic.
 *
 * Encapsulates:
 *   - Store metadata CRUD (name, slug, description, logo, contact)
 *   - Store config (welcome message, prep time, min order, address)
 *   - Size guides
 *   - Pickup locations
 *   - Product feature flags
 *   - Theme config + history snapshots
 *   - Gift options
 *   - Readiness aggregation (12 checks across the store)
 *
 * Originally extracted from `apps/api/src/routes/settings.ts` as
 * part of Quality Pass 5, Route Migration 9/24.
 *
 * Important: this service is for STORE SETTINGS only. It does
 * NOT include publish/acknowledge logic (those are owned by
 * PublishGateService + AcknowledgementService in
 * @haa/commerce-core) and does NOT include payment/KYC logic
 * (owned by KycService + payment-providers).
 *
 * The route is now pure transport. The service returns the
 * same shapes the route used to return, including all
 * defaults (e.g. productFeatures, giftOptions) — so the route
 * response stays byte-identical for the success cases.
 */

const DEFAULT_PRODUCT_FEATURES = {
  imageLightbox: true, stickyCart: true, trustBadges: true, reviews: true,
  shareButton: true, deliveryEstimate: true, sizeGuide: true, alsoBought: true,
  recentlyViewed: true, priceAlert: true, giftWrap: true, sendAsGift: true, pickup: true, stockBar: true,
  liveViewers: true, compareBadges: true,
  badgeMaroof: false, badgeSaudiBusinessCenter: false, badgeSaudiMade: false,
} as const;

const THEME_HISTORY_LIMIT = 5;

const _STORE_SETTINGS_COLUMNS = [
  'welcomeMessage', 'welcomeMessageEnabled', 'preparationTime', 'preparationTimeEnabled',
  'minOrderAmount', 'minOrderEnabled', 'productFeatures', 'themeConfig',
  'giftWrapDefaultPrice', 'giftMessageMaxLength', 'giftWrapInstructions', 'pickupInstructions',
] as const;

export type StoreSettingsColumns = (typeof _STORE_SETTINGS_COLUMNS)[number];

function pickStoreSettingsColumns(settings: any) {
  return {
    welcomeMessage: settings?.welcomeMessage ?? null,
    welcomeMessageEnabled: settings?.welcomeMessageEnabled ?? false,
    preparationTime: settings?.preparationTime ?? 0,
    preparationTimeEnabled: settings?.preparationTimeEnabled ?? false,
    minOrderAmount: settings?.minOrderAmount ?? '0',
    minOrderEnabled: settings?.minOrderEnabled ?? false,
  };
}

export class StoreSettingsService {
  constructor(private db: DbClient = createDbClient()) {}

  // ── Store metadata ───────────────────────────────────────

  async getStore(storeId: number) {
    const [store] = await this.db
      .select()
      .from(s.stores)
      .where(and(eq(s.stores.id, storeId), eq(s.stores.isActive, true)))
      .limit(1);
    return store ?? null;
  }

  async updateStore(storeId: number, body: Record<string, unknown>) {
    const cleanBody: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) cleanBody[key] = value;
    }
    const [updated] = await this.db
      .update(s.stores)
      .set(cleanBody)
      .where(eq(s.stores.id, storeId))
      .returning();
    // Keep themeConfig.colors.primary in sync with stores.primaryColor
    if (body.primaryColor !== undefined) {
      await this.syncPrimaryColorToThemeConfig(storeId, body.primaryColor as string);
    }
    return updated ?? null;
  }

  // ── Store config (welcome + min order + address) ────────

  async getStoreConfig(storeId: number) {
    const [store] = await this.db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
    const [settings] = await this.db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
    return {
      ...pickStoreSettingsColumns(settings),
      city: store?.city ?? null,
      district: store?.district ?? null,
      street: store?.street ?? null,
      postalCode: store?.postalCode ?? null,
      latitude: store?.latitude ?? null,
      longitude: store?.longitude ?? null,
    };
  }

  async updateStoreConfig(storeId: number, body: Record<string, unknown>) {
    const settingsUpdate: Record<string, unknown> = { updatedAt: new Date() };
    const storeUpdate: Record<string, unknown> = {};

    if (body.welcomeMessage !== undefined) settingsUpdate.welcomeMessage = body.welcomeMessage;
    if (body.welcomeMessageEnabled !== undefined) settingsUpdate.welcomeMessageEnabled = body.welcomeMessageEnabled;
    if (body.preparationTime !== undefined) settingsUpdate.preparationTime = body.preparationTime;
    if (body.preparationTimeEnabled !== undefined) settingsUpdate.preparationTimeEnabled = body.preparationTimeEnabled;
    if (body.minOrderAmount !== undefined && body.minOrderAmount !== null) settingsUpdate.minOrderAmount = (body.minOrderAmount as number).toString();
    if (body.minOrderEnabled !== undefined) settingsUpdate.minOrderEnabled = body.minOrderEnabled;
    if (body.city !== undefined) storeUpdate.city = body.city;
    if (body.district !== undefined) storeUpdate.district = body.district;
    if (body.street !== undefined) storeUpdate.street = body.street;
    if (body.postalCode !== undefined) storeUpdate.postalCode = body.postalCode;
    if (body.latitude !== undefined) storeUpdate.latitude = body.latitude?.toString() ?? null;
    if (body.longitude !== undefined) storeUpdate.longitude = body.longitude?.toString() ?? null;

    if (Object.keys(settingsUpdate).length > 1) {
      await this.upsertStoreSettings(storeId, settingsUpdate);
    }
    if (Object.keys(storeUpdate).length > 0) {
      storeUpdate.updatedAt = new Date();
      await this.db.update(s.stores).set(storeUpdate).where(eq(s.stores.id, storeId));
    }

    return this.getStoreConfig(storeId);
  }

  // ── Size guides ──────────────────────────────────────────

  async listSizeGuides(storeId: number) {
    return this.db
      .select()
      .from(s.sizeGuides)
      .where(eq(s.sizeGuides.storeId, storeId))
      .orderBy(desc(s.sizeGuides.updatedAt));
  }

  async createSizeGuide(storeId: number, body: Record<string, unknown>) {
    const [guide] = await this.db
      .insert(s.sizeGuides)
      .values({ storeId, ...body } as any)
      .returning();
    return guide;
  }

  async updateSizeGuide(storeId: number, guideId: number, body: Record<string, unknown>) {
    const [guide] = await this.db
      .update(s.sizeGuides)
      .set({ ...body, updatedAt: new Date() } as any)
      .where(and(eq(s.sizeGuides.id, guideId), eq(s.sizeGuides.storeId, storeId)))
      .returning();
    return guide ?? null;
  }

  async deleteSizeGuide(storeId: number, guideId: number) {
    const [deleted] = await this.db
      .delete(s.sizeGuides)
      .where(and(eq(s.sizeGuides.id, guideId), eq(s.sizeGuides.storeId, storeId)))
      .returning({ id: s.sizeGuides.id });
    return deleted ?? null;
  }

  // ── Readiness aggregation ────────────────────────────────

  async getReadiness(storeId: number) {
    const [store] = await this.db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);

    const [categoriesCount] = await this.db
      .select({ total: count() })
      .from(s.categories)
      .where(eq(s.categories.storeId, storeId));
    const [activeProductsCount] = await this.db
      .select({ total: count() })
      .from(s.products)
      .where(and(eq(s.products.storeId, storeId), eq(s.products.status, 'active')));
    const productsWithImages = await this.db
      .select({ productId: s.productImages.productId })
      .from(s.productImages)
      .innerJoin(s.products, eq(s.productImages.productId, s.products.id))
      .where(eq(s.products.storeId, storeId))
      .limit(1);
    const [activeMethodsCount] = await this.db
      .select({ total: count() })
      .from(s.shippingMethods)
      .where(and(eq(s.shippingMethods.storeId, storeId), eq(s.shippingMethods.isActive, true)));
    const [zonesCount] = await this.db
      .select({ total: count() })
      .from(s.shippingZones)
      .where(eq(s.shippingZones.storeId, storeId));
    const [ratesCount] = await this.db
      .select({ total: count() })
      .from(s.shippingRates)
      .innerJoin(s.shippingMethods, eq(s.shippingRates.shippingMethodId, s.shippingMethods.id))
      .where(eq(s.shippingMethods.storeId, storeId));
    const [ordersCount] = await this.db
      .select({ total: count() })
      .from(s.orders)
      .where(eq(s.orders.storeId, storeId));

    const items = [
      { key: 'store_name', label: 'settings.storeReadiness.storeName', completed: !!(store?.name && store.name.length > 0), actionLabel: 'settings.storeReadiness.actionSettings', actionHref: '/settings' },
      { key: 'store_description', label: 'settings.storeReadiness.storeDescription', completed: !!(store?.description && store.description.length > 0), actionLabel: 'settings.storeReadiness.actionSettings', actionHref: '/settings' },
      { key: 'store_logo', label: 'settings.storeReadiness.storeLogo', completed: !!(store?.logoUrl && store.logoUrl.length > 0), actionLabel: 'settings.storeReadiness.actionSettings', actionHref: '/settings' },
      { key: 'store_color', label: 'settings.storeReadiness.storeColor', completed: !!(store?.primaryColor && store.primaryColor.length > 0), actionLabel: 'settings.storeReadiness.actionSettings', actionHref: '/settings' },
      { key: 'store_contact', label: 'settings.storeReadiness.storeContact', completed: !!((store?.phone && store.phone.length > 0) || (store?.email && store.email.length > 0)), actionLabel: 'settings.storeReadiness.actionSettings', actionHref: '/settings' },
      { key: 'has_category', label: 'settings.storeReadiness.hasCategory', completed: Number(categoriesCount?.total ?? 0) >= 1, actionLabel: 'settings.storeReadiness.actionCategories', actionHref: '/categories' },
      { key: 'has_active_product', label: 'settings.storeReadiness.hasActiveProduct', completed: Number(activeProductsCount?.total ?? 0) >= 1, actionLabel: 'settings.storeReadiness.actionProducts', actionHref: '/products' },
      { key: 'has_product_image', label: 'settings.storeReadiness.hasProductImage', completed: productsWithImages.length > 0, actionLabel: 'settings.storeReadiness.actionProducts', actionHref: '/products' },
      { key: 'has_shipping_method', label: 'settings.storeReadiness.hasShippingMethod', completed: Number(activeMethodsCount?.total ?? 0) >= 1, actionLabel: 'settings.storeReadiness.actionShipping', actionHref: '/shipping' },
      { key: 'has_shipping_zone', label: 'settings.storeReadiness.hasShippingZone', completed: Number(zonesCount?.total ?? 0) >= 1, actionLabel: 'settings.storeReadiness.actionShipping', actionHref: '/shipping' },
      { key: 'has_shipping_rate', label: 'settings.storeReadiness.hasShippingRate', completed: Number(ratesCount?.total ?? 0) >= 1, actionLabel: 'settings.storeReadiness.actionShipping', actionHref: '/shipping' },
      { key: 'has_order', label: 'settings.storeReadiness.hasOrder', completed: Number(ordersCount?.total ?? 0) >= 1, actionLabel: 'settings.storeReadiness.actionStorefront', actionHref: '#' },
    ];

    const completedCount = items.filter((i) => i.completed).length;
    const totalCount = items.length;
    const percentage = Math.round((completedCount / totalCount) * 100);

    return { percentage, completedCount, totalCount, items };
  }

  // ── Product features ─────────────────────────────────────

  async getProductFeatures(storeId: number) {
    const [settings] = await this.db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
    return (settings?.productFeatures as any) ?? DEFAULT_PRODUCT_FEATURES;
  }

  /**
   * Update product features. Returns:
   *   - { kind: 'pickup_no_location' } if the caller is enabling
   *     `pickup` but no active pickup location exists for the
   *     store. The route maps this to 400.
   *   - { kind: 'ok', features: ... } on success.
   */
  async updateProductFeatures(
    storeId: number,
    body: Record<string, unknown>,
  ): Promise<{ kind: 'pickup_no_location'; message: string } | { kind: 'ok'; features: any }> {
    if (body.pickup === true) {
      const [activeLocation] = await this.db
        .select({ id: s.pickupLocations.id })
        .from(s.pickupLocations)
        .where(and(eq(s.pickupLocations.storeId, storeId), eq(s.pickupLocations.isActive, true)))
        .limit(1);
      if (!activeLocation) {
        return {
          kind: 'pickup_no_location',
          message: 'لا يمكن تفعيل الاستلام من الفرع قبل إضافة فرع نشط واحد على الأقل',
        };
      }
    }

    const [existing] = await this.db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
    const current = (existing?.productFeatures as any) ?? DEFAULT_PRODUCT_FEATURES;
    const updated = { ...current, ...body };

    await this.upsertStoreSettings(storeId, { productFeatures: updated });
    return { kind: 'ok', features: updated };
  }

  // ── Theme ────────────────────────────────────────────────

  async getTheme(storeId: number) {
    const [settings] = await this.db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
    const config = resolveActiveThemeConfig(settings?.themeConfig as any);
    // Resolve primary from stores.primaryColor — themeConfig.colors.primary is legacy
    const [store] = await this.db
      .select({ primaryColor: s.stores.primaryColor })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    config.colors.primary = resolveStoreThemePrimaryColor(
      store?.primaryColor,
      config.colors?.primary,
    );
    return config;
  }

  async updateTheme(storeId: number, body: Record<string, unknown>): Promise<{ config: any; history: any[] }> {
    // Normalise any incoming theme primaryColor to stores.primaryColor
    const themePrimary = (body as any)?.colors?.primary as string | undefined;
    if (themePrimary !== undefined) {
      await this.db
        .update(s.stores)
        .set({ primaryColor: themePrimary, updatedAt: new Date() })
        .where(eq(s.stores.id, storeId));
    }

    const [existing] = await this.db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
    const existingConfig = (existing?.themeConfig as any) ?? null;
    const current = resolveActiveThemeConfig(existing?.themeConfig as any);
    const history = ((existingConfig as any)?._history ?? []) as any[];
    const snapshot = { ...current };
    delete (snapshot as any)._history;
    history.unshift({
      config: snapshot,
      appliedAt: new Date().toISOString(),
      preset: current.preset,
      themeKey: current.themeKey,
    });
    const trimmed = history.slice(0, THEME_HISTORY_LIMIT);
    const updated = { ...mergeAndResolveThemeConfig(current, body as any), _history: trimmed };

    await this.upsertStoreSettings(storeId, { themeConfig: updated });
    const { _history, ...clean } = updated;

    // Resolve primary from stores.primaryColor for the response
    const [store] = await this.db
      .select({ primaryColor: s.stores.primaryColor })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    clean.colors = {
      ...(clean.colors ?? {}),
      primary: resolveStoreThemePrimaryColor(store?.primaryColor, clean.colors?.primary),
    };

    return { config: clean, history: trimmed };
  }

  async getThemeHistory(storeId: number) {
    const [settings] = await this.db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
    return ((settings?.themeConfig as any)?._history ?? []) as any[];
  }

  // ── Gift options ─────────────────────────────────────────

  async getGiftOptions(storeId: number) {
    const [settings] = await this.db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
    return {
      giftWrapDefaultPrice: settings?.giftWrapDefaultPrice ?? '0',
      giftMessageMaxLength: settings?.giftMessageMaxLength ?? 250,
      giftWrapInstructions: settings?.giftWrapInstructions ?? null,
      pickupInstructions: settings?.pickupInstructions ?? null,
    };
  }

  async updateGiftOptions(storeId: number, body: Record<string, unknown>) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.giftWrapDefaultPrice !== undefined && body.giftWrapDefaultPrice !== null) updateData.giftWrapDefaultPrice = (body.giftWrapDefaultPrice as number).toString();
    if (body.giftMessageMaxLength !== undefined) updateData.giftMessageMaxLength = body.giftMessageMaxLength;
    if (body.giftWrapInstructions !== undefined) updateData.giftWrapInstructions = body.giftWrapInstructions;
    if (body.pickupInstructions !== undefined) updateData.pickupInstructions = body.pickupInstructions;
    await this.upsertStoreSettings(storeId, updateData);
    return this.getGiftOptions(storeId);
  }

  // ── Pickup locations ─────────────────────────────────────

  async listPickupLocations(storeId: number) {
    return this.db
      .select()
      .from(s.pickupLocations)
      .where(eq(s.pickupLocations.storeId, storeId))
      .orderBy(s.pickupLocations.createdAt);
  }

  async createPickupLocation(storeId: number, body: Record<string, unknown>) {
    const [location] = await this.db
      .insert(s.pickupLocations)
      .values({ storeId, ...body } as any)
      .returning();
    return location;
  }

  async updatePickupLocation(storeId: number, id: number, body: Record<string, unknown>) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) updateData[key] = value;
    }
    const [updated] = await this.db
      .update(s.pickupLocations)
      .set(updateData as any)
      .where(and(eq(s.pickupLocations.id, id), eq(s.pickupLocations.storeId, storeId)))
      .returning();
    return updated ?? null;
  }

  async deletePickupLocation(storeId: number, id: number) {
    const [deleted] = await this.db
      .delete(s.pickupLocations)
      .where(and(eq(s.pickupLocations.id, id), eq(s.pickupLocations.storeId, storeId)))
      .returning();
    return deleted ?? null;
  }

  // ── Private helpers ──────────────────────────────────────

  /**
   * Sync stores.primaryColor into storeSettings.themeConfig.colors.primary
   * so the legacy field stays in lockstep with the single source of truth.
   */
  private async syncPrimaryColorToThemeConfig(storeId: number, primaryColor: string) {
    const [existing] = await this.db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
    const themeConfig = (existing?.themeConfig as any) ?? {};
    themeConfig.colors = { ...(themeConfig.colors ?? {}), primary: primaryColor };
    await this.upsertStoreSettings(storeId, { themeConfig });
  }

  /**
   * Upsert helper for storeSettings. Reads the row first, then
   * either updates or inserts based on existence. This is the
   * exact pattern the route used (separate select + update/insert).
   * Could be replaced with an upsert helper in a future cleanup.
   */
  private async upsertStoreSettings(storeId: number, data: Record<string, unknown>) {
    const [existing] = await this.db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
    if (existing) {
      await this.db
        .update(s.storeSettings)
        .set(data as any)
        .where(eq(s.storeSettings.storeId, storeId));
    } else {
      await this.db
        .insert(s.storeSettings)
        .values({ storeId, ...data } as any);
    }
  }
}

/** Shared default instance for ad-hoc callers (most code uses DI). */
export const storeSettingsService = new StoreSettingsService();
