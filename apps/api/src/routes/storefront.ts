import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { resolveActiveThemeConfig } from '@haa/theme-system/server';
import { ProductsService, CategoriesService, CartService, CheckoutService, OrdersService, CouponsService, PoliciesService, PromotionsService, BrandsService, TagsService, createPaymentProvider, getAvailablePaymentMethods, PaymentProviderSettingsService, buildWhatsappContactChannel, getOfficialContactEmail, SupportService } from '@haa/commerce-core';
import { ShippingService, ManualShippingProvider } from '@haa/shipping-core';
import { paginationSchema, ALLOWED_PAYMENT_METHODS, AppError } from '@haa/shared';

type AnyRecord = Record<string, unknown>;

function toPublicProduct(product: AnyRecord): AnyRecord {
  const { cost, images, createdAt, updatedAt, storeId, seoTitle, seoDescription, barcode, ...rest } = product;
  const imageUrls: string[] = Array.isArray(images)
    ? images.map((img: any) => {
        if (typeof img === 'string') return img;
        return img.url ?? img.thumbUrl ?? '';
      }).filter(Boolean)
    : [];
  return {
    ...rest,
    images: imageUrls,
    giftWrapAvailable: product.giftWrapAvailable ?? false,
    giftWrapPriceOverride: product.giftWrapPriceOverride ?? null,
  };
}

function toPublicProducts(products: AnyRecord[]): AnyRecord[] {
  return products.map(toPublicProduct);
}

function toPublicStore(store: AnyRecord, contactChannels?: AnyRecord): AnyRecord {
  const { tenantId, createdAt, updatedAt, ...rest } = store;
  return { ...rest, contactChannels };
}

function toPublicOrder(order: AnyRecord): AnyRecord {
  const { id, storeId, checkoutSessionId, idempotencyKey, walletEntry, paymentIntentRaw, auditLogs, platformFee, customerId, createdAt, updatedAt, metadata, couponCode, couponDiscount, billingAddress, notes, paidAmount, discount, customerEmail, ...rest } = order;
  const items = (rest.items as AnyRecord[])?.map((item: AnyRecord) => {
    const { id, orderId, createdAt, updatedAt, ...itemRest } = item;
    return {
      ...itemRest,
      giftWrapSelected: item.giftWrapSelected ?? false,
      sendAsGift: item.sendAsGift ?? false,
      giftMessage: item.giftMessage ?? null,
    };
  }) ?? rest.items;
  const giftOpts = order.giftOptions ? (typeof order.giftOptions === 'string' ? JSON.parse(order.giftOptions) : order.giftOptions) : null;
  return {
    ...rest, items,
    fulfillmentType: order.fulfillmentType ?? 'shipping',
    pickupLocationId: order.pickupLocationId ?? null,
    giftOptions: giftOpts,
  };
}

function toPublicCart(cart: AnyRecord): AnyRecord {
  if (!cart) return cart;
  const { sessionToken, isAbandoned, expiresAt, createdAt, updatedAt, ...cartRest } = cart;
  const items = (cartRest.items as AnyRecord[])?.map((item: AnyRecord) => {
    const cartItem = (item.item && typeof item.item === 'object' ? item.item : item) as AnyRecord;
    const productSource = item.product as AnyRecord | undefined;
    const product = productSource ? toPublicProduct(productSource) : item.product;

    return {
      id: cartItem.id,
      productId: cartItem.productId,
      variantId: cartItem.variantId ?? null,
      quantity: cartItem.quantity,
      unitPrice: cartItem.unitPrice,
      totalPrice: cartItem.totalPrice,
      notes: cartItem.notes ?? null,
      giftWrapSelected: cartItem.giftWrapSelected ?? false,
      giftWrapPrice: cartItem.giftWrapPrice ?? null,
      sendAsGift: cartItem.sendAsGift ?? false,
      giftMessage: cartItem.giftMessage ?? null,
      variant: item.variant ?? null,
      product,
    };
  });
  return { ...cartRest, items };
}

