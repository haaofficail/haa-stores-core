// Store info routes — get store by slug, theme, demo info, product features, size guide.

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { buildWhatsappContactChannel, getOfficialContactEmail } from '@haa/commerce-core';
import { resolveActiveThemeConfig } from '@haa/theme-system/server';
import { isDemoStore, resolveStoreThemePrimaryColor } from '@haa/shared';
import { toPublicStore } from '@haa/shared/dto/storefront-dto';
import { resolveStore } from './_shared.js';

type AnyRecord = Record<string, unknown>;

export const storeInfoRouter = new Hono();

storeInfoRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug') as string | undefined;
  const store = await resolveStore(slug);
  if (!store || (store.status !== 'active' && store.status !== 'inactive')) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'لم يتم العثور على المتجر.' } }, 404);
  }
  if (store.status === 'inactive' || !store.isActive) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'لم يتم العثور على المتجر.' } }, 404);
  }
  if (store.publishStatus !== 'published') {
    return c.json({ success: false, error: { code: 'STORE_NOT_PUBLISHED', message: 'المتجر غير متاح حالياً.' } }, 404);
  }
  const db = createDbClient();
  const [prefs] = await db.select().from(s.notificationPreferences).where(eq(s.notificationPreferences.storeId, Number(store.id))).limit(1);
  const contactChannels = {
    email: typeof store.email === 'string' && store.email ? store.email : getOfficialContactEmail(),
    whatsapp: buildWhatsappContactChannel(
      !!prefs?.whatsappEnabled,
      prefs?.whatsappPhone,
      `مرحباً، أحتاج مساعدة من متجر ${String(store.name ?? '')}`,
    ),
  };
  return c.json({ success: true, data: toPublicStore(store, contactChannels) });
});

storeInfoRouter.get('/:slug/theme', async (c) => {
  const slug = c.req.param('slug') as string | undefined;
  const store = await resolveStore(slug);
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);

  const db = createDbClient();
  const [settingsRow] = await db
    .select()
    .from(s.storeSettings)
    .where(eq(s.storeSettings.storeId, store.id))
    .limit(1);

  const rawConfig = (settingsRow as any)?.themeConfig ?? null;
  const config = resolveActiveThemeConfig(rawConfig);
  const resolvedPrimary = resolveStoreThemePrimaryColor(
    store.primaryColor,
    rawConfig?.colors?.primary ?? null,
  );
  if (resolvedPrimary) {
    config.colors.primary = resolvedPrimary;
  }
  return c.json({
    success: true,
    data: {
      preset: config.preset,
      themeKey: config.themeKey,
      colors: config.colors ?? {},
      font: config.font ?? {},
      layout: config.layout ?? {},
      homepage: config.homepage ?? {},
      header: config.header ?? {},
      footer: config.footer ?? {},
      customCss: config.customCss ?? '',
      analytics: config.analytics ?? {},
      socialLinks: config.socialLinks ?? {},
      trustBadges: config.trustBadges ?? {},
    },
  });
});

storeInfoRouter.get('/:slug/demo-info', async (c) => {
  const slug = c.req.param('slug') as string | undefined;
  const store = await resolveStore(slug);
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'لم يتم العثور على المتجر.' } }, 404);
  const demoInfo = { isDemo: (store as any).isDemo ?? false, demoProfile: (store as any).demoProfile ?? null, demoSeedVersion: (store as any).demoSeedVersion ?? null };
  if (!isDemoStore(demoInfo)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not a demo store' } }, 404);
  }
  return c.json({
    success: true,
    data: {
      demoProfile: (store as any).demoProfile ?? null,
      demoSeedVersion: (store as any).demoSeedVersion ?? null,
    },
  });
});

storeInfoRouter.get('/:slug/product-features', async (c) => {
  const slug = c.req.param('slug') as string | undefined;
  const store = await resolveStore(slug);
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'لم يتم العثور على المتجر.' } }, 404);

  const db = createDbClient();
  const [settings] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, Number(store.id))).limit(1);
  return c.json({
    success: true,
    data: settings?.productFeatures ?? {
      imageLightbox: true,
      stickyCart: true,
      trustBadges: true,
      reviews: true,
      shareButton: true,
      deliveryEstimate: true,
      sizeGuide: true,
    },
  });
});

storeInfoRouter.get('/:slug/size-guide', async (c) => {
  const slug = c.req.param('slug') as string | undefined;
  const store = await resolveStore(slug);
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'لم يتم العثور على المتجر.' } }, 404);

  const db = createDbClient();
  const guides = await db.select().from(s.sizeGuides).where(and(
    eq(s.sizeGuides.storeId, Number(store.id)),
    eq(s.sizeGuides.isActive, true),
  )).orderBy(desc(s.sizeGuides.createdAt));

  return c.json({ success: true, data: guides });
});
