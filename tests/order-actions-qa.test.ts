import { describe, it, expect } from 'vitest';
import { getOrderActions } from '../apps/merchant-dashboard/src/lib/order-actions';

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;
type OrderLike = Record<string, any>;

function order(overrides: DeepPartial<OrderLike> = {}): OrderLike {
  return {
    id: 1,
    status: 'confirmed',
    fulfillmentType: 'shipping',
    paymentMethod: 'bank_transfer',
    paymentStatus: 'paid',
    giftOptions: null,
    sendAsGift: false,
    giftMessage: null,
    shipment: null,
    ...overrides,
  };
}

function bySection(actions: ReturnType<typeof getOrderActions>, section: string) {
  return actions.actions.filter(a => a.section === section);
}

function keys(actions: ReturnType<typeof getOrderActions>, section?: string) {
  const filtered = section ? bySection(actions, section) : actions.actions;
  return filtered.map(a => a.key);
}

function hasAction(actions: ReturnType<typeof getOrderActions>, key: string) {
  return actions.actions.some(a => a.key === key);
}

describe('QA: Order Actions — Full Scenario Coverage', () => {
  // ─── SHIPPING FLOW ──────────────────────────────────────────────────

  describe('Shipping flow (fulfillmentType=shipping)', () => {
    it('pending_payment: confirm + cancel', () => {
      const a = getOrderActions(order({ status: 'pending_payment' }));
      expect(keys(a, 'primary')).toEqual(['confirm']);
      expect(keys(a, 'danger')).toEqual(['cancel']);
    });

    it('confirmed: process + cancel', () => {
      const a = getOrderActions(order({ status: 'confirmed' }));
      expect(keys(a, 'primary')).toEqual(['process']);
      expect(keys(a, 'danger')).toEqual(['cancel']);
      expect(a.isPickup).toBe(false);
    });

    it('processing: ready_to_ship + cancel', () => {
      const a = getOrderActions(order({ status: 'processing' }));
      expect(keys(a, 'primary')).toEqual(['ready_to_ship']);
      expect(keys(a, 'danger')).toEqual(['cancel']);
    });

    it('ready_to_ship without shipment: create_label + cancel', () => {
      const a = getOrderActions(order({ status: 'ready_to_ship', shipment: null }));
      expect(keys(a, 'shipping')).toEqual(['create_label']);
      expect(keys(a, 'danger')).toEqual(['cancel']);
      expect(hasAction(a, 'hand_to_carrier')).toBe(false);
    });

    it('ready_to_ship with label but no tracking: print_label + download_pdf + cancel', () => {
      const a = getOrderActions(order({ status: 'ready_to_ship', shipment: { id: 1, labelUrl: 'http://ex.com/label' } }));
      expect(keys(a, 'shipping')).toEqual(['print_label', 'download_pdf']);
      expect(hasAction(a, 'copy_tracking')).toBe(false);
      expect(hasAction(a, 'hand_to_carrier')).toBe(true);
      expect(keys(a, 'danger')).toEqual(['cancel']);
    });

    it('ready_to_ship with label + tracking: print, download, copy, hand_to_carrier', () => {
      const a = getOrderActions(order({ status: 'ready_to_ship', shipment: { id: 1, labelUrl: 'x', trackingNumber: 'TN123' } }));
      expect(keys(a, 'shipping')).toEqual(['print_label', 'download_pdf', 'copy_tracking']);
      expect(hasAction(a, 'hand_to_carrier')).toBe(true);
    });

    it('ready_to_ship with label + tracking + trackingUrl: all shipping actions', () => {
      const a = getOrderActions(order({ status: 'ready_to_ship', shipment: { id: 1, labelUrl: 'x', trackingNumber: 'TN123', trackingUrl: 'http://ex.com/track' } }));
      expect(keys(a, 'shipping')).toEqual(['print_label', 'download_pdf', 'copy_tracking', 'open_tracking']);
      expect(hasAction(a, 'hand_to_carrier')).toBe(true);
    });

    it('shipped: resend_tracking + deliver + return', () => {
      const a = getOrderActions(order({ status: 'shipped', shipment: { id: 1, trackingNumber: 'TN123' } }));
      expect(keys(a, 'shipping')).toContain('resend_tracking');
      expect(keys(a, 'primary')).toContain('deliver');
      expect(keys(a, 'danger')).toContain('return');
    });

    it('delivered: complete + return', () => {
      const a = getOrderActions(order({ status: 'delivered' }));
      expect(keys(a, 'primary')).toEqual(['complete']);
      expect(keys(a, 'danger')).toEqual(['return']);
    });

    it('returned: refund', () => {
      const a = getOrderActions(order({ status: 'returned' }));
      expect(keys(a, 'danger')).toContain('refund');
    });

    it('terminal states have no actions', () => {
      for (const s of ['completed', 'cancelled', 'refunded', 'partially_refunded', 'returned_to_sender']) {
        const a = getOrderActions(order({ status: s }));
        expect(a.actions.length).toBe(0);
      }
    });
  });

  // ─── PICKUP FLOW ────────────────────────────────────────────────────

  describe('Pickup flow (fulfillmentType=local_pickup)', () => {
    it('confirmed: process + cancel (pickup)', () => {
      const a = getOrderActions(order({ status: 'confirmed', fulfillmentType: 'local_pickup' }));
      expect(keys(a, 'primary')).toEqual(['process']);
      expect(keys(a, 'danger')).toEqual(['cancel']);
      expect(a.isPickup).toBe(true);
    });

    it('processing: ready_for_pickup + cancel', () => {
      const a = getOrderActions(order({ status: 'processing', fulfillmentType: 'local_pickup' }));
      expect(keys(a, 'primary')).toEqual(['ready_for_pickup']);
      expect(keys(a, 'danger')).toEqual(['cancel']);
    });

    it('ready_for_pickup: confirm_pickup + cancel', () => {
      const a = getOrderActions(order({ status: 'ready_for_pickup', fulfillmentType: 'local_pickup' }));
      expect(keys(a, 'primary')).toEqual(['confirm_pickup']);
      expect(keys(a, 'danger')).toEqual(['cancel']);
    });

    it('picked_up: no actions (terminal)', () => {
      const a = getOrderActions(order({ status: 'picked_up', fulfillmentType: 'local_pickup' }));
      expect(a.actions.length).toBe(0);
    });

    it('never has shipping actions', () => {
      const a = getOrderActions(order({ status: 'ready_for_pickup', fulfillmentType: 'local_pickup' }));
      expect(keys(a, 'shipping').length).toBe(0);
    });

    it('never has create_label or hand_to_carrier', () => {
      const a = getOrderActions(order({ status: 'ready_for_pickup', fulfillmentType: 'local_pickup' }));
      expect(hasAction(a, 'create_label')).toBe(false);
      expect(hasAction(a, 'hand_to_carrier')).toBe(false);
    });
  });

  // ─── COD FLOW ───────────────────────────────────────────────────────

  describe('COD flow (paymentMethod=cash_on_delivery)', () => {
    it('isCOD=true for COD orders', () => {
      const a = getOrderActions(order({ paymentMethod: 'cash_on_delivery' }));
      expect(a.isCOD).toBe(true);
    });

    it('isCOD=false for non-COD orders', () => {
      const a = getOrderActions(order({ paymentMethod: 'bank_transfer' }));
      expect(a.isCOD).toBe(false);
    });

    it('COD delivered (shipping): collect, failed, refused, complete, return', () => {
      const a = getOrderActions(order({ status: 'delivered', paymentMethod: 'cash_on_delivery' }));
      expect(keys(a, 'payment')).toEqual(['collect_payment', 'collection_failed', 'customer_refused']);
      expect(keys(a, 'primary')).toEqual(['complete']);
      expect(keys(a, 'danger')).toEqual(['return']);
    });

    it('COD ready_for_pickup (pickup): no COD actions yet', () => {
      const a = getOrderActions(order({ status: 'ready_for_pickup', fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery' }));
      expect(keys(a, 'payment').length).toBe(0);
      expect(keys(a, 'primary')).toEqual(['confirm_pickup']);
    });

    it('COD picked_up (pickup): collect_payment action available', () => {
      const a = getOrderActions(order({ status: 'picked_up', fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery' }));
      expect(keys(a, 'payment')).toEqual(['collect_payment']);
    });

    it('COD not delivered: no payment actions', () => {
      for (const s of ['confirmed', 'processing', 'ready_to_ship', 'shipped']) {
        const a = getOrderActions(order({ status: s, paymentMethod: 'cash_on_delivery' }));
        expect(keys(a, 'payment').length).toBe(0, `expected no payment actions at status=${s}`);
      }
    });
  });

  // ─── GIFT FLOW ──────────────────────────────────────────────────────

  describe('Gift flow', () => {
    it('hasGift=false for normal order', () => {
      expect(getOrderActions(order()).hasGift).toBe(false);
    });

    it('hasGift=true with sendAsGift', () => {
      expect(getOrderActions(order({ sendAsGift: true })).hasGift).toBe(true);
    });

    it('hasGift=true with giftMessage', () => {
      expect(getOrderActions(order({ giftMessage: 'Thanks!' })).hasGift).toBe(true);
    });

    it('hasGift=true with giftOptions.sendAsGift', () => {
      expect(getOrderActions(order({ giftOptions: { sendAsGift: true } })).hasGift).toBe(true);
    });

    it('hasGift=true with giftOptions.message', () => {
      expect(getOrderActions(order({ giftOptions: { message: 'Thanks!' } })).hasGift).toBe(true);
    });

    it('hasGift=true with giftOptions.recipientName', () => {
      expect(getOrderActions(order({ giftOptions: { recipientName: 'Ahmed' } })).hasGift).toBe(true);
    });

    it('view/print/copy gift message only when message exists', () => {
      const withMsg = getOrderActions(order({ sendAsGift: true, giftOptions: { message: 'Hello' } }));
      expect(hasAction(withMsg, 'view_gift_message')).toBe(true);
      expect(hasAction(withMsg, 'print_gift_message')).toBe(true);
      expect(hasAction(withMsg, 'copy_gift_message')).toBe(true);

      const without = getOrderActions(order({ sendAsGift: true, giftOptions: null }));
      expect(hasAction(without, 'view_gift_message')).toBe(false);
      expect(hasAction(without, 'print_gift_message')).toBe(false);
      expect(hasAction(without, 'copy_gift_message')).toBe(false);
    });

    it('notify_buyer always present for gift orders', () => {
      expect(hasAction(getOrderActions(order({ sendAsGift: true })), 'notify_buyer')).toBe(true);
    });

    it('notify_recipient only when recipientName or recipientPhone exists', () => {
      const withName = getOrderActions(order({ sendAsGift: true, giftOptions: { recipientName: 'Ahmed' } }));
      expect(hasAction(withName, 'notify_recipient')).toBe(true);

      const withPhone = getOrderActions(order({ sendAsGift: true, giftOptions: { recipientPhone: '0555000000' } }));
      expect(hasAction(withPhone, 'notify_recipient')).toBe(true);

      const neither = getOrderActions(order({ sendAsGift: true }));
      expect(hasAction(neither, 'notify_recipient')).toBe(false);
    });
  });

  // ─── SECTION SEPARATION ─────────────────────────────────────────────

  describe('Section separation — no cross-contamination', () => {
    const scenarios: Array<[string, OrderLike]> = [
      ['shipping+COD+gift', order({ status: 'delivered', paymentMethod: 'cash_on_delivery', sendAsGift: true, giftOptions: { message: 'Hi', recipientPhone: '0555' } })],
      ['pickup+COD+gift', order({ status: 'picked_up', fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery', sendAsGift: true, giftOptions: { message: 'Hi' } })],
      ['ready_to_ship+label+gift', order({ status: 'ready_to_ship', sendAsGift: true, giftOptions: { message: 'Hi' }, shipment: { id: 1, labelUrl: 'x', trackingNumber: 'TN' } })],
    ];

    const allSections = ['primary', 'payment', 'shipping', 'pickup', 'gift', 'documents', 'danger'];
    const sectionKeys: Record<string, string[]> = {
      payment: ['collect_payment', 'collection_failed', 'customer_refused'],
      shipping: ['create_label', 'print_label', 'download_pdf', 'copy_tracking', 'open_tracking', 'resend_tracking', 'hand_to_carrier'],
      pickup: ['confirm_pickup', 'ready_for_pickup'],
      gift: ['view_gift_message', 'print_gift_message', 'copy_gift_message', 'notify_buyer', 'notify_recipient'],
    };

    for (const [label, ord] of scenarios) {
      it(`${label}: no action key appears in wrong section`, () => {
        const a = getOrderActions(ord);
        for (const [section, expectedKeys] of Object.entries(sectionKeys)) {
          const foundKeys = keys(a, section);
          for (const k of foundKeys) {
            expect(expectedKeys).toContain(k);
          }
        }
      });
    }

    it('gift actions never appear outside gift section', () => {
      const a = getOrderActions(order({ status: 'confirmed', sendAsGift: true, giftOptions: { message: 'Hi' } }));
      for (const s of allSections) {
        if (s === 'gift') continue;
        for (const k of keys(a, s)) {
          expect(k).not.toMatch(/gift|notify/);
        }
      }
    });
  });

  // ─── RESOLVER: SOURCE-AGNOSTIC ─────────────────────────────────────

  describe('Resolver is source-agnostic (page filters external orders)', () => {
    for (const src of ['salla', 'zid', 'noon', 'amazon']) {
      it(`${src}: resolver returns shipping actions`, () => {
        for (const status of ['confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered']) {
          const a = getOrderActions(order({ status, source: src }));
          expect(a.actions.length).toBeGreaterThan(0, `expected actions for ${src} at ${status}`);
        }
      });

      it(`${src}: resolver returns pickup actions`, () => {
        for (const status of ['confirmed', 'processing', 'ready_for_pickup']) {
          const a = getOrderActions(order({ status, source: src, fulfillmentType: 'local_pickup' }));
          expect(a.actions.length).toBeGreaterThan(0, `expected actions for ${src} at ${status}`);
        }
      });

      it(`${src}: hasGift/isPickup/isCOD still computed correctly`, () => {
        const a = getOrderActions(order({ status: 'confirmed', source: src, fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery', sendAsGift: true }));
        expect(a.hasGift).toBe(true);
        expect(a.isPickup).toBe(true);
        expect(a.isCOD).toBe(true);
      });
    }
  });

  // ─── FLAGS CONSISTENCY ──────────────────────────────────────────────

  describe('Flag consistency', () => {
    it('isPickup = true iff fulfillmentType is local_pickup', () => {
      expect(getOrderActions(order({ fulfillmentType: 'local_pickup' })).isPickup).toBe(true);
      expect(getOrderActions(order({ fulfillmentType: 'shipping' })).isPickup).toBe(false);
      expect(getOrderActions(order({ fulfillmentType: null })).isPickup).toBe(false);
      expect(getOrderActions(order({ fulfillmentType: undefined })).isPickup).toBe(false);
    });

    it('isCOD = true iff paymentMethod is cash_on_delivery', () => {
      expect(getOrderActions(order({ paymentMethod: 'cash_on_delivery' })).isCOD).toBe(true);
      expect(getOrderActions(order({ paymentMethod: 'bank_transfer' })).isCOD).toBe(false);
      expect(getOrderActions(order({ paymentMethod: 'card' })).isCOD).toBe(false);
      expect(getOrderActions(order({ paymentMethod: 'tabby' })).isCOD).toBe(false);
      expect(getOrderActions(order({ paymentMethod: undefined })).isCOD).toBe(false);
    });
  });

  // ─── GIFT DOES NOT AFFECT TRANSITIONS ───────────────────────────────

  describe('Gift does not affect transitions', () => {
    const statuses = ['pending_payment', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'ready_for_pickup'];
    for (const s of statuses) {
      it(`${s}: same primary+danger actions with or without gift`, () => {
        const ft = s === 'ready_for_pickup' ? 'local_pickup' : 'shipping';
        const normal = getOrderActions(order({ status: s, fulfillmentType: ft }));
        const gifted = getOrderActions(order({ status: s, fulfillmentType: ft, sendAsGift: true }));
        const normalKeys = normal.actions.filter(a => a.section !== 'gift').map(a => a.key).sort();
        const giftedKeys = gifted.actions.filter(a => a.section !== 'gift').map(a => a.key).sort();
        expect(giftedKeys).toEqual(normalKeys);
      });
    }
  });

  // ─── PRIMARY ACTION (UX Simplification) ────────────────────────────

  describe('primaryAction — single next action', () => {
    it('shipping flow: primaryAction set correctly per status', () => {
      expect(getOrderActions(order({ status: 'pending_payment' })).primaryAction?.key).toBe('confirm');
      expect(getOrderActions(order({ status: 'confirmed' })).primaryAction?.key).toBe('process');
      expect(getOrderActions(order({ status: 'processing' })).primaryAction?.key).toBe('ready_to_ship');
      const rts = getOrderActions(order({ status: 'ready_to_ship', shipment: { id: 1, labelUrl: 'x', trackingNumber: 'TN' } }));
      expect(rts.primaryAction?.key).toBe('hand_to_carrier');
      const shipped = getOrderActions(order({ status: 'shipped', shipment: { id: 1, trackingNumber: 'TN' } }));
      expect(shipped.primaryAction?.key).toBe('deliver');
      expect(getOrderActions(order({ status: 'delivered' })).primaryAction?.key).toBe('complete');
    });

    it('pickup flow: primaryAction set correctly per status', () => {
      expect(getOrderActions(order({ status: 'confirmed', fulfillmentType: 'local_pickup' })).primaryAction?.key).toBe('process');
      expect(getOrderActions(order({ status: 'processing', fulfillmentType: 'local_pickup' })).primaryAction?.key).toBe('ready_for_pickup');
      expect(getOrderActions(order({ status: 'ready_for_pickup', fulfillmentType: 'local_pickup' })).primaryAction?.key).toBe('confirm_pickup');
    });

    it('COD collect_payment is primaryAction when no primary section actions exist', () => {
      const deliveredCOD = getOrderActions(order({ status: 'delivered', paymentMethod: 'cash_on_delivery' }));
      // delivered + COD still has 'complete' as primary, so collect is not primary
      expect(deliveredCOD.primaryAction?.key).toBe('complete');
      // But picked_up + COD has no primary section actions, so collect becomes primary
      const pickedCOD = getOrderActions(order({ status: 'picked_up', fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery' }));
      expect(pickedCOD.primaryAction?.key).toBe('collect_payment');
    });

    it('ready_to_ship without label: primaryAction is null (must create label first)', () => {
      const a = getOrderActions(order({ status: 'ready_to_ship', shipment: null }));
      expect(a.primaryAction).toBeNull();
    });

    it('terminal states: primaryAction is null', () => {
      for (const s of ['completed', 'cancelled', 'refunded', 'partially_refunded', 'returned_to_sender']) {
        expect(getOrderActions(order({ status: s })).primaryAction).toBeNull();
      }
    });

    it('picked_up (no COD): primaryAction is null', () => {
      const a = getOrderActions(order({ status: 'picked_up', fulfillmentType: 'local_pickup' }));
      expect(a.primaryAction).toBeNull();
    });
  });

  // ─── ACTION DESCRIPTION (UX Simplification) ─────────────────────────

  describe('action description — UI helper text', () => {
    it('primary actions have description', () => {
      const cases: Array<{ key: string; status: string; pickup?: boolean; shipment?: any }> = [
        { key: 'confirm', status: 'pending_payment' },
        { key: 'process', status: 'confirmed' },
        { key: 'ready_to_ship', status: 'processing' },
        { key: 'hand_to_carrier', status: 'ready_to_ship', shipment: { id: 1, labelUrl: 'x', trackingNumber: 'TN' } },
        { key: 'deliver', status: 'shipped', shipment: { id: 1, trackingNumber: 'TN' } },
        { key: 'complete', status: 'delivered' },
        { key: 'ready_for_pickup', status: 'processing', pickup: true },
        { key: 'confirm_pickup', status: 'ready_for_pickup', pickup: true },
      ];
      for (const c of cases) {
        const o = getOrderActions(order({ status: c.status, fulfillmentType: c.pickup ? 'local_pickup' : 'shipping', shipment: c.shipment ?? null }));
        const action = o.actions.find(a => a.key === c.key);
        expect(action?.description, `description missing for ${c.key}`).toBeTruthy();
        expect(typeof action?.description, `description type wrong for ${c.key}`).toBe('string');
      }
    });

    it('collect_payment has description', () => {
      const a = getOrderActions(order({ status: 'picked_up', fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery' }));
      const collect = a.actions.find(act => act.key === 'collect_payment');
      expect(collect?.description).toBeTruthy();
      expect(typeof collect?.description).toBe('string');
    });

    it('shipping utility actions do not have description', () => {
      const a = getOrderActions(order({ status: 'ready_to_ship', shipment: { id: 1, labelUrl: 'x', trackingNumber: 'TN', trackingUrl: 'http://ex.com/track' } }));
      const shipActions = a.actions.filter(act => act.section === 'shipping');
      for (const act of shipActions) {
        expect(act.description).toBeUndefined();
      }
    });
  });
});
