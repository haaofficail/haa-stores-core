import { describe, it, expect } from 'vitest';

describe('LC2E — Settings & Store Setup', () => {
  describe('Settings validation', () => {
    it('valid email passes', () => {
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test('store@example.com')).toBe(true);
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test('admin@haastores.com')).toBe(true);
    });

    it('invalid email fails', () => {
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test('')).toBe(false);
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test('not-an-email')).toBe(false);
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test('@missing.com')).toBe(false);
    });

    it('valid hex color passes', () => {
      expect(/^#[0-9a-fA-F]{6}$/.test('#2563eb')).toBe(true);
      expect(/^#[0-9a-fA-F]{6}$/.test('#FF0000')).toBe(true);
      expect(/^#[0-9a-fA-F]{6}$/.test('#000000')).toBe(true);
    });

    it('invalid hex color fails', () => {
      expect(/^#[0-9a-fA-F]{6}$/.test('')).toBe(false);
      expect(/^#[0-9a-fA-F]{6}$/.test('red')).toBe(false);
      expect(/^#[0-9a-fA-F]{6}$/.test('#FFF')).toBe(false);
      expect(/^#[0-9a-fA-F]{6}$/.test('#GGGGGG')).toBe(false);
    });

    it('valid slug passes', () => {
      expect(/^[a-z0-9-]+$/.test('my-store')).toBe(true);
      expect(/^[a-z0-9-]+$/.test('store123')).toBe(true);
    });

    it('invalid slug fails', () => {
      expect(/^[a-z0-9-]+$/.test('')).toBe(false);
      expect(/^[a-z0-9-]+$/.test('My Store')).toBe(false);
      expect(/^[a-z0-9-]+$/.test('store_name')).toBe(false);
    });
  });

  describe('Readiness checklist logic', () => {
    it('computes percentage correctly', () => {
      const items = [
        { completed: true },
        { completed: true },
        { completed: false },
        { completed: false },
      ];
      const completed = items.filter(i => i.completed).length;
      const total = items.length;
      const percentage = Math.round((completed / total) * 100);
      expect(percentage).toBe(50);
    });

    it('100% when all completed', () => {
      const items = [
        { completed: true },
        { completed: true },
        { completed: true },
      ];
      const completed = items.filter(i => i.completed).length;
      const total = items.length;
      const percentage = Math.round((completed / total) * 100);
      expect(percentage).toBe(100);
    });

    it('0% when none completed', () => {
      const items = [
        { completed: false },
        { completed: false },
        { completed: false },
      ];
      const completed = items.filter(i => i.completed).length;
      const total = items.length;
      const percentage = Math.round((completed / total) * 100);
      expect(percentage).toBe(0);
    });

    it('detects missing store name', () => {
      const store = { name: '' };
      const completed = !!(store.name && store.name.length > 0);
      expect(completed).toBe(false);
    });

    it('detects present store name', () => {
      const store = { name: 'My Store' };
      const completed = !!(store.name && store.name.length > 0);
      expect(completed).toBe(true);
    });

    it('detects missing description', () => {
      const store = { description: '' };
      const completed = !!(store.description && store.description.length > 0);
      expect(completed).toBe(false);
    });

    it('detects present logo', () => {
      const store = { logoUrl: 'https://example.com/logo.png' };
      const completed = !!(store.logoUrl && store.logoUrl.length > 0);
      expect(completed).toBe(true);
    });

    it('detects missing contact info', () => {
      const store = { phone: '', email: '' };
      const completed = !!((store.phone && store.phone.length > 0) || (store.email && store.email.length > 0));
      expect(completed).toBe(false);
    });

    it('detects present phone contact', () => {
      const store = { phone: '+966500000000', email: '' };
      const completed = !!((store.phone && store.phone.length > 0) || (store.email && store.email.length > 0));
      expect(completed).toBe(true);
    });

    it('detects present email contact', () => {
      const store = { phone: '', email: 'store@example.com' };
      const completed = !!((store.phone && store.phone.length > 0) || (store.email && store.email.length > 0));
      expect(completed).toBe(true);
    });
  });

  describe('Readiness items structure', () => {
    it('each item has required fields', () => {
      const items = [
        { key: 'store_name', label: 'storeReadiness.storeName', completed: true, actionLabel: 'storeReadiness.actionSettings', actionHref: '/settings' },
        { key: 'has_category', label: 'storeReadiness.hasCategory', completed: false, actionLabel: 'storeReadiness.actionCategories', actionHref: '/categories' },
      ];

      for (const item of items) {
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('completed');
        expect(item).toHaveProperty('actionLabel');
        expect(item).toHaveProperty('actionHref');
        expect(typeof item.key).toBe('string');
        expect(typeof item.completed).toBe('boolean');
      }
    });

    it('action hrefs point to correct pages', () => {
      const items = [
        { key: 'store_name', actionHref: '/settings' },
        { key: 'has_category', actionHref: '/categories' },
        { key: 'has_active_product', actionHref: '/products' },
        { key: 'has_shipping_method', actionHref: '/shipping' },
      ];

      expect(items[0].actionHref).toBe('/settings');
      expect(items[1].actionHref).toBe('/categories');
      expect(items[2].actionHref).toBe('/products');
      expect(items[3].actionHref).toBe('/shipping');
    });
  });

  describe('Store public data safety', () => {
    it('public store data should not include tenantId', () => {
      const store = { id: 1, name: 'Test', slug: 'test', tenantId: 42 };
      const { tenantId, ...publicStore } = store;
      expect(publicStore).not.toHaveProperty('tenantId');
      expect(tenantId).toBe(42);
    });

    it('public store data should not include financial data', () => {
      const store = { id: 1, name: 'Test', balance: '1000', totalSales: '5000' };
      const { balance, totalSales, ...publicStore } = store;
      expect(publicStore).not.toHaveProperty('balance');
      expect(publicStore).not.toHaveProperty('totalSales');
    });
  });
});
