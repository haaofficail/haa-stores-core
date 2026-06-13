import { describe, it, expect } from 'vitest';
import { ORDER_STATUS_TRANSITIONS } from '@haa/shared';

describe('Order Status State Machine', () => {
  describe('valid transitions', () => {
    const validCases: Array<[string, string]> = [
      ['draft', 'pending_payment'],
      ['draft', 'cancelled'],
      ['pending_payment', 'confirmed'],
      ['pending_payment', 'cancelled'],
      ['confirmed', 'processing'],
      ['confirmed', 'cancelled'],
      ['processing', 'ready_to_ship'],
      ['processing', 'ready_for_pickup'],
      ['processing', 'cancelled'],
      ['ready_to_ship', 'shipped'],
      ['ready_to_ship', 'cancelled'],
      ['ready_for_pickup', 'picked_up'],
      ['ready_for_pickup', 'cancelled'],
      ['shipped', 'delivered'],
      ['shipped', 'returned_to_sender'],
      ['delivered', 'completed'],
      ['delivered', 'returned'],
      ['completed', 'returned'],
      ['completed', 'refunded'],
      ['returned', 'refunded'],
    ];

    for (const [from, to] of validCases) {
      it(`allows ${from} → ${to}`, () => {
        expect(ORDER_STATUS_TRANSITIONS[from]).toContain(to);
      });
    }
  });

  describe('invalid transitions', () => {
    const invalidCases: Array<[string, string]> = [
      ['draft', 'confirmed'],
      ['draft', 'completed'],
      ['draft', 'shipped'],
      ['pending_payment', 'completed'],
      ['pending_payment', 'shipped'],
      ['confirmed', 'pending_payment'],
      ['shipped', 'completed'],
      ['cancelled', 'confirmed'],
      ['cancelled', 'processing'],
      ['cancelled', 'shipped'],
      ['completed', 'confirmed'],
      ['completed', 'processing'],
      ['refunded', 'confirmed'],
      ['refunded', 'cancelled'],
      ['returned', 'completed'],
    ];

    for (const [from, to] of invalidCases) {
      it(`rejects ${from} → ${to}`, () => {
        const allowed = ORDER_STATUS_TRANSITIONS[from] ?? [];
        expect(allowed).not.toContain(to);
      });
    }
  });

  describe('terminal states', () => {
    const terminalStates = ['cancelled', 'refunded', 'picked_up'];
    for (const state of terminalStates) {
      it(`${state} has no outgoing transitions`, () => {
        expect(ORDER_STATUS_TRANSITIONS[state]).toEqual([]);
      });
    }
  });

  describe('all states have entries', () => {
    const allStates = [
      'draft', 'checkout_started', 'pending_payment', 'confirmed',
      'processing', 'ready_to_ship', 'ready_for_pickup', 'shipped',
      'delivered', 'picked_up', 'completed', 'cancelled',
      'returned', 'refunded', 'partially_refunded',
    ];

    for (const state of allStates) {
      it(`${state} exists in transitions map`, () => {
        expect(ORDER_STATUS_TRANSITIONS).toHaveProperty(state);
        expect(Array.isArray(ORDER_STATUS_TRANSITIONS[state])).toBe(true);
      });
    }
  });

    describe('transition validation logic', () => {
    it('rejects cancelled → confirmed transition', () => {
      const allowed = ORDER_STATUS_TRANSITIONS['cancelled'] ?? [];
      expect(allowed).not.toContain('confirmed');
    });

    it('rejects draft → shipped transition', () => {
      const allowed = ORDER_STATUS_TRANSITIONS['draft'] ?? [];
      expect(allowed).not.toContain('shipped');
    });
  });
});
