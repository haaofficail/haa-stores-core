import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and, count, desc } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { getPaymentProviderStatus, KycService, PublishGateService, AcknowledgementService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';
import { mergeAndResolveThemeConfig, resolveActiveThemeConfig } from '@haa/theme-system/server';

const settingsRouter = new Hono();

settingsRouter.use('*', requireAuth(), requireStoreAccess());

function getStoreSettingsColumns(settings: any) {
  return {
    welcomeMessage: settings?.welcomeMessage ?? null,
    welcomeMessageEnabled: settings?.welcomeMessageEnabled ?? false,
    preparationTime: settings?.preparationTime ?? 0,
    preparationTimeEnabled: settings?.preparationTimeEnabled ?? false,
    minOrderAmount: settings?.minOrderAmount ?? '0',
    minOrderEnabled: settings?.minOrderEnabled ?? false,
  };
}

const sizeGuideRowSchema = z.record(z.string().min(1).max(60), z.string().max(120));
const sizeGuideSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['clothing', 'shoes', 'custom']).default('clothing'),
  unit: z.enum(['cm', 'in', 'eu', 'uk', 'us']).default('cm'),
  rows: z.array(sizeGuideRowSchema).min(1).max(100),
  categoryIds: z.array(z.coerce.number().int().positive()).default([]),
  productIds: z.array(z.coerce.number().int().positive()).default([]),
  isActive: z.boolean().default(true),
});

const updateStoreSchema = z.object({
  name: z.string().min(1, 'Name required').max(255).optional(),
  slug: z.string().min(1, 'Slug required').max(100).regex(/^[a-z0-9-]+$/, 'Invalid slug').optional(),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().max(500).optional(),
  primaryColor: z.string().max(20).optional(),
  email: z.string().email().max(255).or(z.literal('')).optional(),
  phone: z.string().max(20).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  isActive: z.boolean().optional(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
});

settingsRouter.get('/', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const [store] = await db.select().from(s.stores)
    .where(and(eq(s.stores.id, storeId), eq(s.stores.isActive, true)))
    .limit(1);
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
  const { tenantId, ...rest } = store;
  return c.json({ success: true, data: rest });
});

settingsRouter.put('/', requirePermission('settings:update'), zValidator('json', updateStoreSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const db = createDbClient();

  const cleanBody: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) cleanBody[key] = value;
  }

  const [updated] = await db.update(s.stores).set(cleanBody)
    .where(eq(s.stores.id, storeId)).returning();
  if (!updated) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
  const { tenantId, ...rest } = updated;
  return c.json({ success: true, data: rest });
});

settingsRouter.get('/store-config', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const [store] = await db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
  const [settings] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
  return c.json({
    success: true,
    data: {
      ...getStoreSettingsColumns(settings),
      city: store?.city ?? null,
      district: store?.district ?? null,
      street: store?.street ?? null,
      postalCode: store?.postalCode ?? null,
      latitude: store?.latitude ?? null,
      longitude: store?.longitude ?? null,
    },
  });
});

