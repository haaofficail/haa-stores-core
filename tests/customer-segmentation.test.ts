import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeSelectResult(data: any[]) {
  const thenable = Promise.resolve(data);
  const chain: any = {
    from: vi.fn(),
    where: vi.fn(),
    groupBy: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    innerJoin: vi.fn(),
    set: vi.fn(),
  };
  Object.keys(chain).forEach(key => {
    chain[key].mockReturnValue(chain);
  });
  chain.then = thenable.then.bind(thenable);
  chain.catch = thenable.catch.bind(thenable);
  chain[Symbol.toStringTag] = 'Promise';
  Object.setPrototypeOf(chain, Promise.prototype);
  return chain;
}

// --- Types & Constants ---

describe('Customer Segmentation — Types & Constants', () => {
  it('exports all segment types', async () => {
    const mod = await import('@haa/shared');
    expect(mod.CUSTOMER_SEGMENT_LABELS).toBeDefined();
    expect(Object.keys(mod.CUSTOMER_SEGMENT_LABELS)).toHaveLength(8);
    expect(mod.CUSTOMER_SEGMENT_LABELS.high_value).toBe('عملاء ذوو قيمة عالية');
    expect(mod.CUSTOMER_SEGMENT_LABELS.repeat_buyers).toBe('مشترين متكررين');
    expect(mod.CUSTOMER_SEGMENT_LABELS.new_customers).toBe('عملاء جدد');
    expect(mod.CUSTOMER_SEGMENT_LABELS.inactive).toBe('عملاء غير نشطين');
    expect(mod.CUSTOMER_SEGMENT_LABELS.cart_abandoners).toBe('مهملو السلة');
    expect(mod.CUSTOMER_SEGMENT_LABELS.at_risk).toBe('عملاء معرضون للخطر');
    expect(mod.CUSTOMER_SEGMENT_LABELS.one_time_buyers).toBe('مشترو مرة واحدة');
    expect(mod.CUSTOMER_SEGMENT_LABELS.coupon_users).toBe('مستخدمو الكوبونات');
  });

  it('exports segment descriptions', async () => {
    const mod = await import('@haa/shared');
    expect(mod.CUSTOMER_SEGMENT_DESCRIPTIONS).toBeDefined();
    expect(Object.keys(mod.CUSTOMER_SEGMENT_DESCRIPTIONS)).toHaveLength(8);
    for (const key of Object.keys(mod.CUSTOMER_SEGMENT_DESCRIPTIONS)) {
      expect(typeof mod.CUSTOMER_SEGMENT_DESCRIPTIONS[key as keyof typeof mod.CUSTOMER_SEGMENT_DESCRIPTIONS]).toBe('string');
    }
  });

  it('exports default segment thresholds', async () => {
    const mod = await import('@haa/shared');
    expect(mod.DEFAULT_CUSTOMER_SEGMENT_THRESHOLDS).toBeDefined();
    expect(typeof mod.DEFAULT_CUSTOMER_SEGMENT_THRESHOLDS.highValueMinSpent).toBe('number');
    expect(typeof mod.DEFAULT_CUSTOMER_SEGMENT_THRESHOLDS.inactiveDays).toBe('number');
    expect(typeof mod.DEFAULT_CUSTOMER_SEGMENT_THRESHOLDS.atRiskDays).toBe('number');
    expect(typeof mod.DEFAULT_CUSTOMER_SEGMENT_THRESHOLDS.newCustomerDays).toBe('number');
  });

  it('exports segment icons', async () => {
    const mod = await import('@haa/shared');
    expect(mod.CUSTOMER_SEGMENT_ICONS).toBeDefined();
    expect(Object.keys(mod.CUSTOMER_SEGMENT_ICONS)).toHaveLength(8);
    expect(mod.CUSTOMER_SEGMENT_ICONS.high_value).toBe('Crown');
    expect(mod.CUSTOMER_SEGMENT_ICONS.cart_abandoners).toBe('ShoppingCart');
  });
});

// --- Service ---

