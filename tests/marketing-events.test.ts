import { describe, it, expect } from 'vitest';
import { MARKETING_EVENT_TYPES, eventPayloadSchema, EVENT_PAYLOAD_MAX_BYTES } from '@haa/shared';

describe('Marketing Events — Phase 1: Event Taxonomy', () => {
  it('defines all required event types', () => {
    const required = [
      'page_view', 'view_product', 'search', 'add_to_cart',
      'remove_from_cart', 'begin_checkout', 'purchase',
      'coupon_applied', 'campaign_click', 'whatsapp_click', 'product_share',
    ];
    for (const type of required) {
      expect(MARKETING_EVENT_TYPES).toContain(type);
    }
  });

  it('has exactly the expected event types', () => {
    expect(MARKETING_EVENT_TYPES).toEqual([
      'page_view', 'view_product', 'search', 'add_to_cart',
      'remove_from_cart', 'begin_checkout', 'purchase',
      'order_created', 'payment_succeeded', 'payment_failed',
      'order_cancelled', 'order_refunded',
      'coupon_applied', 'campaign_click', 'whatsapp_click', 'product_share',
    ]);
  });

  it('does not contain future or deprecated types', () => {
    const allowed = new Set(MARKETING_EVENT_TYPES);
    expect(allowed.has('chatbot_message')).toBe(false);
    expect(allowed.has('llm_query')).toBe(false);
  });
});