settingsRouter.put('/store-config', requirePermission('settings:update'), zValidator('json', z.object({
  welcomeMessage: z.string().max(500).optional().nullable(),
  welcomeMessageEnabled: z.boolean().optional(),
  preparationTime: z.coerce.number().int().min(0).max(365).optional(),
  preparationTimeEnabled: z.boolean().optional(),
  minOrderAmount: z.coerce.number().min(0).optional(),
  minOrderEnabled: z.boolean().optional(),
  city: z.string().max(100).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  street: z.string().max(255).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const db = createDbClient();

  const settingsUpdate: Record<string, unknown> = { updatedAt: new Date() };
  const storeUpdate: Record<string, unknown> = {};

  if (body.welcomeMessage !== undefined) settingsUpdate.welcomeMessage = body.welcomeMessage;
  if (body.welcomeMessageEnabled !== undefined) settingsUpdate.welcomeMessageEnabled = body.welcomeMessageEnabled;
  if (body.preparationTime !== undefined) settingsUpdate.preparationTime = body.preparationTime;
  if (body.preparationTimeEnabled !== undefined) settingsUpdate.preparationTimeEnabled = body.preparationTimeEnabled;
  if (body.minOrderAmount !== undefined) settingsUpdate.minOrderAmount = body.minOrderAmount.toString();
  if (body.minOrderEnabled !== undefined) settingsUpdate.minOrderEnabled = body.minOrderEnabled;
  if (body.city !== undefined) storeUpdate.city = body.city;
  if (body.district !== undefined) storeUpdate.district = body.district;
  if (body.street !== undefined) storeUpdate.street = body.street;
  if (body.postalCode !== undefined) storeUpdate.postalCode = body.postalCode;
  if (body.latitude !== undefined) storeUpdate.latitude = body.latitude?.toString() ?? null;
  if (body.longitude !== undefined) storeUpdate.longitude = body.longitude?.toString() ?? null;

  if (Object.keys(settingsUpdate).length > 1) {
    const [existing] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
    if (existing) {
      await db.update(s.storeSettings).set(settingsUpdate).where(eq(s.storeSettings.storeId, storeId));
    } else {
      await db.insert(s.storeSettings).values({ storeId, ...settingsUpdate as any });
    }
  }

  if (Object.keys(storeUpdate).length > 0) {
    storeUpdate.updatedAt = new Date();
    await db.update(s.stores).set(storeUpdate).where(eq(s.stores.id, storeId));
  }

  const [updatedStore] = await db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
  const [updatedSettings] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
  return c.json({
    success: true,
    data: {
      ...getStoreSettingsColumns(updatedSettings),
      city: updatedStore?.city ?? null,
      district: updatedStore?.district ?? null,
      street: updatedStore?.street ?? null,
      postalCode: updatedStore?.postalCode ?? null,
      latitude: updatedStore?.latitude ?? null,
      longitude: updatedStore?.longitude ?? null,
    },
  });
});

settingsRouter.get('/size-guides', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const guides = await db.select()
    .from(s.sizeGuides)
    .where(eq(s.sizeGuides.storeId, storeId))
    .orderBy(desc(s.sizeGuides.updatedAt));
  return c.json({ success: true, data: guides });
});

settingsRouter.post('/size-guides', requirePermission('settings:update'), zValidator('json', sizeGuideSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const db = createDbClient();
  const [guide] = await db.insert(s.sizeGuides).values({
    storeId,
    name: body.name,
    type: body.type,
    unit: body.unit,
    rows: body.rows,
    categoryIds: body.categoryIds,
    productIds: body.productIds,
    isActive: body.isActive,
  }).returning();
  return c.json({ success: true, data: guide }, 201);
});

settingsRouter.put('/size-guides/:guideId', requirePermission('settings:update'), zValidator('json', sizeGuideSchema.partial()), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const guideId = Number(c.req.param('guideId'));
  const body = c.req.valid('json');
  const db = createDbClient();
  const [guide] = await db.update(s.sizeGuides).set({
    ...body,
    updatedAt: new Date(),
  }).where(and(eq(s.sizeGuides.id, guideId), eq(s.sizeGuides.storeId, storeId))).returning();
  if (!guide) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Size guide not found' } }, 404);
  return c.json({ success: true, data: guide });
});

settingsRouter.delete('/size-guides/:guideId', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const guideId = Number(c.req.param('guideId'));
  const db = createDbClient();
  const [deleted] = await db.delete(s.sizeGuides)
    .where(and(eq(s.sizeGuides.id, guideId), eq(s.sizeGuides.storeId, storeId)))
    .returning({ id: s.sizeGuides.id });
  if (!deleted) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Size guide not found' } }, 404);
  return c.json({ success: true, data: deleted });
});

settingsRouter.get('/readiness', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();

  const [store] = await db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);

  const [categoriesCount] = await db.select({ total: count() }).from(s.categories)
    .where(eq(s.categories.storeId, storeId));
  const [activeProductsCount] = await db.select({ total: count() }).from(s.products)
    .where(and(eq(s.products.storeId, storeId), eq(s.products.status, 'active')));

  const productsWithImages = await db.select({ productId: s.productImages.productId })
    .from(s.productImages)
    .innerJoin(s.products, eq(s.productImages.productId, s.products.id))
    .where(eq(s.products.storeId, storeId))
    .limit(1);

  const [activeMethodsCount] = await db.select({ total: count() }).from(s.shippingMethods)
    .where(and(eq(s.shippingMethods.storeId, storeId), eq(s.shippingMethods.isActive, true)));
  const [zonesCount] = await db.select({ total: count() }).from(s.shippingZones)
    .where(eq(s.shippingZones.storeId, storeId));
  const [ratesCount] = await db.select({ total: count() }).from(s.shippingRates)
    .innerJoin(s.shippingMethods, eq(s.shippingRates.shippingMethodId, s.shippingMethods.id))
    .where(eq(s.shippingMethods.storeId, storeId));

  const [ordersCount] = await db.select({ total: count() }).from(s.orders)
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

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return c.json({
    success: true,
    data: { percentage, completedCount, totalCount, items },
  });
});

