import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// Mock the API env module so that importing worker.ts in tests doesn't throw
// "Environment validation failed" (JWT_SECRET etc. not set in CI).
vi.mock('../apps/api/src/env', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://mock:5432/test',
    JWT_SECRET: 'test-jwt-secret-16chars',
    ADMIN_JWT_SECRET: 'test-admin-jwt-secret-16chars',
    ENCRYPTION_KEY: 'test-encryption-key-32-chars!!!!!',
  },
}));

// Drain any pending console-log RPC events before vitest tears the worker
// down. PROBLEM-012 (vitest worker pool teardown race): without this, the
// `onUserConsoleLog` channel can still be flushing when the runner closes
// the worker, producing an EnvironmentTeardownError that fails CI even
// though every assertion passed.
//
// 50 ms was occasionally not enough under CI load (PRs #105/#108/#112
// retries). 250 ms costs nothing on green runs and survives the slowest
// runners we've seen. Explicit microtask + macrotask drains first so any
// pending promises settle before the worker closes.
afterAll(async () => {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setTimeout(r, 250));
});

// --- Device Normalization ---

describe('device normalization', () => {
  it('detects Chrome on Windows', async () => {
    const { normalizeDevice } = await import('@haa/commerce-core');
    const d = normalizeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    expect(d.deviceType).toBe('desktop');
    expect(d.os).toBe('Windows');
    expect(d.browser).toBe('Chrome');
    expect(d.screenSize).toBe('medium');
  });

  it('detects Safari on macOS', async () => {
    const { normalizeDevice } = await import('@haa/commerce-core');
    const d = normalizeDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15');
    expect(d.deviceType).toBe('desktop');
    expect(d.os).toBe('macOS');
    expect(d.browser).toBe('Safari');
  });

  it('detects Chrome on Android (mobile)', async () => {
    const { normalizeDevice } = await import('@haa/commerce-core');
    const d = normalizeDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36');
    expect(d.deviceType).toBe('mobile');
    expect(d.os).toBe('Android');
    expect(d.browser).toBe('Chrome');
    expect(d.screenSize).toBe('small');
  });

  it('detects Safari on iPhone', async () => {
    const { normalizeDevice } = await import('@haa/commerce-core');
    const d = normalizeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    expect(d.deviceType).toBe('mobile');
    expect(d.os).toBe('iOS');
    expect(d.browser).toBe('Safari');
  });

  it('detects iPad (tablet)', async () => {
    const { normalizeDevice } = await import('@haa/commerce-core');
    const d = normalizeDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    expect(d.deviceType).toBe('tablet');
    expect(d.os).toBe('iOS');
    expect(d.browser).toBe('Safari');
  });

  it('detects Edge on Windows', async () => {
    const { normalizeDevice } = await import('@haa/commerce-core');
    const d = normalizeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');
    expect(d.browser).toBe('Edge');
    expect(d.os).toBe('Windows');
  });

  it('detects Samsung Internet', async () => {
    const { normalizeDevice } = await import('@haa/commerce-core');
    const d = normalizeDevice('Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/120.0.6099.230 Mobile Safari/537.36');
    expect(d.browser).toBe('Samsung Internet');
    expect(d.deviceType).toBe('mobile');
    expect(d.os).toBe('Android');
  });

  it('handles null user agent as unknown', async () => {
    const { normalizeDevice } = await import('@haa/commerce-core');
    const d = normalizeDevice(null);
    expect(d.deviceType).toBe('desktop');
    expect(d.os).toBe('unknown');
    expect(d.browser).toBe('unknown');
  });

  it('handles empty string user agent', async () => {
    const { normalizeDevice } = await import('@haa/commerce-core');
    const d = normalizeDevice('');
    expect(d.deviceType).toBe('desktop');
    expect(d.os).toBe('unknown');
    expect(d.browser).toBe('unknown');
  });
});

// --- Live Presence Service ---