function toPublicCategory(category: AnyRecord): AnyRecord {
  const { storeId, tenantId, parentId, metaDescription, createdAt, updatedAt, ...rest } = category;
  return rest;
}

function toPublicShippingMethod(method: AnyRecord): AnyRecord {
  const { storeId, providerAccountId, config, sortOrder, createdAt, updatedAt, ...rest } = method;
  return rest;
}

function getOfferEndDate(activePromotions: AnyRecord[], product: AnyRecord): string | null {
  const matching = activePromotions.filter((p: AnyRecord) => {
    if (p.appliesTo === 'all') return true;
    if (p.appliesTo === 'product' && Number(p.appliesToId) === Number(product.id)) return true;
    if (p.appliesTo === 'category' && Number(p.appliesToId) === Number(product.categoryId)) return true;
    return false;
  });
  if (matching.length === 0) return null;
  const earliest = matching.reduce((a: AnyRecord, b: AnyRecord) =>
    new Date(a.endsAt as string) < new Date(b.endsAt as string) ? a : b
  );
  return new Date(earliest.endsAt as string).toISOString();
}

function toPublicPolicy(policy: AnyRecord): AnyRecord {
  const { storeId, id, createdBy, updatedBy, createdAt, updatedAt, ...rest } = policy;
  return rest;
}

const storefrontRouter = new Hono();

async function resolveStore(slug: string | undefined) {
  if (!slug) return null;
  const db = createDbClient();
  const [store] = await db.select().from(s.stores).where(eq(s.stores.slug, slug)).limit(1);
  return store ?? null;
}

async function resolveActiveStore(c: any): Promise<{ store: any; error: any }> {
  const slug = c.req.param('slug') as string | undefined;
  const store = await resolveStore(slug);
  if (!store) return { store: null, error: c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404) };
  if (store.status !== 'active' || !store.isActive) {
    return { store: null, error: c.json({ success: false, error: { code: 'NOT_FOUND', message: 'لم يتم العثور على المتجر.' } }, 404) };
  }
  if (store.publishStatus !== 'published') {
    return { store: null, error: c.json({ success: false, error: { code: 'STORE_NOT_PUBLISHED', message: 'المتجر غير متاح حالياً.' } }, 404) };
  }
  return { store, error: null };
}

storefrontRouter.get('/:slug', async (c) => {
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

const defaultFeatures = {
  imageLightbox: true, stickyCart: true, trustBadges: true, reviews: true,
  shareButton: true, deliveryEstimate: true, sizeGuide: true, alsoBought: true,
  recentlyViewed: true, priceAlert: true, giftWrap: true, sendAsGift: true, pickup: true, stockBar: true,
  liveViewers: true, compareBadges: true,
  badgeMaroof: false, badgeSaudiBusinessCenter: false, badgeSaudiMade: false,
};

storefrontRouter.get('/:slug/theme', async (c) => {
  const slug = c.req.param('slug') as string | undefined;
  const store = await resolveStore(slug);
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
  const db = createDbClient();
  const [settingsRow] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, store.id)).limit(1);
  const config = resolveActiveThemeConfig(settingsRow?.themeConfig as any);
  return c.json({ success: true, data: {
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
  } });
});

storefrontRouter.get('/:slug/product-features', async (c) => {
  const slug = c.req.param('slug') as string | undefined;
  const store = await resolveStore(slug);
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
  const db = createDbClient();
  const [settingsRow] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, store.id)).limit(1);
  return c.json({ success: true, data: (settingsRow?.productFeatures as any) ?? defaultFeatures });
});

