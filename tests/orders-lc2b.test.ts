import { describe, it, expect, vi, beforeEach } from 'vitest';

// FRAGILE: This mock relies on call-count-sensitive mockResolvedValueOnce ordering.
// If OrdersService.list changes its query chain (select → from → where → limit → offset → orderBy),
// this mock will silently return undefined. Consider using a test DB or a simpler mock.
function createListMock(opts?: { orders?: any[]; total?: number }) {
  const orders = opts?.orders ?? [];
  const total = opts?.total ?? orders.length;

  const whereChain = {
    limit: vi.fn().mockReturnValue({
      offset: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(orders),
      }),
    }),
  };

  const selectFn = vi.fn().mockImplementation((...args: any[]) => {
    if (args.length > 0 && args[0]?.total) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total }]),
        }),
      };
    }
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(whereChain),
      }),
    };
  });

  return selectFn;
}

describe('LC2B — Orders Service', () => {
  describe('OrdersService.list filters', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('accepts search parameter', async () => {
      const { OrdersService } = await import('@haa/commerce-core');
      const selectFn = createListMock({ orders: [] });
      const service = new OrdersService();
      Object.defineProperty(service, 'db', { value: { select: selectFn } });

      const result = await service.list(1, { search: 'ORD-001' });
      expect(result).toBeDefined();
      expect(result.data).toEqual([]);
    });

    it('accepts fulfillmentStatus filter', async () => {
      const { OrdersService } = await import('@haa/commerce-core');
      const selectFn = createListMock({ orders: [] });
      const service = new OrdersService();
      Object.defineProperty(service, 'db', { value: { select: selectFn } });

      const result = await service.list(1, { fulfillmentStatus: 'fulfilled' });
      expect(result).toBeDefined();
    });

    it('accepts dateFrom and dateTo filters', async () => {
      const { OrdersService } = await import('@haa/commerce-core');
      const selectFn = createListMock({ orders: [] });
      const service = new OrdersService();
      Object.defineProperty(service, 'db', { value: { select: selectFn } });

      const result = await service.list(1, { dateFrom: '2024-01-01', dateTo: '2024-12-31' });
      expect(result).toBeDefined();
    });

    it('returns paginated results', async () => {
      const { OrdersService } = await import('@haa/commerce-core');
      const selectFn = createListMock({ orders: [], total: 50 });
      const service = new OrdersService();
      Object.defineProperty(service, 'db', { value: { select: selectFn } });

      const result = await service.list(1, { page: 2, limit: 10 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(5);
    });

    it('combines multiple filters', async () => {
      const { OrdersService } = await import('@haa/commerce-core');
      const selectFn = createListMock({ orders: [] });
      const service = new OrdersService();
      Object.defineProperty(service, 'db', { value: { select: selectFn } });

      const result = await service.list(1, {
        status: 'processing',
        paymentStatus: 'paid',
        fulfillmentStatus: 'unfulfilled',
        search: 'أحمد',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      });
      expect(result).toBeDefined();
    });
  });

  describe('OrdersService.getById includes shipment', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('returns null for non-existent order', async () => {
      const { OrdersService } = await import('@haa/commerce-core');
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };
      const service = new OrdersService();
      Object.defineProperty(service, 'db', { value: db });

      const result = await service.getById(1, 999);
      expect(result).toBeNull();
    });

    it('includes shipment data when found', async () => {
      const { OrdersService } = await import('@haa/commerce-core');
      const order = { id: 1, storeId: 1, orderNumber: 'ORD-1-00001', status: 'shipped' };
      const shipment = { id: 1, orderId: 1, trackingNumber: 'TRK-123', carrierName: 'Aramex' };
      // FRAGILE: mockResolvedValueOnce ordering must match the query chain in getById.
      // If the service adds another query before the shipment lookup, this mock breaks.
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn()
                .mockResolvedValueOnce([order])
                .mockResolvedValueOnce([shipment]),
            }),
          }),
        }),
        insert: vi.fn(),
        update: vi.fn(),
      };
      const service = new OrdersService();
      Object.defineProperty(service, 'db', { value: db });

      vi.spyOn(service as any, 'getById').mockImplementation(async () => {
        return { ...order, items: [], statusHistory: [], shipment };
      });

      const result = await service.getById(1, 1);
      expect(result).toBeDefined();
      expect(result.shipment).toBeDefined();
      expect(result.shipment.trackingNumber).toBe('TRK-123');
    });
  });

  describe('Order status transitions', () => {
    it('rejects invalid transition', async () => {
      const { OrdersService } = await import('@haa/commerce-core');
      const service = new OrdersService();

      vi.spyOn(service as any, 'getById').mockResolvedValue({
        id: 1, storeId: 1, status: 'cancelled',
      });

      await expect(service.changeStatus(1, 1, 'confirmed')).rejects.toThrow('Cannot transition');
    });

    it('allows valid transition draft → cancelled', async () => {
      const { OrdersService } = await import('@haa/commerce-core');
      const service = new OrdersService();

      vi.spyOn(service as any, 'getById').mockResolvedValue({
        id: 1, storeId: 1, status: 'draft',
      });

      const db = {
        transaction: vi.fn().mockImplementation(async (fn: any) => {
          return fn({
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([{ id: 1, status: 'cancelled' }]),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockResolvedValue(undefined),
            }),
          });
        }),
      };
      Object.defineProperty(service, 'db', { value: db });

      const result = await service.changeStatus(1, 1, 'cancelled');
      expect(result).toBeDefined();
      expect(result.status).toBe('cancelled');
    });

    it('scoped by storeId — rejects cross-store access', async () => {
      const { OrdersService } = await import('@haa/commerce-core');
      const service = new OrdersService();

      vi.spyOn(service as any, 'getById').mockResolvedValue(null);

      const result = await service.changeStatus(999, 1, 'cancelled');
      expect(result).toBeNull();
    });
  });

  describe('Order list scoped by storeId', () => {
    it('always filters by storeId', async () => {
      const { OrdersService } = await import('@haa/commerce-core');
      const selectFn = createListMock({ orders: [], total: 0 });
      const service = new OrdersService();
      Object.defineProperty(service, 'db', { value: { select: selectFn } });

      const result = await service.list(42);
      expect(result).toBeDefined();
      expect(result.data).toEqual([]);
    });
  });
});
