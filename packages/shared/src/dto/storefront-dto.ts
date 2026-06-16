// Storefront DTOs — public-facing serializers
// Extracted from apps/api/src/routes/storefront.ts in Quality Pass 2 (Item 2.1)
//
// Purpose: Strip internal fields (cost, storeId, audit data) from DB rows
// before returning to public storefront / public API consumers.

type AnyRecord = Record<string, unknown>;

export function toPublicProduct(product: AnyRecord): AnyRecord {
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

export function toPublicProducts(products: AnyRecord[]): AnyRecord[] {
  return products.map(toPublicProduct);
}

export function toPublicStore(store: AnyRecord, contactChannels?: AnyRecord): AnyRecord {
  const { tenantId, createdAt, updatedAt, demoProfile, demoSeedVersion, ...rest } = store;
  return { ...rest, isDemo: store.isDemo ?? false, contactChannels };
}

export function toPublicOrder(order: AnyRecord): AnyRecord {
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

export function toPublicCart(cart: AnyRecord): AnyRecord {
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
      source: cartItem.source ?? 'storefront',
      variant: item.variant ?? null,
      product,
    };
  });
  return { ...cartRest, items };
}

export function toPublicCategory(category: AnyRecord): AnyRecord {
  const { storeId, tenantId, parentId, metaDescription, createdAt, updatedAt, ...rest } = category;
  return rest;
}

export function toPublicShippingMethod(method: AnyRecord): AnyRecord {
  const { storeId, providerAccountId, config, sortOrder, createdAt, updatedAt, ...rest } = method;
  return rest;
}

export function toPublicPolicy(policy: AnyRecord): AnyRecord {
  const { storeId, id, createdBy, updatedBy, createdAt, updatedAt, ...rest } = policy;
  return rest;
}