storefrontRouter.get('/:slug/size-guide', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const productId = c.req.query('productId') ? Number(c.req.query('productId')) : undefined;
  if (!productId) return c.json({ success: true, data: null });

  const db = createDbClient();
  const [product] = await db.select({ id: s.products.id })
    .from(s.products)
    .where(and(eq(s.products.id, productId), eq(s.products.storeId, store.id), eq(s.products.status, 'active')))
    .limit(1);
  if (!product) return c.json({ success: true, data: null });

  const productCategories = await db.select({ categoryId: s.productCategories.categoryId })
    .from(s.productCategories)
    .where(eq(s.productCategories.productId, productId));
  const categoryIds = new Set(productCategories.map(c => Number(c.categoryId)));
  const guides = await db.select()
    .from(s.sizeGuides)
    .where(and(eq(s.sizeGuides.storeId, store.id), eq(s.sizeGuides.isActive, true)));

  const productGuide = guides.find(guide => Array.isArray(guide.productIds) && guide.productIds.map(Number).includes(productId));
  const categoryGuide = guides.find(guide => Array.isArray(guide.categoryIds) && guide.categoryIds.map(Number).some((id: number) => categoryIds.has(id)));
  return c.json({ success: true, data: productGuide ?? categoryGuide ?? null });
});

storefrontRouter.get('/:slug/order/:orderNumber', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const orderNumber = c.req.param('orderNumber') as string | undefined;
  if (!orderNumber) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Order number required' } }, 400);
  const phone = c.req.query('phone');
  if (!phone) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Phone is required' } }, 400);
  const order = await new OrdersService().getByOrderNumberPublic(orderNumber, phone);
  if (!order || order.storeId !== store.id) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  return c.json({ success: true, data: toPublicOrder(order as AnyRecord) });
});

storefrontRouter.get('/:slug/products', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const query = paginationSchema.parse(c.req.query());
  const categorySlug = c.req.query('category');
  const brandId = c.req.query('brandId') ? Number(c.req.query('brandId')) : undefined;
  const tagId = c.req.query('tagId') ? Number(c.req.query('tagId')) : undefined;
  const search = c.req.query('search') || undefined;
  const minPrice = c.req.query('minPrice') ? Number(c.req.query('minPrice')) : undefined;
  const maxPrice = c.req.query('maxPrice') ? Number(c.req.query('maxPrice')) : undefined;
  const sort = (c.req.query('sort') as any) || undefined;
  let categoryId: number | undefined;

  if (categorySlug) {
    const db = createDbClient();
    const [cat] = await db.select().from(s.categories)
      .where(and(eq(s.categories.slug, categorySlug), eq(s.categories.storeId, store.id))).limit(1);
    categoryId = cat?.id;
  }

  const productResult = await new ProductsService().list(store.id, {
    ...query, status: 'active', categoryId, brandId, tagId, search, minPrice, maxPrice, sort,
  });
  const activePromotions = await new PromotionsService().getActiveForStore(store.id);
  const dataWithOffer = toPublicProducts(productResult.data).map((product: AnyRecord) => ({
    ...product,
    offerEndDate: getOfferEndDate(activePromotions, product),
  }));
  return c.json({ success: true, data: { ...productResult, data: dataWithOffer } });
});

storefrontRouter.get('/:slug/products/:productSlug', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const productSlug = c.req.param('productSlug') as string | undefined;
  if (!productSlug) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Product slug required' } }, 400);
  const product = await new ProductsService().getBySlug(store.id, productSlug);
  if (!product || product.status !== 'active') return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  const activePromotions = await new PromotionsService().getActiveForStore(store.id);
  return c.json({ success: true, data: {
    ...toPublicProduct(product as AnyRecord),
    offerEndDate: getOfferEndDate(activePromotions, product as AnyRecord),
  } });
});

storefrontRouter.get('/:slug/categories', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const categories = await new CategoriesService().list(store.id);
  const active = categories.filter(c => c.isActive);
  return c.json({ success: true, data: active.map(c => toPublicCategory(c as AnyRecord)) });
});

storefrontRouter.get('/:slug/brands', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const brands = await new BrandsService().list(store.id);
  const active = brands.filter(b => b.isActive);
  return c.json({ success: true, data: active.map(b => ({ id: b.id, name: b.name, slug: b.slug, logo: b.logo })) });
});

storefrontRouter.get('/:slug/tags', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const tags = await new TagsService().list(store.id);
  return c.json({ success: true, data: tags.map(t => ({ id: t.id, name: t.name, slug: t.slug, color: t.color })) });
});

