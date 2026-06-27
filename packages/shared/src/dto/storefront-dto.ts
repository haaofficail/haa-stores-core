// Storefront DTOs — public-facing serializers
// Extracted from apps/api/src/routes/storefront.ts in Quality Pass 2 (Item 2.1)
//
// Purpose: Strip internal fields (cost, storeId, audit data) from DB rows
// before returning to public storefront / public API consumers.

import { sanitizeGiftMessage } from '../gift-message.js';

type AnyRecord = Record<string, unknown>;

export function toPublicProduct(product: AnyRecord): AnyRecord {
  const { cost: _cost, images, createdAt: _createdAt, updatedAt: _updatedAt, storeId: _storeId, seoTitle: _seoTitle, seoDescription: _seoDescription, barcode: _barcode, ...rest } = product;
  const imageUrls: string[] = Array.isArray(images)
    ? images.map((img: unknown) => {
        if (typeof img === 'string') return img;
        if (!img || typeof img !== 'object') return '';
        const image = img as { url?: unknown; thumbUrl?: unknown };
        return typeof image.url === 'string'
          ? image.url
          : typeof image.thumbUrl === 'string'
            ? image.thumbUrl
            : '';
      }).filter(Boolean)
    : [];
  return {
    ...rest,
    images: imageUrls,
    giftWrapAvailable: product.giftWrapAvailable ?? false,
    giftWrapPriceOverride: product.giftWrapPriceOverride ?? null,
  };
}

export function toPublicProducts(products: AnyRecord[]): AnyRecord[] {
  return products.map(toPublicProduct);
}

export function toPublicStore(store: AnyRecord, contactChannels?: AnyRecord): AnyRecord {
  const { tenantId: _tenantId, createdAt: _createdAt, updatedAt: _updatedAt, demoProfile: _demoProfile, demoSeedVersion: _demoSeedVersion, ...rest } = store;
  return { ...rest, isDemo: store.isDemo ?? false, contactChannels };
}

export function toPublicOrder(order: AnyRecord): AnyRecord {
  const { id: _id, storeId: _storeId, checkoutSessionId: _checkoutSessionId, idempotencyKey: _idempotencyKey, walletEntry: _walletEntry, paymentIntentRaw: _paymentIntentRaw, auditLogs: _auditLogs, platformFee: _platformFee, customerId: _customerId, createdAt: _createdAt, updatedAt: _updatedAt, metadata: _metadata, couponCode: _couponCode, couponDiscount: _couponDiscount, billingAddress: _billingAddress, notes: _notes, paidAmount: _paidAmount, discount: _discount, customerEmail: _customerEmail, ...rest } = order;
  const items = (rest.items as AnyRecord[])?.map((item: AnyRecord) => {
    const { id: _id, orderId: _orderId, createdAt: _createdAt, updatedAt: _updatedAt, ...itemRest } = item;
    return {
      ...itemRest,
      giftWrapSelected: item.giftWrapSelected ?? false,
      sendAsGift: item.sendAsGift ?? false,
      giftMessage: sanitizeGiftMessage(item.giftMessage),
    };
  }) ?? rest.items;
  const giftOpts = order.giftOptions ? (typeof order.giftOptions === 'string' ? JSON.parse(order.giftOptions) : order.giftOptions) as AnyRecord : null;
  const publicGiftOptions = giftOpts
    ? {
        ...giftOpts,
        message: sanitizeGiftMessage(giftOpts.message),
      }
    : null;
  return {
    ...rest, items,
    fulfillmentType: order.fulfillmentType ?? 'shipping',
    pickupLocationId: order.pickupLocationId ?? null,
    giftOptions: publicGiftOptions,
  };
}

export function toPublicCart(cart: AnyRecord): AnyRecord {
  if (!cart) return cart;
  const { sessionToken: _sessionToken, isAbandoned: _isAbandoned, expiresAt: _expiresAt, createdAt: _createdAt, updatedAt: _updatedAt, ...cartRest } = cart;
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
      giftMessage: sanitizeGiftMessage(cartItem.giftMessage),
      source: cartItem.source ?? 'storefront',
      variant: item.variant ?? null,
      product,
    };
  });
  return { ...cartRest, items };
}

export function toPublicCategory(category: AnyRecord): AnyRecord {
  const { storeId: _storeId, tenantId: _tenantId, parentId: _parentId, metaDescription: _metaDescription, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = category;
  return rest;
}

export function toPublicShippingMethod(method: AnyRecord): AnyRecord {
  const { storeId: _storeId, providerAccountId: _providerAccountId, config: _config, sortOrder: _sortOrder, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = method;
  return rest;
}

export function toPublicPolicy(policy: AnyRecord): AnyRecord {
  const { storeId: _storeId, id: _id, createdBy: _createdBy, updatedBy: _updatedBy, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = policy;
  return rest;
}
