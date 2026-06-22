// Webhook dedup metrics — F-QA-B-NEXT / Wave 17 P2.
//
// Tests the per-process counters and stats() snapshot exposed by
// @haa/integration-core/webhook-dedup. The actual deduplicateWebhook()
// path hits the DB so it's covered by the integration suite — here we
// verify the counters/stats surface in isolation.

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@haa/db', () => ({
  createDbClient: () => {
    throw new Error('db should not be reached in metrics-shape tests');
  },
}));
vi.mock('@haa/db/schema', () => ({ paymentWebhookEvents: {} }));

import {
  getWebhookDedupStats,
  resetWebhookDedupMetrics,
} from '../packages/integration-core/src/webhook-dedup';

describe('Webhook dedup metrics (F-QA-B-NEXT)', () => {
  beforeEach(() => {
    resetWebhookDedupMetrics();
  });

  it('starts zeroed', () => {
    const s = getWebhookDedupStats();
    expect(s).toEqual({
      total: 0,
      duplicates: 0,
      fresh: 0,
      errors: 0,
      duplicateRate: 0,
      byProvider: {},
    });
  });

  it('stats() snapshot has the documented shape', () => {
    const s = getWebhookDedupStats();
    expect(Object.keys(s).sort()).toEqual(
      ['byProvider', 'duplicateRate', 'duplicates', 'errors', 'fresh', 'total'].sort(),
    );
    expect(typeof s.duplicateRate).toBe('number');
    expect(typeof s.byProvider).toBe('object');
  });

  it('resetWebhookDedupMetrics is idempotent', () => {
    resetWebhookDedupMetrics();
    resetWebhookDedupMetrics();
    const s = getWebhookDedupStats();
    expect(s.total).toBe(0);
    expect(s.byProvider).toEqual({});
  });

  it('duplicateRate is 0 when total is 0 (no NaN)', () => {
    const s = getWebhookDedupStats();
    expect(Number.isNaN(s.duplicateRate)).toBe(false);
    expect(s.duplicateRate).toBe(0);
  });
});

describe('Webhook dedup metrics: counter wiring (mocked DB)', () => {
  beforeEach(() => {
    resetWebhookDedupMetrics();
    vi.resetModules();
  });

  it('counts a fresh insert against fresh + total + provider bucket', async () => {
    vi.doMock('@haa/db', () => ({
      createDbClient: () => ({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
        insert: () => ({
          values: async () => undefined,
        }),
      }),
    }));
    vi.doMock('@haa/db/schema', () => ({
      paymentWebhookEvents: { id: 'id', idempotencyKey: 'idempotencyKey' },
    }));

    const mod = await import('../packages/integration-core/src/webhook-dedup');
    mod.resetWebhookDedupMetrics();

    const res = await mod.deduplicateWebhook('moyasar', '{"a":1}', 'sig-1', undefined);
    expect(res.duplicate).toBe(false);

    const s = mod.getWebhookDedupStats();
    expect(s.total).toBe(1);
    expect(s.fresh).toBe(1);
    expect(s.duplicates).toBe(0);
    expect(s.errors).toBe(0);
    expect(s.byProvider.moyasar).toEqual({ total: 1, duplicates: 0, duplicateRate: 0 });
  });

  it('counts a duplicate hit against duplicates + provider duplicate-rate', async () => {
    vi.doMock('@haa/db', () => ({
      createDbClient: () => ({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [{ id: 42 }],
            }),
          }),
        }),
        insert: () => {
          throw new Error('should not insert when duplicate is found');
        },
      }),
    }));
    vi.doMock('@haa/db/schema', () => ({
      paymentWebhookEvents: { id: 'id', idempotencyKey: 'idempotencyKey' },
    }));

    const mod = await import('../packages/integration-core/src/webhook-dedup');
    mod.resetWebhookDedupMetrics();

    const res = await mod.deduplicateWebhook('oto', '{"a":1}', 'sig-1', undefined);
    expect(res.duplicate).toBe(true);
    if (res.duplicate) expect(res.existingId).toBe(42);

    const s = mod.getWebhookDedupStats();
    expect(s.duplicates).toBe(1);
    expect(s.fresh).toBe(0);
    expect(s.duplicateRate).toBe(1);
    expect(s.byProvider.oto.duplicateRate).toBe(1);
  });

  it('counts errors against the errors counter', async () => {
    vi.doMock('@haa/db', () => ({
      createDbClient: () => {
        throw new Error('db unreachable');
      },
    }));
    vi.doMock('@haa/db/schema', () => ({
      paymentWebhookEvents: { id: 'id', idempotencyKey: 'idempotencyKey' },
    }));

    const mod = await import('../packages/integration-core/src/webhook-dedup');
    mod.resetWebhookDedupMetrics();

    await expect(
      mod.deduplicateWebhook('moyasar', '{}', 'sig', undefined),
    ).rejects.toThrow(/db unreachable/);

    const s = mod.getWebhookDedupStats();
    expect(s.errors).toBe(1);
    expect(s.total).toBe(1);
    expect(s.fresh).toBe(0);
  });
});