storefrontRouter.post('/:slug/cart', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const cartService = new CartService();
  const cart = await cartService.createCart(store.id, undefined, c.req.header('x-session-token'));
  return c.json({ success: true, data: cart }, 201);
});

storefrontRouter.get('/:slug/cart/:cartId', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const cartId = c.req.param('cartId') as string | undefined;
  if (!cartId) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cart ID required' } }, 400);
  const cart = await new CartService().getCart(store.id, cartId);
  if (!cart) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart not found' } }, 404);
  return c.json({ success: true, data: toPublicCart(cart as AnyRecord) });
});

storefrontRouter.post('/:slug/cart/:cartId/items', zValidator('json', z.object({
  productId: z.coerce.number(),
  variantId: z.coerce.number().optional(),
  quantity: z.coerce.number().int().positive(),
  notes: z.string().max(500).optional(),
  giftWrapSelected: z.boolean().optional(),
  sendAsGift: z.boolean().optional(),
  giftMessage: z.string().max(1000).optional(),
})), async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const cartId = c.req.param('cartId') as string | undefined;
  if (!cartId) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cart ID required' } }, 400);
  const body = c.req.valid('json');
  const cart = await new CartService().addItem(store.id, cartId, body.productId, body.quantity, body.notes, {
    giftWrapSelected: body.giftWrapSelected,
    sendAsGift: body.sendAsGift,
    giftMessage: body.giftMessage,
  }, body.variantId);
  if (!cart) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Product not available' } }, 400);
  return c.json({ success: true, data: toPublicCart(cart as AnyRecord) });
});

storefrontRouter.patch('/:slug/cart/:cartId/items/:itemId', zValidator('json', z.object({
  quantity: z.coerce.number().int().positive(),
})), async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const cartId = c.req.param('cartId') as string | undefined;
  const itemId = Number(c.req.param('itemId'));
  if (!cartId) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cart ID required' } }, 400);
  const body = c.req.valid('json');
  const updated = await new CartService().updateItemQuantity(store.id, cartId, itemId, body.quantity);
  if (!updated) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cart item not found, inactive, or insufficient stock' } }, 400);
  const updatedCart = await new CartService().getCart(store.id, cartId);
  if (!updatedCart) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart not found' } }, 404);
  return c.json({ success: true, data: toPublicCart(updatedCart as AnyRecord) });
});

storefrontRouter.delete('/:slug/cart/:cartId/items/:itemId', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const cartId = c.req.param('cartId') as string | undefined;
  const itemId = Number(c.req.param('itemId'));
  if (!cartId) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cart ID required' } }, 400);
  const removed = await new CartService().removeItem(store.id, cartId, itemId);
  if (!removed) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart item not found' } }, 404);
  const updatedCart = await new CartService().getCart(store.id, cartId);
  if (!updatedCart) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart not found' } }, 404);
  return c.json({ success: true, data: toPublicCart(updatedCart as AnyRecord) });
});

storefrontRouter.get('/:slug/shipping-methods', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const methods = await new ShippingService().listMethods(store.id);
  return c.json({ success: true, data: methods.map(m => toPublicShippingMethod(m as AnyRecord)) });
});

storefrontRouter.post('/:slug/checkout/shipping-rates', zValidator('json', z.object({
  cartId: z.string().uuid(),
  city: z.string(),
})), async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const body = c.req.valid('json');
  const cart = await new CartService().getCart(store.id, body.cartId);
  if (!cart) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart not found' } }, 404);
  const provider = new ManualShippingProvider();
  const rates = await provider.calculateRates({
    storeId: store.id,
    items: cart.items.map(i => ({
      weightGrams: i.product.weightGrams,
      quantity: i.item.quantity,
      requiresShipping: i.product.requiresShipping,
    })),
    destination: { city: body.city, country: 'Saudi Arabia' },
    subtotal: cart.subtotal,
  });
  return c.json({ success: true, data: rates });
});

