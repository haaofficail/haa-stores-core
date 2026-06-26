// Guest order-tracking phone persistence contract.
//
// Regression for the "الطلب غير موجود" bug: after a successful checkout the
// confirmation page (OrderSuccess) used to show the "enter phone to track"
// gate because Checkout never persisted the phone the buyer had just typed.
// The fix routes both sides through `order-track-storage`:
//   - Checkout calls saveTrackPhone(orderNumber, phone) on every confirm exit
//   - OrderSuccess calls getTrackPhone(orderNumber) on mount and auto-loads
//
// These tests cover the helper behaviour + a source contract proving both
// sides use the shared helper (so the key can never drift apart again).

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Minimal in-memory sessionStorage stub (vitest runs in node, no DOM).
class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
(globalThis as unknown as { sessionStorage: MemoryStorage }).sessionStorage = new MemoryStorage();

import {
  trackPhoneKey,
  saveTrackPhone,
  getTrackPhone,
} from '../apps/storefront/src/lib/order-track-storage';

beforeEach(() => {
  (globalThis as unknown as { sessionStorage: MemoryStorage }).sessionStorage.clear();
});

describe('order-track-storage helper', () => {
  it('round-trips a saved phone for the new order (confirmation auto-loads)', () => {
    saveTrackPhone('ORD-1-00008', '0500000002');
    expect(getTrackPhone('ORD-1-00008')).toBe('0500000002');
  });

  it('uses the exact key OrderSuccess historically read (track_phone_<orderNumber>)', () => {
    expect(trackPhoneKey('ORD-1-00008')).toBe('track_phone_ORD-1-00008');
  });

  it('trims surrounding whitespace before storing', () => {
    saveTrackPhone('ORD-9', '  0501112222  ');
    expect(getTrackPhone('ORD-9')).toBe('0501112222');
  });

  it('returns null for an order with no saved phone (gate stays — no leak)', () => {
    expect(getTrackPhone('ORD-UNKNOWN')).toBeNull();
  });

  it('does not store an empty/whitespace phone', () => {
    saveTrackPhone('ORD-2', '   ');
    expect(getTrackPhone('ORD-2')).toBeNull();
  });

  it('keeps orders isolated — phone for order A is not returned for order B', () => {
    saveTrackPhone('ORD-A', '0500000001');
    expect(getTrackPhone('ORD-B')).toBeNull();
  });
});

// ── Source contract: both sides must use the shared helper ──────────────
const CHECKOUT_SRC = readFileSync(
  resolve(__dirname, '../apps/storefront/src/pages/Checkout.tsx'),
  'utf-8',
);
const ORDER_SUCCESS_SRC = readFileSync(
  resolve(__dirname, '../apps/storefront/src/pages/OrderSuccess.tsx'),
  'utf-8',
);

describe('checkout/order-success use the shared track-phone helper', () => {
  it('Checkout persists the phone via saveTrackPhone on confirm', () => {
    expect(CHECKOUT_SRC).toContain("from '@/lib/order-track-storage'");
    expect(CHECKOUT_SRC).toContain('saveTrackPhone(result.order.orderNumber, customer.phone)');
  });

  it('OrderSuccess reads the phone via getTrackPhone (no inline key)', () => {
    expect(ORDER_SUCCESS_SRC).toContain('getTrackPhone(orderNumber)');
    // The old inline key string must be gone so the two sides cannot drift.
    expect(ORDER_SUCCESS_SRC).not.toContain('sessionStorage.getItem(`track_phone_');
  });
});
