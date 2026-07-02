import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getPaymentProviderStatus, KycService, PublishGateService, AcknowledgementService, StoreSettingsService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';

const settingsRouter = new Hono();

settingsRouter.use('*', requireAuth(), requireStoreAccess());

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

// ── Store metadata ───────────────────────────────────────

settingsRouter.get('/', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const store = await new StoreSettingsService().getStore(storeId);
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
  const { tenantId: _tenantId, ...rest } = store;
  return c.json({ success: true, data: rest });
});

settingsRouter.put('/', requirePermission('settings:update'), zValidator('json', updateStoreSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const updated = await new StoreSettingsService().updateStore(storeId, body);
  if (!updated) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
  const { tenantId: _tenantId, ...rest } = updated;
  return c.json({ success: true, data: rest });
});

// ── Store config (welcome + min order + address) ────────

settingsRouter.get('/store-config', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await new StoreSettingsService().getStoreConfig(storeId);
  return c.json({ success: true, data });
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
  const data = await new StoreSettingsService().updateStoreConfig(storeId, body);
  return c.json({ success: true, data });
});

// ── Size guides ──────────────────────────────────────────

settingsRouter.get('/size-guides', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const guides = await new StoreSettingsService().listSizeGuides(storeId);
  return c.json({ success: true, data: guides });
});

settingsRouter.post('/size-guides', requirePermission('settings:update'), zValidator('json', sizeGuideSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const guide = await new StoreSettingsService().createSizeGuide(storeId, body);
  return c.json({ success: true, data: guide }, 201);
});

settingsRouter.put('/size-guides/:guideId', requirePermission('settings:update'), zValidator('json', sizeGuideSchema.partial()), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const guideId = Number(c.req.param('guideId'));
  const body = c.req.valid('json');
  const guide = await new StoreSettingsService().updateSizeGuide(storeId, guideId, body);
  if (!guide) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Size guide not found' } }, 404);
  return c.json({ success: true, data: guide });
});

settingsRouter.delete('/size-guides/:guideId', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const guideId = Number(c.req.param('guideId'));
  const deleted = await new StoreSettingsService().deleteSizeGuide(storeId, guideId);
  if (!deleted) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Size guide not found' } }, 404);
  return c.json({ success: true, data: deleted });
});

// ── Readiness aggregation ────────────────────────────────

settingsRouter.get('/readiness', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await new StoreSettingsService().getReadiness(storeId);
  return c.json({ success: true, data });
});

// ── Payment status (delegated to existing services) ─────

settingsRouter.get('/payment-status', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = getPaymentProviderStatus();
  const kycStatus = await new KycService().getStatus(storeId);
  const kycRequiredForLive = !new KycService().isKycApproved(kycStatus.status);
  return c.json({ success: true, data: { ...status, kycRequiredForLive } });
});

// ── Product features ─────────────────────────────────────

settingsRouter.get('/product-features', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await new StoreSettingsService().getProductFeatures(storeId);
  return c.json({ success: true, data });
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
  const result = await new StoreSettingsService().updateProductFeatures(storeId, body);
  if (result.kind === 'pickup_no_location') {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: result.message } }, 400);
  }
  return c.json({ success: true, data: result.features });
});

// ── Theme ────────────────────────────────────────────────

// P1-10 audit fix: the merchant-dashboard UI gates /theme on the
// catalog's dedicated `theme:view`/`theme:update` permissions (see
// packages/shared/src/permissions.ts), but these routes were still
// checking the coarse `stores:read`/`settings:update` — an employee
// granted only `theme:*` (no `settings:*`) would see the page load then
// get 403 on every call.
settingsRouter.get('/theme', requirePermission('theme:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await new StoreSettingsService().getTheme(storeId);
  return c.json({ success: true, data });
});

settingsRouter.put('/theme', requirePermission('theme:update'), zValidator('json', z.object({
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
    saudiMade: z.object({ enabled: z.boolean().optional(), membershipNumber: z.string().optional(), verificationUrl: z.string().optional(), acceptedTerms: z.boolean().optional(), oficialAssetUrl: z.string().optional(), memberConfirmed: z.boolean().optional() }).optional(),
    vat: z.object({ enabled: z.boolean().optional(), vatNumber: z.string().optional(), verificationUrl: z.string().optional(), acceptedTerms: z.boolean().optional() }).optional(),
  }).optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const { config, history } = await new StoreSettingsService().updateTheme(storeId, body);
  return c.json({ success: true, data: config, history });
});

settingsRouter.get('/theme/history', requirePermission('theme:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await new StoreSettingsService().getThemeHistory(storeId);
  return c.json({ success: true, data });
});

// ── Gift options ─────────────────────────────────────────

settingsRouter.get('/gift-options', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await new StoreSettingsService().getGiftOptions(storeId);
  return c.json({ success: true, data });
});

settingsRouter.put('/gift-options', requirePermission('settings:update'), zValidator('json', z.object({
  giftWrapDefaultPrice: z.coerce.number().min(0).optional(),
  giftMessageMaxLength: z.coerce.number().int().min(1).max(1000).optional(),
  giftWrapInstructions: z.string().max(500).optional().nullable(),
  pickupInstructions: z.string().max(500).optional().nullable(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const data = await new StoreSettingsService().updateGiftOptions(storeId, body);
  return c.json({ success: true, data });
});

// ── Pickup locations ─────────────────────────────────────

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
  const locations = await new StoreSettingsService().listPickupLocations(storeId);
  return c.json({ success: true, data: locations });
});

settingsRouter.post('/pickup-locations', requirePermission('settings:update'), zValidator('json', pickupLocationSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const location = await new StoreSettingsService().createPickupLocation(storeId, body);
  return c.json({ success: true, data: location }, 201);
});

settingsRouter.put('/pickup-locations/:id', requirePermission('settings:update'), zValidator('json', pickupLocationSchema.partial()), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const updated = await new StoreSettingsService().updatePickupLocation(storeId, id, body);
  if (!updated) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } }, 404);
  return c.json({ success: true, data: updated });
});

settingsRouter.delete('/pickup-locations/:id', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const deleted = await new StoreSettingsService().deletePickupLocation(storeId, id);
  if (!deleted) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } }, 404);
  return c.json({ success: true, data: deleted });
});

// ── Publish + acknowledge (delegated to existing services) ───

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

settingsRouter.get('/publish-status', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const publishStatus = await new PublishGateService().getPublishStatus(storeId);
  return c.json({ success: true, data: { storeId, publishStatus } });
});

// Merchant Acknowledgement
settingsRouter.get('/acknowledgement/status', requirePermission('stores:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = await new AcknowledgementService().getStatus(storeId);
  return c.json({ success: true, data: status });
});

settingsRouter.get('/acknowledgement/required-items', requirePermission('stores:read'), async (c) => {
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
