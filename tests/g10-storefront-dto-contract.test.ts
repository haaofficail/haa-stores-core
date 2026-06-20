/**
 * G10 — Storefront API ↔ Frontend DTO Contract Tests
 *
 * Asserts that every toPublic* serializer in packages/shared/src/dto/storefront-dto.ts:
 *   1. Exposes every field the storefront TypeScript interfaces require
 *   2. Strips every internal field that must never reach the public client
 *   3. Applies the correct defaults for nullable/optional fields
 *
 * These are pure-function runtime tests — no DB, no HTTP.
 * They break immediately when a serializer change leaks or drops a field.
 */

import { describe, expect, it } from 'vitest';
import {
  toPublicCart,
  toPublicCategory,
  toPublicOrder,
  toPublicPolicy,
  toPublicProduct,
  toPublicShippingMethod,
  toPublicStore,
} from '../packages/shared/src/dto/storefront-dto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INTERNAL_PRODUCT_FIELDS = ['cost', 'createdAt', 'updatedAt', 'storeId', 'seoTitle', 'seoDescription', 'barcode'];
const INTERNAL_STORE_FIELDS = ['tenantId', 'createdAt', 'updatedAt', 'demoProfile', 'demoSeedVersion'];
const INTERNAL_CART_FIELDS = ['sessionToken', 'isAbandoned', 'expiresAt', 'createdAt', 'updatedAt'];
const INTERNAL_ORDER_FIELDS = ['id', 'storeId', 'checkoutSessionId', 'idempotencyKey', 'walletEntry', 'paymentIntentRaw', 'auditLogs', 'platformFee', 'customerId', 'createdAt', 'updatedAt', 'metadata'];
const INTERNAL_CATEGORY_FIELDS = ['storeId', 'tenantId', 'parentId', 'metaDescription', 'createdAt', 'updatedAt'];
const INTERNAL_SHIPPING_FIELDS = ['storeId', 'providerAccountId', 'config', 'sortOrder', 'createdAt', 'updatedAt'];
const INTERNAL_POLICY_FIELDS = ['storeId', 'id', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt'];

function assertStripped(obj: Record<string, unknown>, fields: string[]) {
  for (const f of fields) {
    expect(obj, `internal field "${f}" must be stripped`).not.toHaveProperty(f);
  }
}

// ─── Mock DB rows ─────────────────────────────────────────────────────────────

const mockProduct = {
  id: 1,
  name: 'Test Product',
  slug: 'test-product',
  description: 'A product',
  price: '99.00',
  compareAtPrice: null,
  images: [{ url: 'https://cdn.example.com/img.jpg', thumbUrl: 'https://cdn.example.com/img-thumb.jpg' }],
  status: 'active',
  type: 'simple',
  sku: 'SKU-001',
  stockQuantity: 10,
  trackInventory: true,
  offerEndDate: null,
  weightGrams: 500,
  lengthCm: '10.00',
  widthCm: '5.00',
  heightCm: '3.00',
  requiresShipping: true,
  isFragile: false,
  categoryId: 2,
  categoryName: 'Electronics',
  categorySlug: 'electronics',
  rating: null,
  reviewCount: 0,
  salesCount: 0,
  views: 0,
  options: [],
  variants: [],
  // internal — must be stripped
  cost: '40.00',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  storeId: 99,
  seoTitle: 'SEO Title',
  seoDescription: 'SEO Desc',
  barcode: '12345678',
};

const mockStore = {
  id: 1,
  name: 'Test Store',
  slug: 'test-store',
  description: 'A store',
  logoUrl: null,
  status: 'active',
  isActive: true,
  isDemo: false,
  email: 'store@example.com',
  phone: '+966500000000',
  // internal — must be stripped
  tenantId: 42,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  demoProfile: 'fashion',
  demoSeedVersion: 'v2',
};

const mockCartItem = {
  item: {
    id: 10,
    productId: 1,
    variantId: null,
    quantity: 2,
    unitPrice: '99.00',
    totalPrice: '198.00',
    notes: null,
    giftWrapSelected: false,
    giftWrapPrice: null,
    sendAsGift: false,
    giftMessage: null,
    source: 'storefront',
  },
  product: { ...mockProduct },
  variant: null,
};

const mockCart = {
  id: 'cart-uuid-1234',
  storeId: 1,
  items: [mockCartItem],
  subtotal: '198.00',
  itemCount: 2,
  // internal — must be stripped
  sessionToken: 'secret-token-xyz',
  isAbandoned: false,
  expiresAt: '2024-02-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockOrder = {
  orderNumber: 'ORD-001',
  status: 'pending',
  paymentStatus: 'pending',
  fulfillmentStatus: null,
  fulfillmentType: 'shipping',
  pickupLocationId: null,
  giftOptions: null,
  customerName: 'Ahmed Ali',
  customerPhone: '+966500000000',
  total: '198.00',
  subtotal: '198.00',
  shippingCost: '20.00',
  paymentMethod: 'cod',
  items: [
    {
      id: 5,
      orderId: 1,
      name: 'Test Product',
      sku: 'SKU-001',
      quantity: 2,
      unitPrice: '99.00',
      totalPrice: '198.00',
      notes: null,
      giftWrapSelected: false,
      giftWrapPrice: null,
      sendAsGift: false,
      giftMessage: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ],
  statusHistory: [{ id: 1, fromStatus: null, toStatus: 'pending', createdAt: '2024-01-01T00:00:00.000Z' }],
  // internal — must be stripped
  id: 99,
  storeId: 1,
  checkoutSessionId: 'sess-uuid',
  idempotencyKey: 'key-uuid',
  walletEntry: null,
  paymentIntentRaw: null,
  auditLogs: [],
  platformFee: '0.00',
  customerId: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  metadata: {},
  couponCode: null,
  couponDiscount: null,
  billingAddress: null,
  notes: 'internal notes',
  paidAmount: null,
  discount: null,
  customerEmail: 'customer@example.com',
};

const mockCategory = {
  id: 1,
  name: 'Electronics',
  slug: 'electronics',
  description: 'All electronics',
  imageUrl: null,
  sortOrder: 0,
  // internal — must be stripped
  storeId: 1,
  tenantId: 42,
  parentId: null,
  metaDescription: 'SEO meta',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockShippingMethod = {
  id: 1,
  name: 'Standard',
  type: 'flat_rate',
  estimatedDeliveryDays: '3-5',
  isActive: true,
  // internal — must be stripped
  storeId: 1,
  providerAccountId: null,
  config: {},
  sortOrder: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockPolicy = {
  type: 'privacy',
  title: 'Privacy Policy',
  content: 'We respect your privacy...',
  // internal — must be stripped
  storeId: 1,
  id: 3,
  createdBy: 1,
  updatedBy: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('G10 — toPublicProduct contract', () => {
  const result = toPublicProduct(mockProduct);

  it('exposes required storefront fields', () => {
    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('name', 'Test Product');
    expect(result).toHaveProperty('slug', 'test-product');
    expect(result).toHaveProperty('price', '99.00');
    expect(result).toHaveProperty('status', 'active');
    expect(result).toHaveProperty('type', 'simple');
    expect(result).toHaveProperty('stockQuantity', 10);
    expect(result).toHaveProperty('requiresShipping', true);
  });

  it('normalises images from object array to string array', () => {
    const images = result.images as string[];
    expect(Array.isArray(images)).toBe(true);
    expect(images[0]).toBe('https://cdn.example.com/img.jpg');
  });

  it('handles string image URLs unchanged', () => {
    const r = toPublicProduct({ ...mockProduct, images: ['https://cdn.example.com/direct.jpg'] });
    expect((r.images as string[])[0]).toBe('https://cdn.example.com/direct.jpg');
  });

  it('falls back to thumbUrl when url is missing', () => {
    const r = toPublicProduct({ ...mockProduct, images: [{ thumbUrl: 'https://cdn.example.com/thumb.jpg' }] });
    expect((r.images as string[])[0]).toBe('https://cdn.example.com/thumb.jpg');
  });

  it('defaults giftWrapAvailable to false when absent', () => {
    const r = toPublicProduct({ ...mockProduct, giftWrapAvailable: undefined });
    expect(r.giftWrapAvailable).toBe(false);
  });

  it('defaults giftWrapPriceOverride to null when absent', () => {
    const r = toPublicProduct({ ...mockProduct, giftWrapPriceOverride: undefined });
    expect(r.giftWrapPriceOverride).toBeNull();
  });

  it('strips all internal fields', () => {
    assertStripped(result as Record<string, unknown>, INTERNAL_PRODUCT_FIELDS);
  });
});

describe('G10 — toPublicStore contract', () => {
  const contactChannels = { email: 'store@example.com', whatsapp: { enabled: false, phoneE164: null, waMeLink: null, qrDataUrl: null } };
  const result = toPublicStore(mockStore, contactChannels as Record<string, unknown>);

  it('exposes required storefront fields', () => {
    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('name', 'Test Store');
    expect(result).toHaveProperty('slug', 'test-store');
    expect(result).toHaveProperty('status', 'active');
    expect(result).toHaveProperty('isActive', true);
  });

  it('passes contactChannels through', () => {
    expect(result).toHaveProperty('contactChannels');
    expect((result.contactChannels as any).email).toBe('store@example.com');
  });

  it('defaults isDemo to false when absent', () => {
    const r = toPublicStore({ ...mockStore, isDemo: undefined });
    expect(r.isDemo).toBe(false);
  });

  it('strips all internal fields', () => {
    assertStripped(result as Record<string, unknown>, INTERNAL_STORE_FIELDS);
  });
});

describe('G10 — toPublicCart contract', () => {
  const result = toPublicCart(mockCart);

  it('exposes required storefront fields', () => {
    expect(result).toHaveProperty('id', 'cart-uuid-1234');
    expect(result).toHaveProperty('storeId', 1);
    expect(result).toHaveProperty('subtotal', '198.00');
    expect(result).toHaveProperty('itemCount', 2);
  });

  it('normalises cart items to the correct shape', () => {
    const items = result.items as any[];
    expect(Array.isArray(items)).toBe(true);
    const item = items[0];
    expect(item).toHaveProperty('id', 10);
    expect(item).toHaveProperty('productId', 1);
    expect(item).toHaveProperty('quantity', 2);
    expect(item).toHaveProperty('unitPrice', '99.00');
    expect(item).toHaveProperty('totalPrice', '198.00');
    expect(item).toHaveProperty('source', 'storefront');
    expect(item).toHaveProperty('variant', null);
  });

  it('strips internal fields from cart items product', () => {
    const items = result.items as any[];
    const product = items[0].product;
    assertStripped(product, INTERNAL_PRODUCT_FIELDS);
  });

  it('applies cart item defaults (giftWrapSelected, sendAsGift)', () => {
    expect((result.items as any[])[0].giftWrapSelected).toBe(false);
    expect((result.items as any[])[0].sendAsGift).toBe(false);
  });

  it('strips all internal cart fields', () => {
    assertStripped(result as Record<string, unknown>, INTERNAL_CART_FIELDS);
  });

  it('handles null cart gracefully', () => {
    const r = toPublicCart(null as any);
    expect(r).toBeNull();
  });
});

describe('G10 — toPublicOrder contract', () => {
  const result = toPublicOrder(mockOrder);

  it('exposes required storefront fields', () => {
    expect(result).toHaveProperty('orderNumber', 'ORD-001');
    expect(result).toHaveProperty('status', 'pending');
    expect(result).toHaveProperty('paymentStatus', 'pending');
    expect(result).toHaveProperty('customerName', 'Ahmed Ali');
    expect(result).toHaveProperty('customerPhone', '+966500000000');
    expect(result).toHaveProperty('total', '198.00');
    expect(result).toHaveProperty('paymentMethod', 'cod');
  });

  it('defaults fulfillmentType to "shipping" when absent', () => {
    const r = toPublicOrder({ ...mockOrder, fulfillmentType: undefined });
    expect(r.fulfillmentType).toBe('shipping');
  });

  it('defaults pickupLocationId to null when absent', () => {
    const r = toPublicOrder({ ...mockOrder, pickupLocationId: undefined });
    expect(r.pickupLocationId).toBeNull();
  });

  it('strips internal orderId and createdAt from items', () => {
    const items = (result.items as any[]);
    expect(items[0]).not.toHaveProperty('orderId');
    expect(items[0]).not.toHaveProperty('createdAt');
    expect(items[0]).not.toHaveProperty('updatedAt');
  });

  it('preserves statusHistory array', () => {
    const history = result.statusHistory as any[];
    expect(Array.isArray(history)).toBe(true);
    expect(history[0]).toHaveProperty('toStatus', 'pending');
  });

  it('parses giftOptions from JSON string', () => {
    const r = toPublicOrder({ ...mockOrder, giftOptions: '{"sendAsGift":true,"message":"Happy Birthday"}' });
    expect((r.giftOptions as any).sendAsGift).toBe(true);
  });

  it('strips all internal order fields', () => {
    assertStripped(result as Record<string, unknown>, INTERNAL_ORDER_FIELDS);
  });
});

describe('G10 — toPublicCategory contract', () => {
  const result = toPublicCategory(mockCategory);

  it('exposes required storefront fields', () => {
    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('name', 'Electronics');
    expect(result).toHaveProperty('slug', 'electronics');
    expect(result).toHaveProperty('description', 'All electronics');
    expect(result).toHaveProperty('imageUrl', null);
  });

  it('strips all internal fields', () => {
    assertStripped(result as Record<string, unknown>, INTERNAL_CATEGORY_FIELDS);
  });
});

describe('G10 — toPublicShippingMethod contract', () => {
  const result = toPublicShippingMethod(mockShippingMethod);

  it('exposes required storefront fields', () => {
    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('name', 'Standard');
    expect(result).toHaveProperty('type', 'flat_rate');
    expect(result).toHaveProperty('isActive', true);
    expect(result).toHaveProperty('estimatedDeliveryDays', '3-5');
  });

  it('strips all internal fields', () => {
    assertStripped(result as Record<string, unknown>, INTERNAL_SHIPPING_FIELDS);
  });
});

describe('G10 — toPublicPolicy contract', () => {
  const result = toPublicPolicy(mockPolicy);

  it('exposes required storefront fields', () => {
    expect(result).toHaveProperty('type', 'privacy');
    expect(result).toHaveProperty('title', 'Privacy Policy');
    expect(result).toHaveProperty('content', 'We respect your privacy...');
  });

  it('strips all internal fields', () => {
    assertStripped(result as Record<string, unknown>, INTERNAL_POLICY_FIELDS);
  });
});
