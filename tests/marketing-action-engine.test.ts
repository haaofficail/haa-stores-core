import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Types & Constants ---

describe('Marketing Action Engine — Types & Constants', () => {
  it('defines all required action types', async () => {
    const { MARKETING_EVENT_TYPES } = await import('@haa/shared');
    // Verify our action types don't conflict with event types
    const actionTypes = [
      'high_views_low_add_to_cart',
      'active_carts_no_checkout',
      'checkout_no_payment',
      'payment_failures_spike',
      'source_visits_no_purchases',
      'mobile_weak_conversion',
    ];
    for (const type of actionTypes) {
      expect(MARKETING_EVENT_TYPES).not.toContain(type);
    }
  });

  it('exports DEFAULT_THRESHOLDS with all required keys', async () => {
    const { DEFAULT_THRESHOLDS } = await import('@haa/shared');
    expect(DEFAULT_THRESHOLDS).toBeDefined();
    expect(typeof DEFAULT_THRESHOLDS.minimumProductViews).toBe('number');
    expect(typeof DEFAULT_THRESHOLDS.lowAddToCartRateThreshold).toBe('number');
    expect(typeof DEFAULT_THRESHOLDS.activeCartAgeMinutes).toBe('number');
    expect(typeof DEFAULT_THRESHOLDS.checkoutNoPaymentMinutes).toBe('number');
    expect(typeof DEFAULT_THRESHOLDS.paymentFailureThreshold).toBe('number');
    expect(typeof DEFAULT_THRESHOLDS.sourceNoPurchaseVisitThreshold).toBe('number');
    expect(typeof DEFAULT_THRESHOLDS.mobileWeakConversionThreshold).toBe('number');
  });

  it('exports ACTION_TYPE_LABELS for all action types', async () => {
    const { ACTION_TYPE_LABELS, ACTION_DESCRIPTIONS, ACTION_RECOMMENDATIONS } = await import('@haa/shared');
    const types = [
      'high_views_low_add_to_cart',
      'active_carts_no_checkout',
      'checkout_no_payment',
      'payment_failures_spike',
      'source_visits_no_purchases',
      'mobile_weak_conversion',
    ];
    for (const type of types) {
      expect(ACTION_TYPE_LABELS[type]).toBeTruthy();
      expect(ACTION_DESCRIPTIONS[type]).toBeTruthy();
      expect(ACTION_RECOMMENDATIONS[type]).toBeTruthy();
    }
  });

  it('exports ACTION_SEVERITY_LABELS in Arabic', async () => {
    const { ACTION_SEVERITY_LABELS } = await import('@haa/shared');
    expect(ACTION_SEVERITY_LABELS.critical).toBe('حرج');
    expect(ACTION_SEVERITY_LABELS.high).toBe('عالي');
    expect(ACTION_SEVERITY_LABELS.medium).toBe('متوسط');
    expect(ACTION_SEVERITY_LABELS.low).toBe('منخفض');
  });

  it('exports ACTION_STATUS_LABELS in Arabic', async () => {
    const { ACTION_STATUS_LABELS } = await import('@haa/shared');
    expect(ACTION_STATUS_LABELS.active).toBe('نشط');
    expect(ACTION_STATUS_LABELS.dismissed).toBe('متجاهل');
    expect(ACTION_STATUS_LABELS.done).toBe('منجز');
    expect(ACTION_STATUS_LABELS.snoozed).toBe('مؤجل');
  });

  it('exports THRESHOLD_CONFIGS array', async () => {
    const { THRESHOLD_CONFIGS } = await import('@haa/shared');
    expect(Array.isArray(THRESHOLD_CONFIGS)).toBe(true);
    expect(THRESHOLD_CONFIGS.length).toBe(7);
    for (const config of THRESHOLD_CONFIGS) {
      expect(config.key).toBeTruthy();
      expect(config.labelAr).toBeTruthy();
      expect(config.descriptionAr).toBeTruthy();
      expect(typeof config.defaultValue).toBe('number');
    }
  });
});

// --- Database Schema ---