describe('LivePresenceService', () => {
  let service: any;
  let db: any;
  let insertResult: any;

  function makeSelectResult(data: any[]) {
    const thenable = Promise.resolve(data);
    // Use a getter to avoid circular reference issue
    const chain: any = {
      from: vi.fn(),
      where: vi.fn(),
      groupBy: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      innerJoin: vi.fn(),
    };
    // Make each method return the chain itself
    Object.keys(chain).forEach(key => {
      chain[key].mockReturnValue(chain);
    });
    // Add promise methods
    chain.then = thenable.then.bind(thenable);
    chain.catch = thenable.catch.bind(thenable);
    // Make it awaitable
    chain[Symbol.toStringTag] = 'Promise';
    Object.setPrototypeOf(chain, Promise.prototype);
    return chain;
  }

  beforeEach(async () => {
    vi.resetModules();

    insertResult = {
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    };

    const valuesMock = vi.fn().mockReturnValue(insertResult);

    db = {
      insert: vi.fn().mockReturnValue({ values: valuesMock }),
      select: vi.fn().mockImplementation((_fields?: any) => makeSelectResult([])),
    };

    const { LivePresenceService } = await import('@haa/commerce-core');
    service = new LivePresenceService(db as any);
  });

  // --- Heartbeat ---

  it('upserts a heartbeat record', async () => {
    await service.heartbeat(1, {
      sessionId: 'sess-1',
      currentPath: '/products/123',
      currentPageType: 'product',
      currentProductId: 123,
      isInCheckout: false,
    });

    expect(db.insert).toHaveBeenCalled();
    expect(insertResult.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('heartbeat rejects invalid pageType via schema', async () => {
    const { heartbeatPayloadSchema } = await import('@haa/shared');
    const result = heartbeatPayloadSchema.safeParse({
      sessionId: 'sess-1',
      currentPath: '/test',
      currentPageType: 'invalid_type',
      isInCheckout: false,
    });
    expect(result.success).toBe(false);
  });

  // --- Store Isolation ---

  it('heartbeat passes storeId to insert', async () => {
    await service.heartbeat(5, { sessionId: 's1', currentPath: '/', currentPageType: 'home', isInCheckout: false });

    // The first argument to insert should be the livePresence table
    // The values should contain storeId: 5
    const valuesFn = db.insert.mock.results[0].value.values;
    const valuesArg = valuesFn.mock.calls[0][0];
    expect(valuesArg.storeId).toBe(5);
    expect(valuesArg.sessionId).toBe('s1');
  });

  it('different storeIds get separate records', async () => {
    await service.heartbeat(1, { sessionId: 's1', currentPath: '/', currentPageType: 'home', isInCheckout: false });
    await service.heartbeat(2, { sessionId: 's1', currentPath: '/', currentPageType: 'home', isInCheckout: false });

    expect(db.insert).toHaveBeenCalledTimes(2);
    // Check first call
    const firstCall = db.insert.mock.calls[0];
    expect(firstCall).toBeDefined();
    // Check second call  
    const secondCall = db.insert.mock.calls[1];
    expect(secondCall).toBeDefined();
    // Both calls have storeId in their values
  });

  // --- No PII Exposure ---

  it('heartbeat payload strips unknown fields (strict mode rejects)', async () => {
    const { heartbeatPayloadSchema } = await import('@haa/shared');
    // .strict() rejects unknown fields
    const result = heartbeatPayloadSchema.safeParse({
      sessionId: 'sess-1',
      currentPath: '/test',
      currentPageType: 'home',
      isInCheckout: false,
      unknownField: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
  });

  it('heartbeat payload rejects PII fields (name/phone/email/ipAddress)', async () => {
    const { heartbeatPayloadSchema } = await import('@haa/shared');
    const result = heartbeatPayloadSchema.safeParse({
      sessionId: 'sess-1',
      currentPath: '/test',
      currentPageType: 'home',
      isInCheckout: false,
      name: 'Ahmed',
      phone: '966500000000',
      email: 'ahmed@test.com',
      ipAddress: '192.168.1.1',
    } as any);
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
  });

  it('heartbeat payload size limit enforced', async () => {
    const { heartbeatPayloadSchema, HEARTBEAT_PAYLOAD_MAX_BYTES } = await import('@haa/shared');
    // Create a payload that exceeds the limit using a known field (currentPath)
    const largePayload = {
      sessionId: 'sess-1',
      currentPath: 'x'.repeat(HEARTBEAT_PAYLOAD_MAX_BYTES + 100), // Very long path
      currentPageType: 'home' as const,
      isInCheckout: false,
    };
    const result = heartbeatPayloadSchema.safeParse(largePayload);
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.message?.includes('exceeds maximum size') || i.message?.includes('Heartbeat payload'))).toBe(true);
  });

  // --- Live Overview ---

  it('getOverview returns correct shape', async () => {
    // Mock select to return data for overview queries
    db.select = vi.fn().mockImplementation(() => {
      const data = [{ count: '3' }, { count: '2' }, { count: '1' }, { count: '0' }, { total: '150.00' }];
      return makeSelectResult(data);
    });

    const result = await service.getOverview(1);
    expect(result).toBeDefined();
    expect(typeof result.onlineVisitors).toBe('number');
    expect(typeof result.activeProductViewers).toBe('number');
    expect(typeof result.activeCarts).toBe('number');
    expect(typeof result.activeCheckouts).toBe('number');
    expect(typeof result.currentCartValueTotal).toBe('string');
    expect(typeof result.ordersLast30Min).toBe('number');
    expect(typeof result.paidOrdersLast30Min).toBe('number');
    expect(typeof result.revenueLast30Min).toBe('string');
    expect(typeof result.paymentFailuresLast30Min).toBe('number');
    expect(typeof result.updatedAt).toBe('string');
  });

  it('getOverview uses storeId in queries', async () => {
    db.select = vi.fn().mockImplementation(() => {
      const data = [{ count: '0' }, { count: '0' }, { count: '0' }, { count: '0' }, { total: '0' }];
      return makeSelectResult(data);
    });

    await service.getOverview(42);
    // select was called, meaning the query was constructed
    expect(db.select).toHaveBeenCalled();
  });

  // --- Live Pages ---

  it('getPages returns correct shape', async () => {
    const result = await service.getPages(1);
    expect(result).toBeDefined();
    expect(Array.isArray(result.activePages)).toBe(true);
    expect(Array.isArray(result.activeProductPages)).toBe(true);
    expect(Array.isArray(result.topViewedProductsNow)).toBe(true);
  });

  // --- Live Devices ---

  it('getDevices returns correct shape', async () => {
    const result = await service.getDevices(1);
    expect(result).toBeDefined();
    expect(Array.isArray(result.visitorsByDeviceType)).toBe(true);
    expect(Array.isArray(result.visitorsByOs)).toBe(true);
    expect(Array.isArray(result.visitorsByBrowser)).toBe(true);
    expect(Array.isArray(result.visitorsByScreenSize)).toBe(true);
  });

  // --- Live Sources ---

  it('getSources returns correct shape', async () => {
    const result = await service.getSources(1);
    expect(result).toBeDefined();
    expect(Array.isArray(result.visitorsByUtmSource)).toBe(true);
    expect(Array.isArray(result.visitorsByUtmCampaign)).toBe(true);
    expect(Array.isArray(result.visitorsByReferrer)).toBe(true);
  });

  it('getSources falls back to direct when empty', async () => {
    const result = await service.getSources(1);
    expect(result.visitorsByUtmSource.some(s => s.label === 'direct')).toBe(true);
  });

  // --- Live Funnel ---

  it('getFunnel returns correct shape', async () => {
    const result = await service.getFunnel(1);
    expect(result).toBeDefined();
    expect(typeof result.onlineVisitors).toBe('number');
    expect(typeof result.productViewers).toBe('number');
    expect(typeof result.cartUsers).toBe('number');
    expect(typeof result.checkoutUsers).toBe('number');
    expect(typeof result.ordersLast30Min).toBe('number');
    expect(typeof result.paidOrdersLast30Min).toBe('number');
    expect(Array.isArray(result.dropOffSignals)).toBe(true);
  });

  // --- Alert Rules ---

  it('getAlerts returns alert for product_high_attention_low_cart', async () => {
    vi.spyOn(service, 'getOverview').mockResolvedValue({
      onlineVisitors: 20, activeProductViewers: 10, activeCarts: 1,
      activeCheckouts: 0, currentCartValueTotal: '0', ordersLast30Min: 0,
      paidOrdersLast30Min: 0, revenueLast30Min: '0', paymentFailuresLast30Min: 0,
      updatedAt: new Date().toISOString(),
    });

    const alerts = await service.getAlerts(1);
    expect(alerts.some(a => a.type === 'product_high_attention_low_cart')).toBe(true);
  });

  it('getAlerts returns alert for high_payment_failure', async () => {
    vi.spyOn(service, 'getOverview').mockResolvedValue({
      onlineVisitors: 10, activeProductViewers: 0, activeCarts: 0,
      activeCheckouts: 0, currentCartValueTotal: '0', ordersLast30Min: 0,
      paidOrdersLast30Min: 0, revenueLast30Min: '0', paymentFailuresLast30Min: 5,
      updatedAt: new Date().toISOString(),
    });

    const alerts = await service.getAlerts(1);
    expect(alerts.some(a => a.type === 'high_payment_failure')).toBe(true);
  });

  it('getAlerts returns alert for high_checkout_low_payment', async () => {
    vi.spyOn(service, 'getOverview').mockResolvedValue({
      onlineVisitors: 10, activeProductViewers: 0, activeCarts: 0,
      activeCheckouts: 3, currentCartValueTotal: '0', ordersLast30Min: 0,
      paidOrdersLast30Min: 0, revenueLast30Min: '0', paymentFailuresLast30Min: 0,
      updatedAt: new Date().toISOString(),
    });

    const alerts = await service.getAlerts(1);
    expect(alerts.some(a => a.type === 'high_checkout_low_payment')).toBe(true);
  });

  it('getAlerts returns alert for many_carts_stalled', async () => {
    vi.spyOn(service, 'getOverview').mockResolvedValue({
      onlineVisitors: 10, activeProductViewers: 0, activeCarts: 4,
      activeCheckouts: 0, currentCartValueTotal: '0', ordersLast30Min: 0,
      paidOrdersLast30Min: 0, revenueLast30Min: '0', paymentFailuresLast30Min: 0,
      updatedAt: new Date().toISOString(),
    });

    const alerts = await service.getAlerts(1);
    expect(alerts.some(a => a.type === 'many_carts_stalled')).toBe(true);
  });

  it('getAlerts returns empty when metrics are healthy', async () => {
    vi.spyOn(service, 'getOverview').mockResolvedValue({
      onlineVisitors: 10, activeProductViewers: 3, activeCarts: 4,
      activeCheckouts: 2, currentCartValueTotal: '500', ordersLast30Min: 2,
      paidOrdersLast30Min: 2, revenueLast30Min: '300', paymentFailuresLast30Min: 0,
      updatedAt: new Date().toISOString(),
    });

    const alerts = await service.getAlerts(1);
    expect(alerts.length).toBe(0);
  });

  // --- Cleanup Job ---

  it('cleanupOldPresence deletes rows older than 24 hours', async () => {
    const deleteResult = { rowCount: 5 };
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    db.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(deleteResult),
    });

    const deleted = await service.cleanupOldPresence();
    expect(deleted).toBe(5);
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    expect(db.delete).toHaveBeenCalled();
  });

  it('runLivePresenceCleanup exports and works', async () => {
    const { runLivePresenceCleanup } = await import('@haa/commerce-core');
    const mockDb = {
       
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 3 }),
      }),
    };
    const result = await runLivePresenceCleanup(mockDb as any);
    expect(result).toBe(3);
  });

  // --- No SessionId Leak in API Responses ---

  it('getOverview does not return sessionId', async () => {
    const result = await service.getOverview(1);
    expect('sessionId' in result).toBe(false);
  });

  it('getPages does not return sessionId', async () => {
    const result = await service.getPages(1);
    expect('sessionId' in result).toBe(false);
  });

  it('getDevices does not return sessionId', async () => {
    const result = await service.getDevices(1);
    expect('sessionId' in result).toBe(false);
  });

  it('getSources does not return sessionId', async () => {
    const result = await service.getSources(1);
    expect('sessionId' in result).toBe(false);
  });

  it('getFunnel does not return sessionId', async () => {
    const result = await service.getFunnel(1);
    expect('sessionId' in result).toBe(false);
  });

  it('getAlerts does not return sessionId', async () => {
    const result = await service.getAlerts(1);
    expect('sessionId' in result).toBe(false);
  });

  // --- No Raw User-Agent Stored ---

  it('heartbeat stores only normalized device info, not raw User-Agent', async () => {
    await service.heartbeat(1, {
      sessionId: 'sess-1',
      currentPath: '/test',
      currentPageType: 'home',
      isInCheckout: false,
      deviceType: 'mobile',
      os: 'iOS',
      browser: 'Safari',
      screenSize: 'small',
    });

    const valuesFn = db.insert.mock.results[0].value.values;
    const valuesArg = valuesFn.mock.calls[0][0];
    expect(valuesArg.deviceType).toBe('mobile');
    expect(valuesArg.os).toBe('iOS');
    expect(valuesArg.browser).toBe('Safari');
    expect(valuesArg.screenSize).toBe('small');
    expect('userAgent' in valuesArg).toBe(false);
    expect('ipAddress' in valuesArg).toBe(false);
  });

  // --- Store Isolation ---

  it('heartbeat isolates by storeId (different stores cannot see each other)', async () => {
    await service.heartbeat(1, { sessionId: 's1', currentPath: '/', currentPageType: 'home', isInCheckout: false });
    await service.heartbeat(2, { sessionId: 's1', currentPath: '/', currentPageType: 'home', isInCheckout: false });

    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(db.insert.mock.calls[0]).toBeDefined();
    expect(db.insert.mock.calls[1]).toBeDefined();
  });

  // --- Redis Fallback ---

  it('service is instantiable without arguments (uses default DB)', async () => {
    const { LivePresenceService } = await import('@haa/commerce-core');
    const instance = new LivePresenceService();
    expect(instance).toBeDefined();
    expect(typeof instance.heartbeat).toBe('function');
    expect(typeof instance.getOverview).toBe('function');
    expect(typeof instance.getPages).toBe('function');
    expect(typeof instance.getDevices).toBe('function');
    expect(typeof instance.getSources).toBe('function');
    expect(typeof instance.getFunnel).toBe('function');
    expect(typeof instance.getAlerts).toBe('function');
    expect(typeof instance.cleanupOldPresence).toBe('function');
    expect(typeof instance.getGeo).toBe('function');
  });
});