settingsRouter.get('/payment-status', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = getPaymentProviderStatus();
  const kycStatus = await new KycService().getStatus(storeId);
  const kycRequiredForLive = !new KycService().isKycApproved(kycStatus.status);
  return c.json({ success: true, data: { ...status, kycRequiredForLive } });
});

const defaultFeatures = {
  imageLightbox: true, stickyCart: true, trustBadges: true, reviews: true,
  shareButton: true, deliveryEstimate: true, sizeGuide: true, alsoBought: true,
  recentlyViewed: true, priceAlert: true, giftWrap: true, sendAsGift: true, pickup: true, stockBar: true,
  liveViewers: true, compareBadges: true,
  badgeMaroof: false, badgeSaudiBusinessCenter: false, badgeSaudiMade: false,
};

settingsRouter.get('/product-features', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const [settings] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
  return c.json({ success: true, data: (settings?.productFeatures as any) ?? defaultFeatures });
});

settingsRouter.put('/product-features', requirePermission('settings:update'), zValidator('json', z.object({
  imageLightbox: z.boolean().optional(), stickyCart: z.boolean().optional(),
  trustBadges: z.boolean().optional(), reviews: z.boolean().optional(),
  shareButton: z.boolean().optional(), deliveryEstimate: z.boolean().optional(),
  sizeGuide: z.boolean().optional(), alsoBought: z.boolean().optional(),
  recentlyViewed: z.boolean().optional(), priceAlert: z.boolean().optional(),
  giftWrap: z.boolean().optional(), sendAsGift: z.boolean().optional(), pickup: z.boolean().optional(),
  stockBar: z.boolean().optional(),
  liveViewers: z.boolean().optional(), compareBadges: z.boolean().optional(),
  badgeMaroof: z.boolean().optional(),
  badgeSaudiBusinessCenter: z.boolean().optional(),
  badgeSaudiMade: z.boolean().optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const db = createDbClient();

  // Prevent enabling pickup without at least one active pickup location
  if (body.pickup === true) {
    const [activeLocation] = await db.select({ id: s.pickupLocations.id }).from(s.pickupLocations)
      .where(and(eq(s.pickupLocations.storeId, storeId), eq(s.pickupLocations.isActive, true))).limit(1);
    if (!activeLocation) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'لا يمكن تفعيل الاستلام من الفرع قبل إضافة فرع نشط واحد على الأقل' } }, 400);
    }
  }

  const [existing] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
  const current = (existing?.productFeatures as any) ?? defaultFeatures;
  const updated = { ...current, ...body };
  if (existing) {
    await db.update(s.storeSettings).set({ productFeatures: updated as any, updatedAt: new Date() }).where(eq(s.storeSettings.storeId, storeId));
  } else {
    await db.insert(s.storeSettings).values({ storeId, productFeatures: updated as any });
  }
  return c.json({ success: true, data: updated });
});

settingsRouter.get('/theme', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const [settings] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
  return c.json({ success: true, data: resolveActiveThemeConfig(settings?.themeConfig as any) });
});