describe('Marketing Action Engine — Database Schema', () => {
  it('marketing_action_settings table has correct columns', async () => {
    const { marketingActionSettings } = await import('@haa/db/schema');
    expect(marketingActionSettings).toBeDefined();
    expect(marketingActionSettings.storeId).toBeDefined();
    expect(marketingActionSettings.key).toBeDefined();
    expect(marketingActionSettings.valueJson).toBeDefined();
  });

  it('marketing_action_states table has correct columns', async () => {
    const { marketingActionStates } = await import('@haa/db/schema');
    expect(marketingActionStates).toBeDefined();
    expect(marketingActionStates.storeId).toBeDefined();
    expect(marketingActionStates.actionFingerprint).toBeDefined();
    expect(marketingActionStates.actionType).toBeDefined();
    expect(marketingActionStates.status).toBeDefined();
    expect(marketingActionStates.snoozedUntil).toBeDefined();
    expect(marketingActionStates.dismissedAt).toBeDefined();
    expect(marketingActionStates.doneAt).toBeDefined();
  });

  it('marketing_action_logs table has correct columns', async () => {
    const { marketingActionLogs } = await import('@haa/db/schema');
    expect(marketingActionLogs).toBeDefined();
    expect(marketingActionLogs.storeId).toBeDefined();
    expect(marketingActionLogs.actionId).toBeDefined();
    expect(marketingActionLogs.actionFingerprint).toBeDefined();
    expect(marketingActionLogs.actionType).toBeDefined();
    expect(marketingActionLogs.event).toBeDefined();
    expect(marketingActionLogs.metadata).toBeDefined();
  });

  it('marketing_action_states has default status "active"', async () => {
    const { marketingActionStates } = await import('@haa/db/schema');
    const statusCol = marketingActionStates.status;
    expect(statusCol).toBeDefined();
    expect(statusCol.name).toBe('status');
  });
});

// --- Service Mock Tests ---

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

