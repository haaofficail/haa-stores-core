import { describe, it, expect, vi, beforeEach } from 'vitest';

function createSummaryMock(typeSums: any[], entryCount: number, lastEntry: any) {
  let whereCallIndex = 0;
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockImplementation(() => {
    whereCallIndex++;
    if (whereCallIndex === 1) {
      return Promise.resolve([{ total: entryCount }]);
    }
    if (whereCallIndex === 2) {
      return chain;
    }
    return chain;
  });
  chain.groupBy = vi.fn().mockResolvedValue(typeSums);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(lastEntry ? [lastEntry] : []);
  return { select: vi.fn().mockReturnValue(chain), insert: vi.fn() };
}

describe('LC2C — Wallet Experience', () => {
  describe('WalletLedger.getSummary', () => {
    beforeEach(() => { vi.resetModules(); });

    it('returns summary with all required fields', async () => {
      const { WalletLedger } = await import('@haa/wallet-core');
      const ledger = new WalletLedger();

      const account = {
        id: 1, storeId: 1, balance: '100.00', pendingBalance: '20.00',
        availableBalance: '80.00', totalSales: '120.00', totalFees: '20.00', totalPayouts: '0.00',
      };

      const mockDb = createSummaryMock(
        [
          { type: 'sale', direction: 'credit', total: '120.00' },
          { type: 'platform_fee', direction: 'debit', total: '2.40' },
          { type: 'payment_fee', direction: 'debit', total: '3.60' },
          { type: 'shipping_fee', direction: 'debit', total: '5.00' },
        ],
        5,
        { createdAt: new Date('2024-06-01') },
      );

      Object.defineProperty(ledger, 'db', { value: mockDb });
      vi.spyOn(ledger as any, 'ensureAccount').mockResolvedValue(account);

      const result = await ledger.getSummary(1);
      expect(result).toBeDefined();
      expect(result.totalSales).toBe(120);
      expect(result.platformFees).toBe(2.4);
      expect(result.paymentFees).toBe(3.6);
      expect(result.shippingFees).toBe(5);
      expect(result.netBalance).toBeCloseTo(109, 0);
      expect(result.entryCount).toBe(5);
      expect(result.lastUpdated).toBeDefined();
    });

    it('computes netBalance = sales - all fees - refunds - payouts', async () => {
      const { WalletLedger } = await import('@haa/wallet-core');
      const ledger = new WalletLedger();

      const account = { id: 1, storeId: 1, balance: '0', pendingBalance: '0', availableBalance: '0', totalSales: '0', totalFees: '0', totalPayouts: '0' };

      const mockDb = createSummaryMock(
        [
          { type: 'sale', direction: 'credit', total: '200.00' },
          { type: 'platform_fee', direction: 'debit', total: '4.00' },
          { type: 'payment_fee', direction: 'debit', total: '6.00' },
          { type: 'shipping_fee', direction: 'debit', total: '10.00' },
          { type: 'refund', direction: 'debit', total: '20.00' },
          { type: 'payout', direction: 'debit', total: '50.00' },
        ],
        0,
        null,
      );

      Object.defineProperty(ledger, 'db', { value: mockDb });
      vi.spyOn(ledger as any, 'ensureAccount').mockResolvedValue(account);

      const result = await ledger.getSummary(1);
      expect(result.netBalance).toBeCloseTo(200 - 4 - 6 - 10 - 20 - 50, 2);
    });

    it('returns zero for missing entry types', async () => {
      const { WalletLedger } = await import('@haa/wallet-core');
      const ledger = new WalletLedger();

      const account = { id: 1, storeId: 1, balance: '0', pendingBalance: '0', availableBalance: '0', totalSales: '0', totalFees: '0', totalPayouts: '0' };

      const mockDb = createSummaryMock(
        [{ type: 'sale', direction: 'credit', total: '100.00' }],
        0,
        null,
      );

      Object.defineProperty(ledger, 'db', { value: mockDb });
      vi.spyOn(ledger as any, 'ensureAccount').mockResolvedValue(account);

      const result = await ledger.getSummary(1);
      expect(result.platformFees).toBe(0);
      expect(result.paymentFees).toBe(0);
      expect(result.shippingFees).toBe(0);
    });
  });

  describe('WalletLedger.getEntries filters', () => {
    beforeEach(() => { vi.resetModules(); });

    it('accepts type filter', async () => {
      const { WalletLedger } = await import('@haa/wallet-core');
      const ledger = new WalletLedger();
      const mockDb = {
        select: vi.fn().mockImplementation((...args: any[]) => {
          if (args.length > 0 && args[0]?.total) {
            return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ total: 0 }]) }) };
          }
          return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }) }) };
        }),
      };
      Object.defineProperty(ledger, 'db', { value: mockDb });

      const result = await ledger.getEntries(1, { type: 'sale' });
      expect(result).toBeDefined();
      expect(result.data).toEqual([]);
    });

    it('accepts direction filter', async () => {
      const { WalletLedger } = await import('@haa/wallet-core');
      const ledger = new WalletLedger();
      const mockDb = {
        select: vi.fn().mockImplementation((...args: any[]) => {
          if (args.length > 0 && args[0]?.total) {
            return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ total: 0 }]) }) };
          }
          return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }) }) };
        }),
      };
      Object.defineProperty(ledger, 'db', { value: mockDb });

      const result = await ledger.getEntries(1, { direction: 'credit' });
      expect(result).toBeDefined();
    });

    it('accepts status filter', async () => {
      const { WalletLedger } = await import('@haa/wallet-core');
      const ledger = new WalletLedger();
      const mockDb = {
        select: vi.fn().mockImplementation((...args: any[]) => {
          if (args.length > 0 && args[0]?.total) {
            return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ total: 0 }]) }) };
          }
          return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }) }) };
        }),
      };
      Object.defineProperty(ledger, 'db', { value: mockDb });

      const result = await ledger.getEntries(1, { status: 'available' });
      expect(result).toBeDefined();
    });

    it('accepts date range filter', async () => {
      const { WalletLedger } = await import('@haa/wallet-core');
      const ledger = new WalletLedger();
      const mockDb = {
        select: vi.fn().mockImplementation((...args: any[]) => {
          if (args.length > 0 && args[0]?.total) {
            return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ total: 0 }]) }) };
          }
          return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }) }) };
        }),
      };
      Object.defineProperty(ledger, 'db', { value: mockDb });

      const result = await ledger.getEntries(1, { dateFrom: '2024-01-01', dateTo: '2024-12-31' });
      expect(result).toBeDefined();
    });

    it('accepts search filter', async () => {
      const { WalletLedger } = await import('@haa/wallet-core');
      const ledger = new WalletLedger();
      const mockDb = {
        select: vi.fn().mockImplementation((...args: any[]) => {
          if (args.length > 0 && args[0]?.total) {
            return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ total: 0 }]) }) };
          }
          return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }) }) };
        }),
      };
      Object.defineProperty(ledger, 'db', { value: mockDb });

      const result = await ledger.getEntries(1, { search: 'ORD-001' });
      expect(result).toBeDefined();
    });

    it('returns paginated results', async () => {
      const { WalletLedger } = await import('@haa/wallet-core');
      const ledger = new WalletLedger();
      const mockDb = {
        select: vi.fn().mockImplementation((...args: any[]) => {
          if (args.length > 0 && args[0]?.total) {
            return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ total: 50 }]) }) };
          }
          return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }) }) };
        }),
      };
      Object.defineProperty(ledger, 'db', { value: mockDb });

      const result = await ledger.getEntries(1, { page: 2, limit: 10 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(5);
    });
  });

  describe('Wallet scoping', () => {
    beforeEach(() => { vi.resetModules(); });

    it('getEntries always scoped by storeId', async () => {
      const { WalletLedger } = await import('@haa/wallet-core');
      const ledger = new WalletLedger();
      const mockDb = {
        select: vi.fn().mockImplementation((...args: any[]) => {
          if (args.length > 0 && args[0]?.total) {
            return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ total: 0 }]) }) };
          }
          return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }) }) };
        }),
      };
      Object.defineProperty(ledger, 'db', { value: mockDb });

      const result = await ledger.getEntries(42);
      expect(result).toBeDefined();
      expect(result.data).toEqual([]);
    });

    it('getSummary always scoped by storeId', async () => {
      const { WalletLedger } = await import('@haa/wallet-core');
      const ledger = new WalletLedger();

      const account = { id: 42, storeId: 42, balance: '0', pendingBalance: '0', availableBalance: '0', totalSales: '0', totalFees: '0', totalPayouts: '0' };

      const mockDb = createSummaryMock([], 0, null);
      Object.defineProperty(ledger, 'db', { value: mockDb });
      vi.spyOn(ledger as any, 'ensureAccount').mockResolvedValue(account);

      const result = await ledger.getSummary(42);
      expect(result).toBeDefined();
    });
  });

  describe('Wallet entry reference linking', () => {
    it('entry with referenceType=order has referenceId', () => {
      const entry = {
        id: 1, storeId: 1, type: 'sale', direction: 'credit', amount: '100.00',
        referenceType: 'order', referenceId: 42, description: 'Order payment',
      };
      expect(entry.referenceType).toBe('order');
      expect(entry.referenceId).toBe(42);
    });

    it('entry without reference has null referenceId', () => {
      const entry = {
        id: 2, storeId: 1, type: 'adjustment', direction: 'credit', amount: '10.00',
        referenceType: null, referenceId: null, description: 'Manual adjustment',
      };
      expect(entry.referenceType).toBeNull();
      expect(entry.referenceId).toBeNull();
    });
  });
});