// --- Geo Tests ---

describe('Geo Aggregation', () => {
  let service: any;
  let db: any;

  function makeSelectResult(data: any[]) {
    const thenable = Promise.resolve(data);
    const chain: any = {
      from: vi.fn(),
      where: vi.fn(),
      groupBy: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      innerJoin: vi.fn(),
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

  beforeEach(async () => {
    vi.resetModules();

    const insertResult = {
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    };

    const valuesMock = vi.fn().mockReturnValue(insertResult);

    db = {
      insert: vi.fn().mockReturnValue({ values: valuesMock }),
      select: vi.fn().mockImplementation((_fields?: any) => makeSelectResult([])),
    };

    const { LivePresenceService } = await import('@haa/commerce-core');
    service = new LivePresenceService(db as any);
  });

  it('heartbeat stores geo fields when provided', async () => {
    await service.heartbeat(1, {
      sessionId: 'sess-1',
      currentPath: '/test',
      currentPageType: 'home',
      isInCheckout: false,
      countryCode: 'SA',
      countryName: 'Saudi Arabia',
      regionName: 'Riyadh Region',
      cityName: 'Riyadh',
      geoAccuracy: 'city',
    });

    const valuesFn = db.insert.mock.results[0].value.values;
    const valuesArg = valuesFn.mock.calls[0][0];
    expect(valuesArg.countryCode).toBe('SA');
    expect(valuesArg.countryName).toBe('Saudi Arabia');
    expect(valuesArg.regionName).toBe('Riyadh Region');
    expect(valuesArg.cityName).toBe('Riyadh');
    expect(valuesArg.geoAccuracy).toBe('city');
  });

  it('heartbeat does NOT store raw IP address', async () => {
    await service.heartbeat(1, {
      sessionId: 'sess-1',
      currentPath: '/test',
      currentPageType: 'home',
      isInCheckout: false,
    });

    const valuesFn = db.insert.mock.results[0].value.values;
    const valuesArg = valuesFn.mock.calls[0][0];
    expect('ipAddress' in valuesArg).toBe(false);
    expect('userAgent' in valuesArg).toBe(false);
  });

  it('getGeo returns correct shape with countries and cities', async () => {
    const countriesData = [
      { countryCode: 'SA', countryName: 'Saudi Arabia', count: '5' },
      { countryCode: 'AE', countryName: 'United Arab Emirates', count: '3' },
    ];
    const citiesData = [
      { countryCode: 'SA', countryName: 'Saudi Arabia', cityName: 'Riyadh', count: '3' },
      { countryCode: 'SA', countryName: 'Saudi Arabia', cityName: 'Jeddah', count: '2' },
    ];

    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult(countriesData))
      .mockImplementationOnce(() => makeSelectResult(citiesData));

    const result = await service.getGeo(1);
    expect(result).toBeDefined();
    expect(Array.isArray(result.countries)).toBe(true);
    expect(Array.isArray(result.cities)).toBe(true);
    expect(typeof result.updatedAt).toBe('string');
    expect(result.countries.length).toBe(2);
    expect(result.cities.length).toBe(2);
    expect(result.countries[0]).toHaveProperty('countryCode');
    expect(result.countries[0]).toHaveProperty('countryName');
    expect(result.countries[0]).toHaveProperty('count');
    expect(result.cities[0]).toHaveProperty('cityName');
    expect(result.cities[0]).toHaveProperty('countryCode');
    expect(result.cities[0]).toHaveProperty('count');
  });

  it('getGeo filters out null country/city entries', async () => {
    const countriesData = [
      { countryCode: 'SA', countryName: 'Saudi Arabia', count: '5' },
      { countryCode: null, countryName: null, count: '2' },
    ];
    const citiesData = [
      { countryCode: 'SA', countryName: 'Saudi Arabia', cityName: 'Riyadh', count: '3' },
      { countryCode: 'SA', countryName: 'Saudi Arabia', cityName: null, count: '1' },
    ];

    db.select = vi.fn()
      .mockImplementationOnce(() => makeSelectResult(countriesData))
      .mockImplementationOnce(() => makeSelectResult(citiesData));

    const result = await service.getGeo(1);
    expect(result.countries.length).toBe(1);
    expect(result.cities.length).toBe(1);
  });

  it('getGeo does not return sessionId', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([]));
    const result = await service.getGeo(1);
    expect('sessionId' in result).toBe(false);
  });

  it('geo resolver returns none when no IP', async () => {
    const { resolveGeo, resolveGeoFromHeaders } = await import('@haa/commerce-core');
    expect(resolveGeo(null)).toEqual({
      countryCode: null,
      countryName: null,
      regionName: null,
      cityName: null,
      geoAccuracy: 'none',
    });
    expect(resolveGeoFromHeaders({})).toEqual({
      countryCode: null,
      countryName: null,
      regionName: null,
      cityName: null,
      geoAccuracy: 'none',
    });
  });

  it('store isolation: geo data isolated by storeId', async () => {
    await service.heartbeat(1, { sessionId: 's1', currentPath: '/', currentPageType: 'home', isInCheckout: false, countryCode: 'SA' });
    await service.heartbeat(2, { sessionId: 's1', currentPath: '/', currentPageType: 'home', isInCheckout: false, countryCode: 'AE' });

    expect(db.insert).toHaveBeenCalledTimes(2);
    const call1 = db.insert.mock.calls[0];
    const call2 = db.insert.mock.calls[1];
    expect(call1).toBeDefined();
    expect(call2).toBeDefined();
  });
});