storefrontRouter.post('/:slug/checkout/validate-coupon', zValidator('json', z.object({
  code: z.string().min(1).max(50),
  subtotal: z.coerce.number().nonnegative(),
  shippingCost: z.coerce.number().nonnegative().optional(),
})), async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const body = c.req.valid('json');
  const couponService = new CouponsService();
  const validation = await couponService.validate(store.id, body.code, Number(body.subtotal));
  if (!validation.valid) {
    return c.json({ success: true, data: { valid: false, reason: validation.reason } });
  }
  const discount = couponService.calculateDiscount(validation.coupon, Number(body.subtotal), Number(body.shippingCost ?? 0));
  return c.json({ success: true, data: { valid: true, discount, code: validation.coupon.code, couponId: validation.coupon.id } });
});

storefrontRouter.post('/:slug/checkout/sessions', zValidator('json', z.object({
  cartId: z.string().uuid(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(1).max(20),
  customerEmail: z.string().email().optional(),
  shippingAddress: z.object({
    street: z.string().optional(),
    district: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  shippingMethodId: z.coerce.number().optional(),
  paymentMethod: z.enum(ALLOWED_PAYMENT_METHODS),
  notes: z.string().optional(),
  idempotencyKey: z.string().uuid(),
  couponCode: z.string().optional(),
  fulfillmentType: z.enum(['shipping', 'local_pickup']).optional(),
  pickupLocationId: z.coerce.number().optional(),
  gift: z.object({
    sendAsGift: z.boolean().optional(),
    message: z.string().max(1000).optional(),
  }).optional(),
})), async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const body = c.req.valid('json');
  try {
    const sessionResult = await new CheckoutService().createSession(store.id, body);
    const { session, idempotent } = sessionResult as any;
    return c.json({ success: true, data: { ...session, idempotent } }, idempotent ? 200 : 201);
  } catch (e) {
    if (e instanceof AppError) throw e;
    const status = e instanceof Error && (e.message.includes('not found') || e.message.includes('required') || e.message.includes('invalid')) ? 400 : 500;
    throw new AppError(status, 'CHECKOUT_ERROR', e instanceof Error ? e.message : 'Checkout failed');
  }
});

storefrontRouter.post('/:slug/checkout/payment-session', zValidator('json', z.object({
  sessionId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  failureUrl: z.string().url().optional(),
})), async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const slug = c.req.param('slug') as string;
  const body = c.req.valid('json');
  try {
    const proto = c.req.header('x-forwarded-proto') || 'https';
    const host = c.req.header('host') || '';
    const callbackBase = `${proto}://${host}/s/${slug}/checkout/payments/callback`;

    const bnplResult = await new CheckoutService().initiateBNPLPayment(store.id, body.sessionId, {
      frontendSuccessUrl: body.successUrl,
      frontendCancelUrl: body.cancelUrl,
      frontendFailureUrl: body.failureUrl,
      callbackSuccessUrl: `${callbackBase}?status=success`,
      callbackCancelUrl: `${callbackBase}?status=cancelled`,
      callbackFailureUrl: `${callbackBase}?status=failed`,
    });
    return c.json({ success: true, data: { redirectUrl: bnplResult.redirectUrl, paymentId: bnplResult.paymentId, order: toPublicOrder(bnplResult.order as AnyRecord) } });
  } catch (e) {
    if (e instanceof AppError) throw e;
    const status = e instanceof Error && (e.message.includes('not found') || e.message.includes('required') || e.message.includes('invalid')) ? 400 : 500;
    throw new AppError(status, 'BNPL_SESSION_ERROR', e instanceof Error ? e.message : 'BNPL payment initiation failed');
  }
});

// BNPL callback — handles redirects from Tabby/Tamara after customer completes payment
// Tabby sends: ?payment_id=xxx&status=xxx
// Tamara sends: ?order_id=xxx&checkout_id=xxx&status=xxx
storefrontRouter.get('/:slug/checkout/payments/callback', async (c) => {
  const slug = c.req.param('slug') as string;
  const store = await resolveStore(slug);
  if (!store) return c.redirect('/?error=store_not_found');

  const paymentId = c.req.query('payment_id') as string | undefined;
  const orderId = c.req.query('order_id') as string | undefined;
  const providerPaymentId = paymentId || orderId;
  if (!providerPaymentId) return c.redirect('/?error=missing_payment_id');

  try {
    const result = await new CheckoutService().handleBNPLCallback(store.id, providerPaymentId);
    const baseUrl = result.redirectUrl || '/';
    const separator = baseUrl.includes('?') ? '&' : '?';
    const finalUrl = result.orderNumber ? `${baseUrl}${separator}orderNumber=${result.orderNumber}` : baseUrl;
    return c.redirect(finalUrl);
  } catch {
    return c.redirect('/?error=callback_failed');
  }
});

storefrontRouter.post('/:slug/checkout/sessions/:sessionId/confirm', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const sessionId = c.req.param('sessionId') as string | undefined;
  if (!sessionId) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Session ID required' } }, 400);
  try {
    const confirmResult = await new CheckoutService().confirm(store.id, sessionId, undefined, c.req.header('x-forwarded-for'));
    return c.json({ success: true, data: { ...confirmResult, order: toPublicOrder((confirmResult.order as AnyRecord) ?? {}) } });
  } catch (e) {
    if (e instanceof AppError) throw e;
    const status = e instanceof Error && (e.message.includes('not found') || e.message.includes('required') || e.message.includes('invalid')) ? 400 : 500;
    throw new AppError(status, 'CONFIRM_ERROR', e instanceof Error ? e.message : 'Confirmation failed');
  }
});

