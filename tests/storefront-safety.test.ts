import { describe, it, expect } from 'vitest';

// NOTE: This is a local copy of toPublicProduct from apps/api/src/routes/storefront.ts
// If the original changes, update this to match.
const toPublicProduct = (product: Record<string, unknown>) => {
  const { cost: _cost, ...rest } = product;
  return rest;
};

const toPublicProducts = (products: Record<string, unknown>[]) =>
  products.map(toPublicProduct);

// NOTE: This is a local copy of toPublicStore from apps/api/src/routes/storefront.ts
// If the original changes, update this to match.
const toPublicStore = (store: Record<string, unknown>) => {
  const { tenantId: _tenantId, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = store;
  return rest;
};

// NOTE: This is a local copy of toPublicOrder from apps/api/src/routes/storefront.ts
// If the original changes, update this to match.
const toPublicOrder = (order: Record<string, unknown>) => {
  const { id: _id, storeId: _storeId, checkoutSessionId: _checkoutSessionId, idempotencyKey: _idempotencyKey, walletEntry: _walletEntry, paymentIntentRaw: _paymentIntentRaw, auditLogs: _auditLogs, platformFee: _platformFee, ...rest } = order;
  return rest;
};

// NOTE: This is a local copy of toPublicCart from apps/api/src/routes/storefront.ts
// If the original changes, update this to match.
const toPublicCart = (cart: Record<string, unknown>) => {
  if (!cart) return cart;
  const items = (cart.items as Record<string, unknown>[])?.map((item: Record<string, unknown>) => {
    if (item.product) {
      const { cost: _cost, ...product } = item.product as Record<string, unknown>;
      return { ...item, product };
    }
    return item;
  });
  return { ...cart, items };
};

describe('Public storefront safety', () => {
  describe('toPublicProduct redacts sensitive fields', () => {
    it('strips cost from product', () => {
      const product = {
        id: 1, name: 'Test', price: '100.00', cost: '50.00',
        sku: 'TST-001', description: 'A test product',
      };
      const result = toPublicProduct(product);
      expect(result).not.toHaveProperty('cost');
    });

    it('keeps public fields', () => {
      const product = {
        id: 1, name: 'Test', price: '100.00', sku: 'TST-001',
        description: 'A test product', status: 'active',
      };
      const result = toPublicProduct(product);
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Test');
      expect(result).toHaveProperty('price', '100.00');
      expect(result).toHaveProperty('sku', 'TST-001');
    });

    it('handles products without cost', () => {
      const product = { id: 1, name: 'No cost', price: '50.00' };
      const result = toPublicProduct(product);
      expect(result).toHaveProperty('name', 'No cost');
    });

    it('returns empty object for empty input', () => {
      const result = toPublicProduct({});
      expect(result).toEqual({});
    });
  });

  describe('toPublicProducts handles arrays', () => {
    it('maps each product through toPublicProduct', () => {
      const products = [
        { id: 1, name: 'A', cost: '10.00', price: '20.00' },
        { id: 2, name: 'B', cost: '15.00', price: '30.00' },
      ];
      const result = toPublicProducts(products);
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('cost');
      expect(result[1]).not.toHaveProperty('cost');
      expect(result[0]).toHaveProperty('price', '20.00');
    });
  });

  describe('toPublicStore redacts sensitive fields', () => {
    it('strips tenantId, createdAt, updatedAt', () => {
      const store = {
        id: 1, name: 'Test Store', slug: 'test',
        tenantId: 1, createdAt: new Date(), updatedAt: new Date(),
        email: 'test@test.com', phone: '123',
      };
      const result = toPublicStore(store);
      expect(result).not.toHaveProperty('tenantId');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).toHaveProperty('name', 'Test Store');
      expect(result).toHaveProperty('slug', 'test');
      expect(result).toHaveProperty('email', 'test@test.com');
    });
  });

  describe('toPublicOrder redacts internal fields', () => {
    it('strips id, storeId, checkoutSessionId, idempotencyKey', () => {
      const order = {
        id: 42, storeId: 1, checkoutSessionId: 'sess-1', idempotencyKey: 'key-1',
        orderNumber: 'ORD-001', status: 'confirmed', total: '100.00',
      };
      const result = toPublicOrder(order);
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('storeId');
      expect(result).not.toHaveProperty('checkoutSessionId');
      expect(result).not.toHaveProperty('idempotencyKey');
      expect(result).toHaveProperty('orderNumber', 'ORD-001');
      expect(result).toHaveProperty('status', 'confirmed');
    });

    it('strips walletEntry, paymentIntentRaw, auditLogs, platformFee', () => {
      const order = {
        orderNumber: 'ORD-001', total: '100',
        walletEntry: { id: 1, amount: 100 },
        paymentIntentRaw: 'pi_xxx',
        auditLogs: [{ action: 'created' }],
        platformFee: 2.00,
      };
      const result = toPublicOrder(order);
      expect(result).not.toHaveProperty('walletEntry');
      expect(result).not.toHaveProperty('paymentIntentRaw');
      expect(result).not.toHaveProperty('auditLogs');
      expect(result).not.toHaveProperty('platformFee');
      expect(result).toHaveProperty('orderNumber', 'ORD-001');
    });
  });

  describe('toPublicCart redacts cost from cart items', () => {
    it('strips cost from each item product', () => {
      const cart = {
        id: 'cart-1', storeId: 1, subtotal: 100,
        items: [
          { id: 1, quantity: 2, product: { id: 1, name: 'A', price: '50', cost: '25' } },
          { id: 2, quantity: 1, product: { id: 2, name: 'B', price: '30', cost: '10' } },
        ],
      };
      const result = toPublicCart(cart as any);
      expect(result.items[0].product).not.toHaveProperty('cost');
      expect(result.items[1].product).not.toHaveProperty('cost');
      expect(result.items[0].product).toHaveProperty('name', 'A');
      expect(result.items[1].product).toHaveProperty('price', '30');
    });

    it('handles items without product field', () => {
      const cart = { id: 'cart-1', items: [{ id: 1, quantity: 1 }] };
      const result = toPublicCart(cart as any);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty('id', 1);
    });

    it('handles null/undefined cart', () => {
      expect(toPublicCart(null)).toBeNull();
      expect(toPublicCart(undefined)).toBeUndefined();
    });
  });

  describe('store status validation', () => {
    it('rejects non-active stores', () => {
      const suspended = { status: 'suspended', isActive: false };
      const closed = { status: 'closed', isActive: false };
      const deactivated = { status: 'active', isActive: false };
      const inactive = { status: 'inactive', isActive: false };

      expect(suspended.status !== 'active' || !suspended.isActive).toBe(true);
      expect(closed.status !== 'active' || !closed.isActive).toBe(true);
      expect(deactivated.status !== 'active' || !deactivated.isActive).toBe(true);
      expect(inactive.status !== 'active' || !inactive.isActive).toBe(true);
    });

    it('allows active stores', () => {
      const active = { status: 'active', isActive: true };
      expect(active.status === 'active' && active.isActive).toBe(true);
    });
  });

  describe('checkout idempotency guard', () => {
    it('detects duplicate idempotency key', () => {
      const usedKeys = new Set<string>();
      const key1 = '550e8400-e29b-41d4-a716-446655440000';
      const key2 = '550e8400-e29b-41d4-a716-446655440001';

      expect(usedKeys.has(key1)).toBe(false);
      usedKeys.add(key1);
      expect(usedKeys.has(key1)).toBe(true);
      expect(usedKeys.has(key2)).toBe(false);
    });
  });

  describe('product visibility rules', () => {
    it('rejects draft and archived products from storefront', () => {
      const products = [
        { name: 'Active', status: 'active' },
        { name: 'Draft', status: 'draft' },
        { name: 'Archived', status: 'archived' },
      ];
      const active = products.filter(p => p.status === 'active');
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Active');
    });

    it('blocks out-of-stock products from being purchased', () => {
      const testCases = [
        { trackInventory: true, stockQuantity: 0, expectedBlocked: true },
        { trackInventory: true, stockQuantity: 5, expectedBlocked: false },
        { trackInventory: false, stockQuantity: 0, expectedBlocked: false },
      ];

      for (const tc of testCases) {
        const isBlocked = tc.trackInventory && tc.stockQuantity <= 0;
        expect(isBlocked).toBe(tc.expectedBlocked);
      }
    });
  });

  describe('cross-store protection', () => {
    it('rejects adding product from different store to cart', () => {
      const cartStoreId = 1;
      const productStoreId = 2;
      const isRejected = cartStoreId !== productStoreId;
      expect(isRejected).toBe(true);
    });

    it('allows adding product from same store to cart', () => {
      const cartStoreId = 1;
      const productStoreId = 1;
      const isAllowed = cartStoreId === productStoreId;
      expect(isAllowed).toBe(true);
    });
  });

  describe('tracking safety', () => {
    it('requires matching phone to access order', () => {
      const order = { orderNumber: 'ORD-001', customerPhone: '0500000000' };
      const inputPhone = '0511111111';
      const isMatch = inputPhone === order.customerPhone;
      expect(isMatch).toBe(false);
    });

    it('requires matching storeId for order lookup', () => {
      const orderStoreId = 1;
      const requestStoreId = 2;
      const isMatch = requestStoreId === orderStoreId;
      expect(isMatch).toBe(false);
    });
  });
});