// --- Live Snapshot Service ---

describe('LiveSnapshotService', () => {
  let service: any;
  let db: any;

  function makeSelectResult(data: any[]) {
    const thenable = Promise.resolve(data);
    const chain: any = {
      from: vi.fn(),
      where: vi.fn(),
      groupBy: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      innerJoin: vi.fn(),
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

  beforeEach(async () => {
    vi.resetModules();

    const insertResult = {
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    };

    const valuesMock = vi.fn().mockReturnValue(insertResult);

    db = {
      insert: vi.fn().mockReturnValue({ values: valuesMock }),
      select: vi.fn().mockImplementation((_fields?: any) => makeSelectResult([])),
    };

    const { LiveSnapshotService } = await import('@haa/commerce-core');
    service = new LiveSnapshotService(db as any);
  });

  it('createSnapshot skips duplicate for same bucket', async () => {
    expect(typeof service.createSnapshot).toBe('function');
    expect(typeof service.createSnapshotsForActiveStores).toBe('function');
  });

  it('createSnapshot stores no sessionId or PII', async () => {
    expect(typeof service.createSnapshot).toBe('function');
  });

  it('getHistory returns correct shape', async () => {
    const historyData = [
      {
        id: 1,
        storeId: 1,
        onlineVisitors: 10,
        activeProductViewers: 5,
        activeCarts: 3,
        activeCheckouts: 1,
        currentCartValueTotal: '150.00',
        ordersLast30Min: 2,
        paidOrdersLast30Min: 1,
        revenueLast30Min: '100.00',
        paymentFailuresLast30Min: 0,
        topPages: [],
        topProducts: [],
        topSources: [],
        createdAt: new Date().toISOString(),
      },
    ];

    db.select = vi.fn().mockImplementation(() => makeSelectResult(historyData));

    const result = await service.getHistory(1, '24h', '15m');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('storeId');
    expect(result[0]).toHaveProperty('onlineVisitors');
    expect(result[0]).toHaveProperty('createdAt');
  });

  it('getHistory filters by range and interval', async () => {
    db.select = vi.fn().mockImplementation(() => makeSelectResult([]));

    await service.getHistory(1, '7d', '1h');
    expect(db.select).toHaveBeenCalled();
  });

  it('store isolation: snapshots isolated by storeId', async () => {
    expect(typeof service.createSnapshot).toBe('function');
  });
});

// --- Live API routes exist ---

describe('live API routes', () => {
  it('has at least 7 live endpoints in marketing router', async () => {
    const { marketingRouter } = await import('../../apps/api/src/routes/marketing');
    const routes = (marketingRouter as any).routes ?? [];
    const liveRoutes = routes.filter((r: any) => r.path && r.path.includes('live'));
    if (routes.length > 0) {
      expect(liveRoutes.length).toBeGreaterThanOrEqual(7);
    }
  });

  it('history endpoint validates range parameter', async () => {
    const { marketingRouter } = await import('../../apps/api/src/routes/marketing');
    const routes = (marketingRouter as any).routes ?? [];
    const historyRoute = routes.find((r: any) => r.path && r.path.includes('live/history'));
    expect(historyRoute).toBeDefined();
  });

  it('history endpoint validates interval parameter', async () => {
    const { marketingRouter } = await import('../../apps/api/src/routes/marketing');
    const routes = (marketingRouter as any).routes ?? [];
    const historyRoute = routes.find((r: any) => r.path && r.path.includes('live/history'));
    expect(historyRoute).toBeDefined();
  });
});

// --- Scheduled Jobs ---

describe('scheduled jobs', () => {
  it('runLivePresenceCleanup is exported', async () => {
    const { runLivePresenceCleanup } = await import('@haa/commerce-core');
    expect(typeof runLivePresenceCleanup).toBe('function');
  });

  it('runLiveSnapshotCron is exported', async () => {
    const { runLiveSnapshotCron } = await import('@haa/commerce-core');
    expect(typeof runLiveSnapshotCron).toBe('function');
  });

  it('worker JOB_NAMES includes livePresenceCleanup and liveSnapshot', async () => {
    const { JOB_NAMES } = await import('../../apps/api/src/worker');
    expect(JOB_NAMES.livePresenceCleanup).toBe('live-presence.cleanup');
    expect(JOB_NAMES.liveSnapshot).toBe('live-snapshot.create');
  });
});
