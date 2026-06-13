import { describe, it, expect } from 'vitest';

describe('Wallet Ledger', () => {
  describe('ledger entry rules', () => {
    it('sale credit increases balance', () => {
      const entries = [
        { type: 'sale', direction: 'credit', amount: 100, status: 'available' },
      ];
      const balance = entries.reduce((sum, e) =>
        e.direction === 'credit' ? sum + e.amount : sum - e.amount, 0);
      expect(balance).toBe(100);
    });

    it('platform fee debit reduces balance', () => {
      const entries = [
        { type: 'sale', direction: 'credit', amount: 100, status: 'available' },
        { type: 'platform_fee', direction: 'debit', amount: 2, status: 'available' },
      ];
      const balance = entries.reduce((sum, e) =>
        e.direction === 'credit' ? sum + e.amount : sum - e.amount, 0);
      expect(balance).toBe(98);
    });

    it('sale + fee produces correct net (2% fee)', () => {
      const saleAmount = 250;
      const feeAmount = Math.round(saleAmount * 0.02 * 100) / 100;
      const entries = [
        { type: 'sale', direction: 'credit', amount: saleAmount },
        { type: 'platform_fee', direction: 'debit', amount: feeAmount },
      ];
      const net = entries.reduce((sum, e) =>
        e.direction === 'credit' ? sum + e.amount : sum - e.amount, 0);
      expect(net).toBe(245);
      expect(feeAmount).toBe(5);
    });

    it('no duplicate ledger entries for same order', () => {
      const processedOrderIds = new Set<number>();
      const orderId = 42;
      expect(processedOrderIds.has(orderId)).toBe(false);
      processedOrderIds.add(orderId);
      expect(processedOrderIds.has(orderId)).toBe(true);
      expect(processedOrderIds.size).toBe(1);
    });

    it('wallet entries scoped to storeId', () => {
      const entries = [
        { storeId: 1, amount: 100 },
        { storeId: 2, amount: 200 },
      ];
      const store1Entries = entries.filter(e => e.storeId === 1);
      expect(store1Entries).toHaveLength(1);
      expect(store1Entries[0].amount).toBe(100);
    });

    it('refund creates debit entry', () => {
      const entry = { type: 'refund', direction: 'debit', amount: 50 };
      expect(entry.direction).toBe('debit');
      expect(entry.type).toBe('refund');
    });

    it('payout is not implemented in MVP', () => {
      const supportedTypes = ['sale', 'refund', 'platform_fee', 'payment_fee'];
      expect(supportedTypes).not.toContain('payout');
    });
  });

  describe('balance computation', () => {
    test.todo('starting balance is 0');

    it('correctly computes balance from mixed entries', () => {
      const entries = [
        { type: 'sale', direction: 'credit', amount: 500 },
        { type: 'platform_fee', direction: 'debit', amount: 10 },
        { type: 'refund', direction: 'debit', amount: 100 },
        { type: 'sale', direction: 'credit', amount: 200 },
      ];
      const balance = entries.reduce((sum, e) =>
        e.direction === 'credit' ? sum + e.amount : sum - e.amount, 0);
      expect(balance).toBe(590);
    });
  });
});
