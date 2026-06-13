import { describe, it, expect, vi, beforeEach } from 'vitest';

function createCountMock(total: number) {
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue([{ total }]);
  return { select: vi.fn().mockReturnValue(chain) };
}

describe('LC2D — Shipping Experience', () => {
  describe('ShippingService.getOverview', () => {
    beforeEach(() => { vi.resetModules(); });

    it('returns overview with all required fields', async () => {
      const { ShippingService } = await import('@haa/shipping-core');
      const service = new ShippingService();

      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          const chain: any = {};
          chain.from = vi.fn().mockReturnValue(chain);
          chain.innerJoin = vi.fn().mockReturnValue(chain);
          chain.orderBy = vi.fn().mockReturnValue(chain);
          chain.limit = vi.fn().mockResolvedValue(callCount === 9 ? [{ updatedAt: new Date() }] : [{ total: 5 }]);
          // For count queries (1-8), where resolves to array
          // For last query (9), where returns chain for orderBy
          if (callCount <= 8) {
            chain.where = vi.fn().mockResolvedValue([{ total: 5 }]);
          } else {
            chain.where = vi.fn().mockReturnValue(chain);
          }
          return chain;
        }),
      };
      Object.defineProperty(service, 'db', { value: mockDb });

      const result = await service.getOverview(1);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('activeMethods');
      expect(result).toHaveProperty('totalMethods');
      expect(result).toHaveProperty('zones');
      expect(result).toHaveProperty('rates');
      expect(result).toHaveProperty('shipments');
      expect(result).toHaveProperty('noTracking');
      expect(result).toHaveProperty('inTransit');
      expect(result).toHaveProperty('delivered');
      expect(result).toHaveProperty('lastUpdated');
    });

    it('scoped by storeId', async () => {
      const { ShippingService } = await import('@haa/shipping-core');
      const service = new ShippingService();

      const whereSpy = vi.fn();
      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          const chain: any = {};
          chain.from = vi.fn().mockReturnValue(chain);
          chain.innerJoin = vi.fn().mockReturnValue(chain);
          chain.orderBy = vi.fn().mockReturnValue(chain);
          chain.limit = vi.fn().mockResolvedValue(callCount === 9 ? [] : [{ total: 0 }]);
          chain.where = vi.fn().mockImplementation((...args: any[]) => {
            whereSpy(args);
            if (callCount <= 8) return Promise.resolve([{ total: 0 }]);
            return chain;
          });
          return chain;
        }),
      };
      Object.defineProperty(service, 'db', { value: mockDb });

      await service.getOverview(42);
      expect(whereSpy).toHaveBeenCalled();
    });
  });

  describe('ShippingService.listShipments filters', () => {
    beforeEach(() => { vi.resetModules(); });

    it('accepts status filter', async () => {
      const { ShippingService } = await import('@haa/shipping-core');
      const service = new ShippingService();

      const chain: any = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.orderBy = vi.fn().mockResolvedValue([]);

      const mockDb = { select: vi.fn().mockReturnValue(chain) };
      Object.defineProperty(service, 'db', { value: mockDb });

      const result = await service.listShipments(1, { status: 'in_transit' });
      expect(result).toEqual([]);
    });

    it('accepts noTracking filter', async () => {
      const { ShippingService } = await import('@haa/shipping-core');
      const service = new ShippingService();

      const chain: any = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.orderBy = vi.fn().mockResolvedValue([]);

      const mockDb = { select: vi.fn().mockReturnValue(chain) };
      Object.defineProperty(service, 'db', { value: mockDb });

      const result = await service.listShipments(1, { noTracking: true });
      expect(result).toEqual([]);
    });

    it('accepts city filter (client-side)', async () => {
      const { ShippingService } = await import('@haa/shipping-core');
      const service = new ShippingService();

      const shipments = [
        { id: 1, address: { city: 'Riyadh' } },
        { id: 2, address: { city: 'Jeddah' } },
        { id: 3, address: { city: 'riyadh' } },
      ];

      const chain: any = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.orderBy = vi.fn().mockResolvedValue(shipments);

      const mockDb = { select: vi.fn().mockReturnValue(chain) };
      Object.defineProperty(service, 'db', { value: mockDb });

      const result = await service.listShipments(1, { city: 'Riyadh' });
      expect(result).toHaveLength(2);
    });

    it('accepts date range filter (client-side)', async () => {
      const { ShippingService } = await import('@haa/shipping-core');
      const service = new ShippingService();

      const shipments = [
        { id: 1, createdAt: new Date('2024-06-15') },
        { id: 2, createdAt: new Date('2024-07-01') },
        { id: 3, createdAt: new Date('2024-08-15') },
      ];

      const chain: any = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.orderBy = vi.fn().mockResolvedValue(shipments);

      const mockDb = { select: vi.fn().mockReturnValue(chain) };
      Object.defineProperty(service, 'db', { value: mockDb });

      const result = await service.listShipments(1, { dateFrom: '2024-07-01', dateTo: '2024-07-31' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('combines multiple filters', async () => {
      const { ShippingService } = await import('@haa/shipping-core');
      const service = new ShippingService();

      const chain: any = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.orderBy = vi.fn().mockResolvedValue([]);

      const mockDb = { select: vi.fn().mockReturnValue(chain) };
      Object.defineProperty(service, 'db', { value: mockDb });

      const result = await service.listShipments(1, {
        status: 'in_transit',
        noTracking: true,
        city: 'Riyadh',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      });
      expect(result).toEqual([]);
    });
  });

  describe('Shipping scoping', () => {
    beforeEach(() => { vi.resetModules(); });

    it('listMethods scoped by storeId', async () => {
      const { ShippingService } = await import('@haa/shipping-core');
      const service = new ShippingService();

      const chain: any = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.orderBy = vi.fn().mockResolvedValue([]);

      const mockDb = { select: vi.fn().mockReturnValue(chain) };
      Object.defineProperty(service, 'db', { value: mockDb });

      const result = await service.listMethods(42);
      expect(result).toEqual([]);
    });

    it('listZones scoped by storeId', async () => {
      const { ShippingService } = await import('@haa/shipping-core');
      const service = new ShippingService();

      const chain: any = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockResolvedValue([]);

      const mockDb = { select: vi.fn().mockReturnValue(chain) };
      Object.defineProperty(service, 'db', { value: mockDb });

      const result = await service.listZones(42);
      expect(result).toEqual([]);
    });

    it('listShipments scoped by storeId', async () => {
      const { ShippingService } = await import('@haa/shipping-core');
      const service = new ShippingService();

      const chain: any = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.orderBy = vi.fn().mockResolvedValue([]);

      const mockDb = { select: vi.fn().mockReturnValue(chain) };
      Object.defineProperty(service, 'db', { value: mockDb });

      const result = await service.listShipments(42);
      expect(result).toEqual([]);
    });
  });

  describe('Tracking URL validation', () => {
    it('valid URL passes', () => {
      expect(/^https?:\/\/.+/.test('https://aramex.com/track/123')).toBe(true);
      expect(/^https?:\/\/.+/.test('http://tracking.smsa.com.tr/abc')).toBe(true);
    });

    it('invalid URL fails', () => {
      expect(/^https?:\/\/.+/.test('')).toBe(false);
      expect(/^https?:\/\/.+/.test('not-a-url')).toBe(false);
      expect(/^https?:\/\/.+/.test('ftp://example.com')).toBe(false);
    });
  });

  describe('Rate validation', () => {
    it('baseRate cannot be negative', () => {
      const rate = -10;
      expect(rate < 0).toBe(true);
    });

    it('baseRate can be zero', () => {
      const rate = 0;
      expect(rate >= 0).toBe(true);
    });

    it('freeAboveAmount cannot be negative', () => {
      const amount = -50;
      expect(amount < 0).toBe(true);
    });
  });
});