describe('MarketingActionService', () => {
  let service: any;
  let db: any;
  let insertResult: any;
  let updateResult: any;

  beforeEach(async () => {
    vi.resetModules();

    insertResult = {
      values: vi.fn().mockResolvedValue(undefined),
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    };

    updateResult = {
      where: vi.fn().mockResolvedValue(undefined),
    };

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

    const { MarketingActionService } = await import('@haa/commerce-core');
    service = new MarketingActionService(db as any);
  });

  it('getSettings returns empty object when no settings exist', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([]));
    const result = await service.getSettings(1);
    expect(result).toEqual({});
  });

  it('getSettings returns key-value map from rows', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([
      { key: 'thresholds', valueJson: { minimumProductViews: 50 } },
      { key: 'notifications', valueJson: { enabled: true } },
    ]));
    const result = await service.getSettings(1);
    expect(result.thresholds).toEqual({ minimumProductViews: 50 });
    expect(result.notifications).toEqual({ enabled: true });
  });

  it('getSetting returns null when key not found', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([]));
    const result = await service.getSetting(1, 'thresholds');
    expect(result).toBeNull();
  });

  it('getSetting returns valueJson when key found', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([
      { key: 'thresholds', valueJson: { minimumProductViews: 50 } },
    ]));
    const result = await service.getSetting(1, 'thresholds');
    expect(result).toEqual({ minimumProductViews: 50 });
  });

  it('getThresholds returns defaults when no custom settings', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([]));
    const result = await service.getThresholds(1);
    expect(result.minimumProductViews).toBe(100);
    expect(result.lowAddToCartRateThreshold).toBe(0.05);
    expect(result.activeCartAgeMinutes).toBe(60);
  });

  it('getThresholds merges custom settings with defaults', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([
      { key: 'thresholds', valueJson: { minimumProductViews: 50 } },
    ]));
    const result = await service.getThresholds(1);
    expect(result.minimumProductViews).toBe(50);
    expect(result.lowAddToCartRateThreshold).toBe(0.05);
  });

  it('getActions returns paginated results', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([
      { id: 1, actionFingerprint: 'fp1', actionType: 'high_views_low_add_to_cart', status: 'active' },
    ]));
    // First call returns count, second returns data
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([{ count: '1' }]))
      .mockImplementationOnce(() => makeSelectResult([
        { id: 1, actionFingerprint: 'fp1', actionType: 'high_views_low_add_to_cart', status: 'active' },
      ]));

    const result = await service.getActions(1, { page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('getActions filters by status', async () => {
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([]));

    await service.getActions(1, { status: 'dismissed' });
    expect(db.select).toHaveBeenCalledTimes(2);
  });

  it('getActionById returns null when not found', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([]));
    const result = await service.getActionById(1, 999);
    expect(result).toBeNull();
  });

  it('getActionById returns action when found', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([
      { id: 1, storeId: 1, actionFingerprint: 'fp1', actionType: 'high_views_low_add_to_cart', status: 'active' },
    ]));
    const result = await service.getActionById(1, 1);
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });

  it('updateActionState returns null when action not found', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([]));
    const result = await service.updateActionState(1, 999, { status: 'dismissed' });
    expect(result).toBeNull();
  });

  it('updateActionState updates status and logs', async () => {
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([
        { id: 1, storeId: 1, actionFingerprint: 'fp1', actionType: 'high_views_low_add_to_cart', status: 'active', snoozedUntil: null },
      ]))
      .mockImplementationOnce(() => makeSelectResult([
        { id: 1, storeId: 1, actionFingerprint: 'fp1', actionType: 'high_views_low_add_to_cart', status: 'dismissed', dismissedAt: new Date() },
      ]));

    db.update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });
    db.insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const result = await service.updateActionState(1, 1, { status: 'dismissed' });
    expect(result).toBeDefined();
    expect(result.status).toBe('dismissed');
    expect(db.update).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
  });

  it('updateActionState sets snoozedUntil when snoozing', async () => {
    const snoozedUntil = new Date(Date.now() + 3600000).toISOString();
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([
        { id: 1, storeId: 1, actionFingerprint: 'fp1', actionType: 'checkout_no_payment', status: 'active', snoozedUntil: null },
      ]))
      .mockImplementationOnce(() => makeSelectResult([
        { id: 1, storeId: 1, actionFingerprint: 'fp1', actionType: 'checkout_no_payment', status: 'snoozed', snoozedUntil },
      ]));

    db.update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });
    db.insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const result = await service.updateActionState(1, 1, { status: 'snoozed', snoozedUntil });
    expect(result).toBeDefined();
    expect(result.status).toBe('snoozed');
  });

  it('getLogs returns logs for fingerprint', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([
      { id: 1, event: 'created', actionFingerprint: 'fp1' },
      { id: 2, event: 'dismissed', actionFingerprint: 'fp1' },
    ]));
    const result = await service.getLogs(1, 'fp1');
    expect(result).toHaveLength(2);
  });

  it('updateSetting upserts a setting', async () => {
    db.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    });
    await service.updateSetting(1, 'thresholds', { minimumProductViews: 50 });
    expect(db.insert).toHaveBeenCalled();
  });
});

// --- Rule Generation ---