settingsRouter.put('/theme', requirePermission('settings:update'), zValidator('json', z.object({
  preset: z.string().optional(),
  themeKey: z.string().optional(),
  colors: z.object({
    primary: z.string().optional(), surface1: z.string().optional(), surface2: z.string().optional(), surface3: z.string().optional(),
    textPrimary: z.string().optional(), textSecondary: z.string().optional(), textTertiary: z.string().optional(),
    border: z.string().optional(), borderHover: z.string().optional(), success: z.string().optional(), warning: z.string().optional(), error: z.string().optional(),
    headerBackground: z.string().optional(), headerText: z.string().optional(),
    announcementBackground: z.string().optional(), announcementText: z.string().optional(),
  }).optional(),
  font: z.object({
    family: z.string().optional(), url: z.string().optional(), headingsSize: z.string().optional(), bodySize: z.string().optional(),
  }).optional(),
  layout: z.object({
    productCardColumns: z.number().optional(), productCardStyle: z.string().optional(), imageAspectRatio: z.string().optional(),
    showRating: z.boolean().optional(), showSalesCount: z.boolean().optional(), showStockBadge: z.boolean().optional(),
    showCategory: z.boolean().optional(), showDiscountBadge: z.boolean().optional(), showCountdown: z.boolean().optional(),
    categoryCardSize: z.number().min(1).max(5).optional(),
  }).optional(),
  homepage: z.object({
    showBanner: z.boolean().optional(), showCategories: z.boolean().optional(), showBestSellers: z.boolean().optional(),
    showNewArrivals: z.boolean().optional(), showTodayDeals: z.boolean().optional(), showTrustBadges: z.boolean().optional(),
    showMarketingBanner: z.boolean().optional(), showFeaturedProducts: z.boolean().optional(),
    sectionOrder: z.array(z.string()).optional(),
    sections: z.array(z.object({
      id: z.string(),
      type: z.string(),
      enabled: z.boolean().optional(),
      title: z.string().optional(),
      settings: z.record(z.string(), z.any()).optional(),
    })).optional(),
  }).optional(),
  header: z.object({
    showAnnouncementBar: z.boolean().optional(), announcementText: z.string().optional(), stickyHeader: z.boolean().optional(),
    showSearch: z.boolean().optional(), showCart: z.boolean().optional(), showAccount: z.boolean().optional(),
  }).optional(),
  footer: z.object({
    showPaymentLogos: z.boolean().optional(), showSocialLinks: z.boolean().optional(), showNewsletter: z.boolean().optional(),
    companyDescription: z.string().optional(),
  }).optional(),
  socialLinks: z.object({
    instagram: z.string().optional(), twitter: z.string().optional(), tiktok: z.string().optional(),
    snapchat: z.string().optional(), whatsapp: z.string().optional(),
  }).optional(),
  customCss: z.string().optional().transform((val) => {
    if (!val) return val;
    const dangerous = /<script[\s>]|javascript\s*:|on\w+\s*[=:]|expression\s*\(|@import\s+|behavior\s*:|-moz-binding\s*:/i;
    if (dangerous.test(val)) {
      throw new Error('CSS المخصص يحتوي على أكواد غير آمنة');
    }
    return val;
  }),
  analytics: z.object({
    googleTagManagerId: z.string().optional(), googleAnalyticsId: z.string().optional(), facebookPixelId: z.string().optional(),
  }).optional(),
  trustBadges: z.object({
    businessPlatform: z.object({ enabled: z.boolean().optional(), verificationNumber: z.string().optional(), verificationUrl: z.string().optional(), acceptedTerms: z.boolean().optional() }).optional(),
    commercialRegistration: z.object({ enabled: z.boolean().optional(), crNumber: z.string().optional(), verificationUrl: z.string().optional(), acceptedTerms: z.boolean().optional() }).optional(),
    unifiedQr: z.object({ enabled: z.boolean().optional(), qrImageUrl: z.string().optional(), qrTargetUrl: z.string().optional(), acceptedTerms: z.boolean().optional() }).optional(),
    maroof: z.object({ enabled: z.boolean().optional(), maroofNumber: z.string().optional(), verificationUrl: z.string().optional(), acceptedTerms: z.boolean().optional(), legacy: z.literal(true).optional() }).optional(),
    saudiMade: z.object({ enabled: z.boolean().optional(), membershipNumber: z.string().optional(), verificationUrl: z.string().optional(), acceptedTerms: z.boolean().optional(), officialAssetUrl: z.string().optional(), memberConfirmed: z.boolean().optional() }).optional(),
    vat: z.object({ enabled: z.boolean().optional(), vatNumber: z.string().optional(), verificationUrl: z.string().optional(), acceptedTerms: z.boolean().optional() }).optional(),
  }).optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const db = createDbClient();
  const [existing] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
  const existingConfig = (existing?.themeConfig as any) ?? null;
  const current = resolveActiveThemeConfig(existing?.themeConfig as any);
  const history = ((existingConfig as any)?._history ?? []) as any[];
  const snapshot = { ...current };
  delete (snapshot as any)._history;
  history.unshift({ config: snapshot, appliedAt: new Date().toISOString(), preset: current.preset, themeKey: current.themeKey });
  const trimmed = history.slice(0, 5);
  const updated = { ...mergeAndResolveThemeConfig(current, body as any), _history: trimmed };
  if (existing) {
    await db.update(s.storeSettings).set({ themeConfig: updated as any, updatedAt: new Date() }).where(eq(s.storeSettings.storeId, storeId));
  } else {
    await db.insert(s.storeSettings).values({ storeId, themeConfig: updated as any });
  }
  const { _history, ...clean } = updated;
  return c.json({ success: true, data: clean, history: trimmed });
});

settingsRouter.get('/theme/history', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const [settings] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
  const history = ((settings?.themeConfig as any)?._history ?? []) as any[];
  return c.json({ success: true, data: history });
});

// Gift Options
settingsRouter.get('/gift-options', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const [settings] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
  return c.json({
    success: true,
    data: {
      giftWrapDefaultPrice: settings?.giftWrapDefaultPrice ?? '0',
      giftMessageMaxLength: settings?.giftMessageMaxLength ?? 250,
      giftWrapInstructions: settings?.giftWrapInstructions ?? null,
      pickupInstructions: settings?.pickupInstructions ?? null,
    },
  });
});

settingsRouter.put('/gift-options', requirePermission('settings:update'), zValidator('json', z.object({
  giftWrapDefaultPrice: z.coerce.number().min(0).optional(),
  giftMessageMaxLength: z.coerce.number().int().min(1).max(1000).optional(),
  giftWrapInstructions: z.string().max(500).optional().nullable(),
  pickupInstructions: z.string().max(500).optional().nullable(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const db = createDbClient();
  const [existing] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.giftWrapDefaultPrice !== undefined) updateData.giftWrapDefaultPrice = body.giftWrapDefaultPrice.toString();
  if (body.giftMessageMaxLength !== undefined) updateData.giftMessageMaxLength = body.giftMessageMaxLength;
  if (body.giftWrapInstructions !== undefined) updateData.giftWrapInstructions = body.giftWrapInstructions;
  if (body.pickupInstructions !== undefined) updateData.pickupInstructions = body.pickupInstructions;
  if (existing) {
    await db.update(s.storeSettings).set(updateData).where(eq(s.storeSettings.storeId, storeId));
  } else {
    await db.insert(s.storeSettings).values({ storeId, ...updateData as any });
  }
  const [updated] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
  return c.json({
    success: true,
    data: {
      giftWrapDefaultPrice: updated?.giftWrapDefaultPrice ?? '0',
      giftMessageMaxLength: updated?.giftMessageMaxLength ?? 250,
      giftWrapInstructions: updated?.giftWrapInstructions ?? null,
      pickupInstructions: updated?.pickupInstructions ?? null,
    },
  });
});

// Pickup Locations
const pickupLocationSchema = z.object({
  nameAr: z.string().min(1).max(255),
  nameEn: z.string().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  mapsUrl: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  hours: z.record(z.string()).optional().nullable(),
  instructions: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

settingsRouter.get('/pickup-locations', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const locations = await db.select().from(s.pickupLocations)
    .where(eq(s.pickupLocations.storeId, storeId))
    .orderBy(s.pickupLocations.createdAt);
  return c.json({ success: true, data: locations });
});

settingsRouter.post('/pickup-locations', requirePermission('settings:update'), zValidator('json', pickupLocationSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const db = createDbClient();
  const [location] = await db.insert(s.pickupLocations).values({
    storeId,
    nameAr: body.nameAr,
    nameEn: body.nameEn ?? null,
    address: body.address ?? null,
    mapsUrl: body.mapsUrl ?? null,
    phone: body.phone ?? null,
    hours: (body.hours ?? null) as any,
    instructions: body.instructions ?? null,
    isActive: body.isActive ?? true,
  }).returning();
  return c.json({ success: true, data: location }, 201);
});

settingsRouter.put('/pickup-locations/:id', requirePermission('settings:update'), zValidator('json', pickupLocationSchema.partial()), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const db = createDbClient();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.nameAr !== undefined) updateData.nameAr = body.nameAr;
  if (body.nameEn !== undefined) updateData.nameEn = body.nameEn;
  if (body.address !== undefined) updateData.address = body.address;
  if (body.mapsUrl !== undefined) updateData.mapsUrl = body.mapsUrl;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.hours !== undefined) updateData.hours = body.hours;
  if (body.instructions !== undefined) updateData.instructions = body.instructions;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  const [updated] = await db.update(s.pickupLocations).set(updateData)
    .where(and(eq(s.pickupLocations.id, id), eq(s.pickupLocations.storeId, storeId)))
    .returning();
  if (!updated) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } }, 404);
  return c.json({ success: true, data: updated });
});

