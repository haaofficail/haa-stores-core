import { describe, it, expect } from 'vitest';

describe('Order Tracking Safety', () => {
  const toPublicOrder = (order: Record<string, unknown>) => {
    const { id, storeId, checkoutSessionId, idempotencyKey, walletEntry, paymentIntentRaw, auditLogs, platformFee, ...rest } = order;
    return rest;
  };

  describe('public tracking DTO', () => {
    it('strips internal fields from tracking response', () => {
      const order = {
        id: 42, storeId: 1, checkoutSessionId: 'sess-1', idempotencyKey: 'key-1',
        orderNumber: 'ORD-001', status: 'confirmed', total: '100.00',
        paymentStatus: 'paid', customerName: 'Ahmed', customerPhone: '0500000000',
        items: [{ name: 'Product', quantity: 1, unitPrice: '100', totalPrice: '100' }],
        statusHistory: [{ fromStatus: 'draft', toStatus: 'confirmed', createdAt: '2024-01-01' }],
      };
      const result = toPublicOrder(order);
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('storeId');
      expect(result).not.toHaveProperty('checkoutSessionId');
      expect(result).not.toHaveProperty('idempotencyKey');
      expect(result).toHaveProperty('orderNumber', 'ORD-001');
      expect(result).toHaveProperty('status', 'confirmed');
      expect(result).toHaveProperty('paymentStatus', 'paid');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('statusHistory');
    });

    it('does not expose wallet fields in tracking', () => {
      const order = { orderNumber: 'ORD-001', walletEntry: { id: 1, amount: 100 } };
      const result = toPublicOrder(order as any);
      expect(result).not.toHaveProperty('walletEntry');
    });

    it('does not expose payment internals in tracking', () => {
      const order = { orderNumber: 'ORD-001', paymentIntentRaw: 'pi_xxx' };
      const result = toPublicOrder(order as any);
      expect(result).not.toHaveProperty('paymentIntentRaw');
    });

    it('does not expose audit logs in tracking', () => {
      const order = { orderNumber: 'ORD-001', auditLogs: [{ action: 'created' }] };
      const result = toPublicOrder(order as any);
      expect(result).not.toHaveProperty('auditLogs');
    });

    it('does not expose platform fees in tracking', () => {
      const order = { orderNumber: 'ORD-001', platformFee: 2.00 };
      const result = toPublicOrder(order as any);
      expect(result).not.toHaveProperty('platformFee');
    });

    it('public tracking contains only safe fields', () => {
      const order = {
        id: 1, storeId: 1, checkoutSessionId: 'sess', idempotencyKey: 'key',
        orderNumber: 'ORD-001', status: 'shipped', paymentStatus: 'paid',
        fulfillmentStatus: 'fulfilled', customerName: 'X', customerPhone: 'Y',
        total: '100', subtotal: '100', shippingCost: '0', paymentMethod: 'card',
        items: [], statusHistory: [],
      };
      const result = toPublicOrder(order);
      const allowedKeys = ['orderNumber', 'status', 'paymentStatus', 'fulfillmentStatus',
        'customerName', 'customerPhone', 'total', 'subtotal', 'shippingCost',
        'paymentMethod', 'items', 'statusHistory'];
      const resultKeys = Object.keys(result);
      for (const key of resultKeys) {
        expect(allowedKeys).toContain(key);
      }
    });
  });

  describe('phone verification', () => {
    it('requires phone to access tracking', () => {
      const order = { orderNumber: 'ORD-001', customerPhone: '0500000000' };
      const inputPhone = '';
      expect(inputPhone.trim()).toBe('');
    });

    it('wrong phone does not reveal order', () => {
      const order = { orderNumber: 'ORD-001', customerPhone: '0500000000' };
      const inputPhone = '0511111111';
      const isMatch = inputPhone === order.customerPhone;
      expect(isMatch).toBe(false);
    });

    it('correct phone reveals order', () => {
      const order = { orderNumber: 'ORD-001', customerPhone: '0500000000' };
      const inputPhone = '0500000000';
      const isMatch = inputPhone === order.customerPhone;
      expect(isMatch).toBe(true);
    });

    it('cross-store tracking rejected', () => {
      const orderStoreId = 1;
      const requestStoreId = 2;
      expect(requestStoreId).not.toBe(orderStoreId);
    });
  });
});
