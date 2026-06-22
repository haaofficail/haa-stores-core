// Shipping rate cache + single-flight debounce — F-QA-C-004.

import { describe, it, expect, beforeEach } from 'vitest';
import { ShippingRateCache, type RateCacheKeyInput } from '@haa/shipping-core';

function input(overrides: Partial<RateCacheKeyInput> = {}): RateCacheKeyInput {
  return {
    storeId: 1,
    destination: { country: 'SA', city: 'Riyadh', postalCode: '11564' },
    cart: [
      { sku: 'SKU-A', productId: 10, quantity: 2 },
      { sku: 'SKU-B', productId: 11, quantity: 1 },
    ],
    provider: 'oto',
    method: 'standard',
    ...overrides,
  };
}

describe('ShippingRateCache (F-QA-C-004)', () => {
  let cache: ShippingRateCache<number>;

  beforeEach(() => {
    cache = new ShippingRateCache<number>({ ttlMs: 1000, errorTtlMs: 50 });
  });

  it('caches identical requests within TTL', async () => {
    let loaderCalls = 0;
    const load = async () => {
      loaderCalls += 1;
      return 42;
    };
    const a = await cache.getOrLoad(input(), load);
    const b = await cache.getOrLoad(input(), load);
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(loaderCalls).toBe(1);
  });

  it('different cart contents = different cache keys', async () => {
    let loaderCalls = 0;
    const load = async () => {
      loaderCalls += 1;
      return loaderCalls * 10;
    };
    const a = await cache.getOrLoad(input(), load);
    const b = await cache.getOrLoad(
      input({ cart: [{ sku: 'SKU-A', productId: 10, quantity: 5 }] }),
      load,
    );
    expect(a).toBe(10);
    expect(b).toBe(20);
    expect(loaderCalls).toBe(2);
  });

  it('different destination = different cache keys', async () => {
    let loaderCalls = 0;
    const load = async () => ++loaderCalls;
    await cache.getOrLoad(input(), load);
    await cache.getOrLoad(input({ destination: { country: 'AE', city: 'Dubai' } }), load);
    expect(loaderCalls).toBe(2);
  });

  it('single-flight: concurrent identical requests share one upstream call', async () => {
    let loaderCalls = 0;
    let resolveLoader: ((value: number) => void) | undefined;
    const load = () =>
      new Promise<number>((resolve) => {
        loaderCalls += 1;
        resolveLoader = resolve;
      });

    const p1 = cache.getOrLoad(input(), load);
    const p2 = cache.getOrLoad(input(), load);
    const p3 = cache.getOrLoad(input(), load);

    // The loader was called exactly once even though 3 callers raced.
    expect(loaderCalls).toBe(1);

    resolveLoader!(99);
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toBe(99);
    expect(r2).toBe(99);
    expect(r3).toBe(99);
    expect(loaderCalls).toBe(1);
  });

  it('errors are cached briefly so a thundering herd does not hammer a failing provider', async () => {
    let loaderCalls = 0;
    const load = async () => {
      loaderCalls += 1;
      throw new Error('upstream-fail');
    };
    await expect(cache.getOrLoad(input(), load)).rejects.toThrow('upstream-fail');
    // Second call within the error-TTL window must replay the cached error
    // without re-hitting the loader.
    await expect(cache.getOrLoad(input(), load)).rejects.toThrow('upstream-fail');
    expect(loaderCalls).toBe(1);
  });

  it('cache key is stable across input ordering', () => {
    const c = new ShippingRateCache<number>();
    const a = c.keyOf(input());
    const b = c.keyOf(
      input({
        cart: [
          { sku: 'SKU-B', productId: 11, quantity: 1 },
          { sku: 'SKU-A', productId: 10, quantity: 2 },
        ],
      }),
    );
    expect(a).toBe(b);
  });
});