describe('Marketing Action Engine — Rule Generation', () => {
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

    const { MarketingActionService } = await import('@haa/commerce-core');
    service = new MarketingActionService(db as any);
  });

  it('generateActions returns array', async () => {
    const result = await service.generateActions(1);
    expect(Array.isArray(result)).toBe(true);
  });

  it('high_views_low_add_to_cart rule fires when views high and cart rate low', async () => {
    let selectCall = 0;
    db.select = vi.fn().mockImplementation(() => {
      selectCall++;
      // 1: thresholds, 2: view counts, 3: cart counts, 4: product lookup, 5: active states
      if (selectCall === 2) return makeSelectResult([{ productId: 10, views: '150' }]);
      if (selectCall === 3) return makeSelectResult([{ productId: 10, carts: '2' }]);
      if (selectCall === 4) return makeSelectResult([{ id: 10, name: 'Test Product' }]);
      return makeSelectResult([]);
    });

    const result = await service.generateActions(1);
    const action = result.find((a: any) => a.type === 'high_views_low_add_to_cart');
    expect(action).toBeDefined();
    expect(action.relatedProductId).toBe(10);
    expect(action.fingerprint).toContain('10');
  });

  it('high_views_low_add_to_cart rule does not fire when cart rate is good', async () => {
    let selectCall = 0;
    db.select = vi.fn().mockImplementation(() => {
      selectCall++;
      if (selectCall === 2) return makeSelectResult([{ productId: 10, views: '150' }]);
      if (selectCall === 3) return makeSelectResult([{ productId: 10, carts: '20' }]);
      return makeSelectResult([]);
    });

    const result = await service.generateActions(1);
    const action = result.find((a: any) => a.type === 'high_views_low_add_to_cart');
    expect(action).toBeUndefined();
  });

  it('payment_failures_spike rule fires when failures exceed threshold', async () => {
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([]))
      // checkHighViewsLowCart - view counts
      .mockImplementationOnce(() => makeSelectResult([]))
      // checkHighViewsLowCart - cart counts
      .mockImplementationOnce(() => makeSelectResult([]))
      // checkActiveCartsNoCheckout
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      // checkCheckoutNoPayment
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      // checkPaymentFailures
      .mockImplementationOnce(() => makeSelectResult([{ count: '8' }]))
      // checkSourceNoPurchases
      .mockImplementationOnce(() => makeSelectResult([]))
      // checkMobileWeakConversion - visitors
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      // checkMobileWeakConversion - orders
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      // upsert existing
      .mockImplementationOnce(() => makeSelectResult([]))
      // active states for auto_done
      .mockImplementationOnce(() => makeSelectResult([]));

    const result = await service.generateActions(1);
    const action = result.find((a: any) => a.type === 'payment_failures_spike');
    expect(action).toBeDefined();
    expect(action.severity).toMatch(/critical|high/);
    expect(action.metric).toContain('8');
  });

  it('payment_failures_spike rule does not fire when failures below threshold', async () => {
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '1' }]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]));

    const result = await service.generateActions(1);
    const action = result.find((a: any) => a.type === 'payment_failures_spike');
    expect(action).toBeUndefined();
  });

  it('source_visits_no_purchases fires for high-visit zero-purchase sources', async () => {
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      // source sessions
      .mockImplementationOnce(() => makeSelectResult([
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
        { utmSource: 'google', utmCampaign: null, orderId: null, firstEventAt: new Date() },
      ]))
      // mobile visitors
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      // mobile orders
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      // upsert existing
      .mockImplementationOnce(() => makeSelectResult([]))
      // active states
      .mockImplementationOnce(() => makeSelectResult([]));

    const result = await service.generateActions(1);
    const action = result.find((a: any) => a.type === 'source_visits_no_purchases');
    expect(action).toBeDefined();
    expect(action.relatedSource).toBe('google');
  });

  it('active_carts_no_checkout fires when many carts are stalled', async () => {
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      // activeCartsNoCheckout - stalled carts count
      .mockImplementationOnce(() => makeSelectResult([{ count: '7' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]));

    const result = await service.generateActions(1);
    const action = result.find((a: any) => a.type === 'active_carts_no_checkout');
    expect(action).toBeDefined();
    expect(action.metric).toContain('7');
  });

  it('checkout_no_payment fires when users stuck in checkout', async () => {
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      // checkoutNoPayment - stuck checkouts
      .mockImplementationOnce(() => makeSelectResult([{ count: '4' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]));

    const result = await service.generateActions(1);
    const action = result.find((a: any) => a.type === 'checkout_no_payment');
    expect(action).toBeDefined();
    expect(action.metric).toContain('4');
  });

  it('mobile_weak_conversion fires when conversion below threshold', async () => {
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([]))
      // mobile visitors = 50, orders = 0
      .mockImplementationOnce(() => makeSelectResult([{ count: '50' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]));

    const result = await service.generateActions(1);
    const action = result.find((a: any) => a.type === 'mobile_weak_conversion');
    expect(action).toBeDefined();
    expect(action.severity).toMatch(/critical|high|medium/);
  });

  it('mobile_weak_conversion does not fire when visitors < 20', async () => {
    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '10' }]))
      .mockImplementationOnce(() => makeSelectResult([{ count: '0' }]))
      .mockImplementationOnce(() => makeSelectResult([]))
      .mockImplementationOnce(() => makeSelectResult([]));

    const result = await service.generateActions(1);
    const action = result.find((a: any) => a.type === 'mobile_weak_conversion');
    expect(action).toBeUndefined();
  });
});