storefrontRouter.get('/:slug/track/:orderNumber', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const orderNumber = c.req.param('orderNumber') as string | undefined;
  if (!orderNumber) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Order number required' } }, 400);
  const phone = c.req.query('phone');
  if (!phone) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Phone is required' } }, 400);
  const order = await new OrdersService().getByOrderNumberPublic(orderNumber, phone);
  if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  return c.json({ success: true, data: toPublicOrder(order as AnyRecord) });
});

storefrontRouter.get('/:slug/pickup-locations', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const db = createDbClient();
  const locations = await db.select({
    id: s.pickupLocations.id,
    nameAr: s.pickupLocations.nameAr,
    nameEn: s.pickupLocations.nameEn,
    address: s.pickupLocations.address,
    mapsUrl: s.pickupLocations.mapsUrl,
    phone: s.pickupLocations.phone,
    hours: s.pickupLocations.hours,
    instructions: s.pickupLocations.instructions,
  }).from(s.pickupLocations)
    .where(and(eq(s.pickupLocations.storeId, store.id), eq(s.pickupLocations.isActive, true)));
  return c.json({ success: true, data: locations });
});

storefrontRouter.get('/:slug/payment-methods', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;

  const cartId = c.req.query('cartId') as string | undefined;
  const country = c.req.query('country') as string | undefined;
  const currency = c.req.query('currency') as string | undefined;

  let amount: number | undefined;
  if (cartId) {
    try {
      const cart = await new CartService().getCart(store.id, cartId);
      if (cart && cart.items && cart.items.length > 0) {
        amount = cart.subtotal;
      }
    } catch {
      // If cart lookup fails, proceed without amount
    }
  }

  const methods = await new PaymentProviderSettingsService().getAvailableMethods(store.id, { country, currency, amount });

  return c.json({ success: true, data: { methods } });
});

storefrontRouter.get('/:slug/gift-options', async (c) => {
  const result = await resolveActiveStore(c);
  if (result.error) return result.error;
  const store = result.store;
  const db = createDbClient();
  const [settings] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, store.id)).limit(1);
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

storefrontRouter.get('/:slug/policies/:type', async (c) => {
  const slug = c.req.param('slug') as string | undefined;
  const type = c.req.param('type') as string;
  const validTypes = ['privacy', 'terms', 'shipping', 'returns', 'about'];
  if (!validTypes.includes(type)) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid policy type' } }, 400);

  const store = await resolveStore(slug);
  if (!store || store.status !== 'active' || !store.isActive) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'لم يتم العثور على المتجر.' } }, 404);
  }

  const policy = await new PoliciesService().getPublished(store.id, type);
  if (!policy) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' } }, 404);
  return c.json({ success: true, data: toPublicPolicy(policy as AnyRecord) });
});