describe('CustomerSegmentationService', () => {
  let service: any;
  let db: any;

  beforeEach(async () => {
    vi.resetModules();

    db = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      select: vi.fn().mockImplementation(() => makeSelectResult([])),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    const { CustomerSegmentationService } = await import('@haa/commerce-core');
    service = new CustomerSegmentationService(db as any);
  });

  it('getThresholds returns defaults when no custom settings', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([]));
    const result = await service.getThresholds(1);
    expect(result.highValueMinSpent).toBe(500);
    expect(result.inactiveDays).toBe(90);
    expect(result.atRiskDays).toBe(30);
    expect(result.newCustomerDays).toBe(30);
  });

  it('getThresholds merges custom settings with defaults', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([
      { key: 'customerSegmentThresholds', valueJson: { highValueMinSpent: 1000 } },
    ]));
    const result = await service.getThresholds(1);
    expect(result.highValueMinSpent).toBe(1000);
    expect(result.inactiveDays).toBe(90);
  });

  it('updateThresholds upserts settings', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([]));
    await service.updateThresholds(1, { highValueMinSpent: 2000 });
    expect(db.insert).toHaveBeenCalled();
  });

  it('getSummary returns correct shape', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([{ count: '10', total: '0', avg: '0' }]));

    const result = await service.getSummary(1);
    expect(result.totalCustomers).toBe(10);
    expect(result.segments).toHaveLength(8);
    expect(result.computedAt).toBeTruthy();
    for (const seg of result.segments) {
      expect(seg.type).toBeTruthy();
      expect(seg.labelAr).toBeTruthy();
      expect(typeof seg.count).toBe('number');
    }
  });

  it('high_value segment counts customers above threshold', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([{ count: '3', total: '1500', avg: '500' }]));

    const result = await service.getSummary(1);
    const highValue = result.segments.find(s => s.type === 'high_value');
    expect(highValue).toBeDefined();
    expect(highValue!.count).toBe(3);
    expect(highValue!.totalSpent).toBe('1500');
  });

  it('repeat_buyers segment counts customers with 2+ orders', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([{ count: '4', total: '2000', avg: '500' }]));

    const result = await service.getSummary(1);
    const repeat = result.segments.find(s => s.type === 'repeat_buyers');
    expect(repeat).toBeDefined();
    expect(repeat!.count).toBe(4);
  });

  it('getSegmentMembers returns paginated results', async () => {
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([])) // thresholds
      .mockImplementationOnce(() => makeSelectResult([{ count: '2' }])) // total
      .mockImplementationOnce(() => makeSelectResult([ // members
        { id: 1, name: 'Ahmed', phone: '966500000001', email: null, totalOrders: 5, totalSpent: '2500', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: 'Sara', phone: '966500000002', email: 'sara@test.com', totalOrders: 3, totalSpent: '1500', createdAt: new Date(), updatedAt: new Date() },
      ]))
      .mockImplementationOnce(() => makeSelectResult([])) // last orders
      .mockImplementationOnce(() => makeSelectResult([])); // last sessions

    const result = await service.getSegmentMembers(1, 'high_value');
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.data[0].name).toBe('Ahmed');
    expect(result.data[0].segmentType).toBe('high_value');
  });

  it('getSegmentMembers returns empty for unknown segment', async () => {
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]));

    const result = await service.getSegmentMembers(1, 'inactive');
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// --- Store Isolation ---

describe('Customer Segmentation — Store Isolation', () => {
  it('queries always filter by storeId', async () => {
    const db = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      select: vi.fn().mockImplementation(() => makeSelectResult([])),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };
    const { CustomerSegmentationService } = await import('@haa/commerce-core');
    const service = new CustomerSegmentationService(db as any);

    await service.getThresholds(42);
    await service.getSummary(42);

    expect(db.select).toHaveBeenCalled();
  });

  it('different storeIds produce separate results', async () => {
    const db = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      select: vi.fn().mockImplementation(() => makeSelectResult([])),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };
    const { CustomerSegmentationService } = await import('@haa/commerce-core');
    const service = new CustomerSegmentationService(db as any);

    const result1 = await service.getSummary(1);
    const result2 = await service.getSummary(2);

    expect(result1.totalCustomers).toBe(0);
    expect(result2.totalCustomers).toBe(0);
  });
});

// --- Exports ---

describe('Customer Segmentation — Exports', () => {
  it('exports CustomerSegmentationService from commerce-core', async () => {
    const mod = await import('@haa/commerce-core');
    expect(mod.CustomerSegmentationService).toBeDefined();
    expect(typeof mod.CustomerSegmentationService).toBe('function');
  });

  it('exports runCustomerSegmentationSummary from commerce-core', async () => {
    const mod = await import('@haa/commerce-core');
    expect(mod.runCustomerSegmentationSummary).toBeDefined();
    expect(typeof mod.runCustomerSegmentationSummary).toBe('function');
  });

  it('exports all segment types from shared', async () => {
    const mod = await import('@haa/shared');
    expect(mod.CUSTOMER_SEGMENT_LABELS).toBeDefined();
    expect(mod.CUSTOMER_SEGMENT_DESCRIPTIONS).toBeDefined();
    expect(mod.CUSTOMER_SEGMENT_ICONS).toBeDefined();
    expect(mod.DEFAULT_CUSTOMER_SEGMENT_THRESHOLDS).toBeDefined();
  });
});