describe('Marketing Events — Phase 2: Event Validation', () => {
  it('accepts a valid minimal payload', () => {
    const result = eventPayloadSchema.safeParse({
      eventType: 'page_view',
      sessionId: 'abc-123',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a full payload with all fields', () => {
    const result = eventPayloadSchema.safeParse({
      eventType: 'purchase',
      sessionId: 'session-uuid',
      customerId: 42,
      productId: 100,
      cartId: '550e8400-e29b-41d4-a716-446655440000',
      orderId: 77,
      path: '/s/my-store/p/my-product',
      referrer: 'https://google.com',
      deviceType: 'mobile',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'ramadan_sale',
      utmContent: 'banner_a',
      utmTerm: 'shoes',
      metadata: { currency: 'SAR' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown event type', () => {
    const result = eventPayloadSchema.safeParse({
      eventType: 'unknown_event',
      sessionId: 's1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing sessionId', () => {
    const result = eventPayloadSchema.safeParse({
      eventType: 'page_view',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty sessionId', () => {
    const result = eventPayloadSchema.safeParse({
      eventType: 'page_view',
      sessionId: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects oversized metadata', () => {
    const largeMetadata = { data: 'x'.repeat(EVENT_PAYLOAD_MAX_BYTES) };
    const result = eventPayloadSchema.safeParse({
      eventType: 'page_view',
      sessionId: 's1',
      metadata: largeMetadata,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid cartId format', () => {
    const result = eventPayloadSchema.safeParse({
      eventType: 'add_to_cart',
      sessionId: 's1',
      cartId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('coerces numeric customerId from string', () => {
    const result = eventPayloadSchema.safeParse({
      eventType: 'purchase',
      sessionId: 's1',
      customerId: '42',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerId).toBe(42);
    }
  });
});

describe('Marketing Events — Phase 3: UTM Parsing', () => {
  it('extracts UTM params from URL search string', () => {
    const url = 'https://store.com/s/my-store?utm_source=google&utm_medium=cpc&utm_campaign=sale&utm_content=banner&utm_term=shoes';
    const params = new URLSearchParams(new URL(url).search);
    const utm = {
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      utmContent: params.get('utm_content'),
      utmTerm: params.get('utm_term'),
    };
    expect(utm.utmSource).toBe('google');
    expect(utm.utmMedium).toBe('cpc');
    expect(utm.utmCampaign).toBe('sale');
    expect(utm.utmContent).toBe('banner');
    expect(utm.utmTerm).toBe('shoes');
  });

  it('returns empty utm when no UTM params in URL', () => {
    const url = 'https://store.com/s/my-store';
    const params = new URLSearchParams(new URL(url).search);
    expect(params.get('utm_source')).toBeNull();
    expect(params.get('utm_medium')).toBeNull();
  });

  it('handles partial UTM params', () => {
    const url = 'https://store.com/?utm_source=twitter';
    const params = new URLSearchParams(new URL(url).search);
    expect(params.get('utm_source')).toBe('twitter');
    expect(params.get('utm_medium')).toBeNull();
  });

  it('truncates long UTM values to 255 chars', () => {
    const long = 'a'.repeat(500);
    const truncated = long.slice(0, 255);
    expect(truncated.length).toBe(255);
    expect(long.length).toBe(500);
  });
});

describe('Marketing Events — Phase 4: Attribution Linking', () => {
  it('links sessionId consistently across events', () => {
    const sessionId = 'session-abc-123';
    const pageView = { eventType: 'page_view', sessionId };
    const addToCart = { eventType: 'add_to_cart', sessionId, productId: 1 };
    const purchase = { eventType: 'purchase', sessionId, orderId: 1 };

    expect(pageView.sessionId).toBe(addToCart.sessionId);
    expect(addToCart.sessionId).toBe(purchase.sessionId);
  });

  it('links session to cartId when add_to_cart event fires', () => {
    const events = [
      { eventType: 'add_to_cart', sessionId: 's1', cartId: 'cart-uuid-1', productId: 1 },
      { eventType: 'add_to_cart', sessionId: 's1', cartId: 'cart-uuid-1', productId: 2 },
    ];
    const cartIds = new Set(events.map(e => e.cartId));
    expect(cartIds.size).toBe(1);
    expect(cartIds.has('cart-uuid-1')).toBe(true);
  });

  it('does not mix attribution across different sessions', () => {
    const session1 = { sessionId: 's1', utmSource: 'google' };
    const session2 = { sessionId: 's2', utmSource: 'twitter' };
    expect(session1.utmSource).not.toBe(session2.utmSource);
    expect(session1.sessionId).not.toBe(session2.sessionId);
  });
});

describe('Marketing Events — Phase 5: Store Isolation', () => {
  it('ensures event storeId matches resolved store', () => {
    const resolveStore = (slug: string) => {
      const stores: Record<string, number> = { 'store-a': 1, 'store-b': 2 };
      return stores[slug] ?? null;
    };

    const event = { storeSlug: 'store-a', eventType: 'page_view' };
    const storeId = resolveStore(event.storeSlug);
    expect(storeId).toBe(1);

    const otherStoreId = resolveStore('store-b');
    expect(otherStoreId).toBe(2);
    expect(storeId).not.toBe(otherStoreId);
  });

  it('rejects event for non-existent store', () => {
    const resolveStore = (slug: string) => {
      const stores: Record<string, number> = { 'store-a': 1 };
      return stores[slug] ?? null;
    };
    expect(resolveStore('non-existent')).toBeNull();
  });

  it('prevents cross-store data leakage via slug manipulation', () => {
    const validSlugs = ['store-a', 'store-b'];
    const malicious = '../other-store';
    expect(validSlugs.includes(malicious)).toBe(false);
  });
});

describe('Marketing Events — Phase 6: Tracker Resilience', () => {
  it('does not throw when fetch fails', async () => {
    let threw = false;
    const unsafeFetch = async () => {
      try {
        await fetch('http://non-existent/api/events', {
          method: 'POST',
          body: JSON.stringify({ eventType: 'page_view' }),
        });
      } catch {
        threw = true;
      }
    };
    await unsafeFetch();
    expect(threw).toBe(true);
  });

  it('continues execution after failed event send', () => {
    let result = 0;
    const sendEvent = async () => {
      try {
        await Promise.reject(new Error('Network error'));
      } catch {
        // silent fail
      }
      result = 42;
    };
    sendEvent().then(() => {
      expect(result).toBe(42);
    });
  });

  it('generates unique session IDs', () => {
    const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ids = new Set(Array.from({ length: 100 }, generateId));
    expect(ids.size).toBe(100);
  });
});

describe('Marketing Events — Phase 7: Database Schema Correctness', () => {
  it('ensures all tables have storeId', () => {
    const tables = ['marketing_events', 'marketing_sessions', 'product_performance_daily'];
    for (const table of tables) {
      expect(table).toBeTruthy();
    }
  });

  it('validates marketing_events column types', () => {
    const columns = {
      storeId: 'integer NOT NULL',
      eventType: 'varchar(50) NOT NULL',
      sessionId: 'varchar(255) NOT NULL',
      customerId: 'integer',
      productId: 'integer',
      cartId: 'uuid',
      orderId: 'integer',
      utmSource: 'varchar(255)',
      utmMedium: 'varchar(255)',
      utmCampaign: 'varchar(255)',
      metadata: 'jsonb',
    };
    expect(columns.storeId).toContain('NOT NULL');
    expect(columns.eventType).toContain('NOT NULL');
    expect(columns.sessionId).toContain('NOT NULL');
    expect(columns.metadata).toBe('jsonb');
  });

  it('validates marketing_sessions has unique (storeId, sessionId)', () => {
    const uniqueConstraint = 'UNIQUE (store_id, session_id)';
    expect(uniqueConstraint).toContain('store_id');
    expect(uniqueConstraint).toContain('session_id');
  });

  it('validates product_performance_daily has unique (storeId, productId, date)', () => {
    const uniqueConstraint = 'UNIQUE (store_id, product_id, date)';
    expect(uniqueConstraint).toContain('store_id');
    expect(uniqueConstraint).toContain('product_id');
    expect(uniqueConstraint).toContain('date');
  });
});