settingsRouter.delete('/pickup-locations/:id', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const db = createDbClient();
  const [deleted] = await db.delete(s.pickupLocations)
    .where(and(eq(s.pickupLocations.id, id), eq(s.pickupLocations.storeId, storeId)))
    .returning();
  if (!deleted) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } }, 404);
  return c.json({ success: true, data: deleted });
});

settingsRouter.post('/publish', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const tenantId = getAuth(c)?.tenantId ?? 0;
  const actorUserId = getAuth(c)?.userId ?? 0;
  const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
  const userAgent = c.req.header('user-agent');
  try {
    const result = await new PublishGateService().publish(storeId, tenantId, { actorUserId, ipAddress, userAgent });
    if (!result.success) {
      const errorCode = result.acknowledgement ? 'MERCHANT_ACKNOWLEDGEMENT_REQUIRED' : 'STORE_COMPLIANCE_INCOMPLETE';
      return c.json({
        success: false,
        error: { code: errorCode, message: result.message || 'Cannot publish' },
        data: {
          ...(result.checklist ? { checklist: result.checklist } : {}),
          ...(result.acknowledgement ? { acknowledgement: result.acknowledgement } : {}),
        },
      }, 422);
    }
    return c.json({ success: true, data: { storeId, publishStatus: result.publishStatus } });
  } catch (e) {
    return c.json({ success: false, error: { code: 'PUBLISH_ERROR', message: e instanceof Error ? e.message : 'Publish failed' } }, 500);
  }
});