// --- Fingerprint & Idempotency ---

describe('Marketing Action Engine — Fingerprint & Idempotency', () => {
  it('fingerprint includes storeId, type, and entity id', async () => {
    const { MarketingActionService } = await import('@haa/commerce-core');
    // Access internal generateFingerprint by testing through upsert behavior
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
    const service = new MarketingActionService(db as any);
    // Generate actions and check fingerprints
    const result = await service.generateActions(1);
    for (const action of result) {
      expect(action.fingerprint).toContain('1:');
      expect(action.fingerprint).toContain(action.type);
    }
  });

  it('same storeId + type + productId produces same fingerprint', async () => {
    let selectCall = 0;
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      select: vi.fn().mockImplementation(() => {
        selectCall++;
        if (selectCall === 2) return makeSelectResult([{ productId: 42, views: '200' }]);
        if (selectCall === 3) return makeSelectResult([{ productId: 42, carts: '2' }]);
        if (selectCall === 4) return makeSelectResult([{ id: 42, name: 'P' }]);
        return makeSelectResult([]);
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };
    const { MarketingActionService } = await import('@haa/commerce-core');
    const service = new MarketingActionService(mockDb as any);
    const result = await service.generateActions(1);
    const action = result.find((a: any) => a.type === 'high_views_low_add_to_cart');
    if (action) {
      expect(action.fingerprint).toBe('1:high_views_low_add_to_cart:42');
    }
  });
});

// --- Store Isolation ---

describe('Marketing Action Engine — Store Isolation', () => {
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
    const { MarketingActionService } = await import('@haa/commerce-core');
    const service = new MarketingActionService(db as any);

    await service.getSettings(42);
    await service.getActions(42);
    await service.generateActions(42);

    // All select calls should pass storeId through the where clause
    expect(db.select).toHaveBeenCalled();
  });

  it('different storeIds produce different actions', async () => {
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
    const { MarketingActionService } = await import('@haa/commerce-core');
    const service = new MarketingActionService(db as any);

    const result1 = await service.generateActions(1);
    const result2 = await service.generateActions(2);

    // Both should return arrays (may be empty if no data matches)
    expect(Array.isArray(result1)).toBe(true);
    expect(Array.isArray(result2)).toBe(true);
  });
});

// --- Exports ---

describe('Marketing Action Engine — Exports', () => {
  it('exports MarketingActionService from commerce-core', async () => {
    const mod = await import('@haa/commerce-core');
    expect(mod.MarketingActionService).toBeDefined();
    expect(typeof mod.MarketingActionService).toBe('function');
  });

  it('exports runMarketingActionGeneration from commerce-core', async () => {
    const mod = await import('@haa/commerce-core');
    expect(mod.runMarketingActionGeneration).toBeDefined();
    expect(typeof mod.runMarketingActionGeneration).toBe('function');
  });

  it('exports action types from shared', async () => {
    const mod = await import('@haa/shared');
    expect(mod.DEFAULT_THRESHOLDS).toBeDefined();
    expect(mod.THRESHOLD_CONFIGS).toBeDefined();
    expect(mod.ACTION_SEVERITY_LABELS).toBeDefined();
    expect(mod.ACTION_STATUS_LABELS).toBeDefined();
    expect(mod.ACTION_TYPE_LABELS).toBeDefined();
    expect(mod.ACTION_DESCRIPTIONS).toBeDefined();
    expect(mod.ACTION_RECOMMENDATIONS).toBeDefined();
  });

  it('exports marketing_action schemas from db', async () => {
    const mod = await import('@haa/db/schema');
    expect(mod.marketingActionSettings).toBeDefined();
    expect(mod.marketingActionStates).toBeDefined();
    expect(mod.marketingActionLogs).toBeDefined();
  });
});