// ─── Public Support Routes ───

async function resolveActiveStoreOrError(c: any): Promise<{ store: any; error: any }> {
  const slug = c.req.param('slug') as string | undefined;
  const store = await resolveStore(slug);
  if (!store || store.status !== 'active' || !store.isActive) {
    return { store: null, error: c.json({ success: false, error: { code: 'NOT_FOUND', message: 'لم يتم العثور على المتجر.' } }, 404) };
  }
  return { store, error: null };
}

storefrontRouter.post('/:slug/support/tickets', async (c) => {
  const { store, error } = await resolveActiveStoreOrError(c);
  if (error) return error;
  const { name, email, phone, subject, message } = await c.req.json();
  if (!name || !subject || !message) {
    return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'الاسم والموضوع والرسالة مطلوبة.' } }, 400);
  }
  const ticket = await new SupportService().createTicket({
    storeId: store.id,
    name, email: email || null, phone: phone || null, subject, message,
  });
  return c.json({ success: true, data: { id: ticket.id, accessToken: ticket.accessToken, subject: ticket.subject, createdAt: ticket.createdAt } });
});

storefrontRouter.get('/:slug/support/tickets/:ticketId', async (c) => {
  const { store, error } = await resolveActiveStoreOrError(c);
  if (error) return error;
  const ticketId = Number(c.req.param('ticketId'));
  const accessToken = c.req.query('accessToken') as string | undefined;
  if (!accessToken) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'رمز الدخول مطلوب.' } }, 400);
  const ticket = await new SupportService().getTicketByAccessToken(accessToken);
  if (!ticket || ticket.id !== ticketId || ticket.storeId !== store.id) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'التذكرة غير موجودة.' } }, 404);
  }
  const messages = await new SupportService().getMessages(ticketId);
  return c.json({ success: true, data: { ...ticket, messages } });
});

storefrontRouter.post('/:slug/support/tickets/:ticketId/reply', async (c) => {
  const { store, error } = await resolveActiveStoreOrError(c);
  if (error) return error;
  const ticketId = Number(c.req.param('ticketId'));
  const { message, accessToken } = await c.req.json();
  if (!message || !accessToken) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'الرسالة ورمز الدخول مطلوبان.' } }, 400);
  const ticket = await new SupportService().getTicketByAccessToken(accessToken);
  if (!ticket || ticket.id !== ticketId || ticket.storeId !== store.id) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'التذكرة غير موجودة.' } }, 404);
  }
  const msg = await new SupportService().addMessage({
    ticketId, authorType: 'customer', authorId: null, message, isStaffReply: false,
  });
  await new SupportService().updateTicketStatus(ticketId, store.id, 'waiting_on_customer');
  return c.json({ success: true, data: msg });
});

storefrontRouter.get('/:slug/support/kb', async (c) => {
  const { store, error } = await resolveActiveStoreOrError(c);
  if (error) return error;
  const category = c.req.query('category') || undefined;
  const articles = await new SupportService().listArticles(store.id, { category, publishedOnly: true });
  const categories = await new SupportService().listCategories(store.id);
  return c.json({ success: true, data: { articles, categories } });
});

storefrontRouter.get('/:slug/support/kb/:articleSlug', async (c) => {
  const storeSlug = c.req.param('slug') as string;
  const articleSlug = c.req.param('articleSlug') as string;
  const store = await resolveStore(storeSlug);
  if (!store || store.status !== 'active' || !store.isActive) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'لم يتم العثور على المتجر.' } }, 404);
  }
  const article = await new SupportService().getArticleBySlug(articleSlug, store.id);
  if (!article || !article.isPublished) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'المقال غير موجود.' } }, 404);
  return c.json({ success: true, data: article });
});

export { storefrontRouter };