settingsRouter.post('/unpublish', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const actorUserId = getAuth(c)?.userId ?? 0;
  const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
  const userAgent = c.req.header('user-agent');
  try {
    const result = await new PublishGateService().unpublish(storeId, { actorUserId, ipAddress, userAgent });
    if (!result.success) {
      return c.json({ success: false, error: { code: 'UNPUBLISH_ERROR', message: result.message || 'Cannot unpublish' } }, 422);
    }
    return c.json({ success: true, data: { storeId, publishStatus: result.publishStatus } });
  } catch (e) {
    return c.json({ success: false, error: { code: 'UNPUBLISH_ERROR', message: e instanceof Error ? e.message : 'Unpublish failed' } }, 500);
  }
});

settingsRouter.get('/publish-status', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const publishStatus = await new PublishGateService().getPublishStatus(storeId);
  return c.json({ success: true, data: { storeId, publishStatus } });
});

// Merchant Acknowledgement
settingsRouter.get('/acknowledgement/status', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = await new AcknowledgementService().getStatus(storeId);
  return c.json({ success: true, data: status });
});

settingsRouter.get('/acknowledgement/required-items', requirePermission('settings:read'), async (c) => {
  const service = new AcknowledgementService();
  return c.json({
    success: true,
    data: {
      requiredItems: service.getRequiredItems(),
      requiredCheckboxes: service.getRequiredCheckboxes(),
    },
  });
});

settingsRouter.post('/acknowledge', requirePermission('settings:update'), zValidator('json', z.object({
  acknowledgedItems: z.record(z.boolean()),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const userId = getAuth(c)?.userId ?? 0;
  const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
  const userAgent = c.req.header('user-agent');
  const body = c.req.valid('json');
  try {
    const status = await new AcknowledgementService().acknowledge({
      storeId,
      merchantUserId: userId,
      ipAddress,
      userAgent,
      acknowledgedItems: body.acknowledgedItems,
    });
    return c.json({ success: true, data: status });
  } catch (e) {
    return c.json({ success: false, error: { code: 'ACKNOWLEDGE_ERROR', message: e instanceof Error ? e.message : 'Acknowledgement failed' } }, 500);
  }
});

export { settingsRouter };
