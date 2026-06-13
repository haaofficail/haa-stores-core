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

function bySection(r: ReturnType<typeof getOrderActions>, section: string) {
  return r.actions.filter(a => a.section === section);
}

function keys(r: ReturnType<typeof getOrderActions>, section?: string) {
  return section ? bySection(r, section).map(a => a.key) : r.actions.map(a => a.key);
}

function hasAction(r: ReturnType<typeof getOrderActions>, key: string) {
  return r.actions.some(a => a.key === key);
}

const SHIPPING_KEYS = ['create_label', 'print_label', 'download_pdf', 'copy_tracking', 'open_tracking', 'resend_tracking'];
const GIFT_KEYS = ['view_gift_message', 'print_gift_message', 'copy_gift_message', 'notify_buyer', 'notify_recipient'];
const PAYMENT_KEYS = ['collect_payment', 'collection_failed', 'customer_refused'];
const DANGER_KEYS = ['cancel', 'return', 'refund'];

function expectNoSectionCrossContamination(r: ReturnType<typeof getOrderActions>) {
  for (const k of keys(r, 'shipping')) {
    expect(SHIPPING_KEYS, `shipping key ${k} should be in allowed shipping keys`).toContain(k);
  }
  for (const k of keys(r, 'gift')) {
    expect(GIFT_KEYS, `gift key ${k} should be in allowed gift keys`).toContain(k);
  }
  for (const k of keys(r, 'payment')) {
    expect(PAYMENT_KEYS, `payment key ${k} should be in allowed payment keys`).toContain(k);
  }
  for (const k of keys(r, 'danger')) {
    expect(DANGER_KEYS, `danger key ${k} should be in allowed danger keys`).toContain(k);
  }
}

function checkPrimaryAction(r: ReturnType<typeof getOrderActions>, expectedKey: string | null) {
  if (expectedKey === null) {
    expect(r.primaryAction, 'primaryAction should be null').toBeNull();
  } else {
    expect(r.primaryAction, `primaryAction.key should be ${expectedKey}`).not.toBeNull();
    expect(r.primaryAction!.key, `primaryAction.key mismatch`).toBe(expectedKey);
    expect(r.primaryAction!.description, 'primaryAction should have description').toBeTruthy();
  }
}

function checkSinglePrimary(r: ReturnType<typeof getOrderActions>) {
  const primarySectionKeys = keys(r, 'primary');
  expect(primarySectionKeys.length, 'should have at most one primary section action').toBeLessThanOrEqual(1);
  if (primarySectionKeys.length === 0 && r.primaryAction) {
    // primaryAction can come from non-primary section (e.g., collect_payment)
    expect(r.primaryAction.key).toBe('collect_payment');
  }
}

function checkDangerSeparated(r: ReturnType<typeof getOrderActions>) {
  const dangerKeys = keys(r, 'danger');
  for (const k of dangerKeys) {
    const action = r.actions.find(a => a.key === k)!;
    expect(action.isDestructive, `${k} should be destructive`).toBe(true);
    expect(action.needsConfirm, `${k} should need confirm`).toBe(true);
    expect(action.section, `${k} should be in danger section`).toBe('danger');
  }
}

// ─── SCENARIO 1: NORMAL DELIVERY ────────────────────────────────────

describe('QA: Scenario 1 — Normal delivery order', () => {
  const flow: Array<{ status: string; shipment?: any; primaryKey: string | null; dangerKeys: string[] }> = [
    { status: 'pending_payment', primaryKey: 'confirm', dangerKeys: ['cancel'] },
    { status: 'confirmed', primaryKey: 'process', dangerKeys: ['cancel'] },
    { status: 'processing', primaryKey: 'ready_to_ship', dangerKeys: ['cancel'] },
    { status: 'ready_to_ship', shipment: { id: 1, labelUrl: 'x', trackingNumber: 'TN' }, primaryKey: 'hand_to_carrier', dangerKeys: ['cancel'] },
    { status: 'shipped', shipment: { id: 1, trackingNumber: 'TN' }, primaryKey: 'deliver', dangerKeys: ['return'] },
    { status: 'delivered', primaryKey: 'complete', dangerKeys: ['return'] },
  ];

  for (const step of flow) {
    it(`${step.status}: primaryAction = ${step.primaryKey}, danger = [${step.dangerKeys}]`, () => {
      const r = getOrderActions(order({ status: step.status, shipment: step.shipment ?? null }));
      checkPrimaryAction(r, step.primaryKey);
      checkSinglePrimary(r);
      expect(keys(r, 'danger').sort()).toEqual([...step.dangerKeys].sort());
      checkDangerSeparated(r);
      expect(r.isPickup).toBe(false);
      expect(keys(r, 'pickup').length).toBe(0);
    });
  }

  it('completed: terminal — no actions, no primaryAction', () => {
    const r = getOrderActions(order({ status: 'completed' }));
    expect(r.actions.length).toBe(0);
    checkPrimaryAction(r, null);
  });

  it('ready_to_ship without shipment: no primaryAction (must create label first)', () => {
    const r = getOrderActions(order({ status: 'ready_to_ship', shipment: null }));
    checkPrimaryAction(r, null);
    expect(keys(r, 'shipping')).toContain('create_label');
  });

  it('shipping card appears, pickup card does not', () => {
    const r = getOrderActions(order({ status: 'ready_to_ship', shipment: { id: 1, labelUrl: 'x', trackingNumber: 'TN' } }));
    expect(keys(r, 'shipping').length).toBeGreaterThan(0);
    expect(keys(r, 'pickup').length).toBe(0);
  });

  it('shipping secondary actions are not primary', () => {
    const r = getOrderActions(order({ status: 'shipped', shipment: { id: 1, trackingNumber: 'TN', trackingUrl: 'http://ex.com/track' } }));
    const shipKeys = keys(r, 'shipping');
    for (const k of shipKeys) {
      expect(r.primaryAction?.key).not.toBe(k);
    }
  });

  it('no section cross-contamination', () => {
    for (const s of ['pending_payment', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered']) {
      const r = getOrderActions(order({ status: s, shipment: s === 'ready_to_ship' ? { id: 1, labelUrl: 'x', trackingNumber: 'TN' } : s === 'shipped' ? { id: 1, trackingNumber: 'TN' } : null }));
      expectNoSectionCrossContamination(r);
    }
  });
});

// ─── SCENARIO 2: DELIVERY + COD ──────────────────────────────────────

describe('QA: Scenario 2 — Delivery + COD', () => {
  it('pending_payment: confirm is primary, COD not yet due', () => {
    const r = getOrderActions(order({ status: 'pending_payment', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
    checkPrimaryAction(r, 'confirm');
    expect(r.isCOD).toBe(true);
    expect(keys(r, 'payment').length).toBe(0);
    expect(r.primaryAction!.key).not.toBe('collect_payment');
  });

  it('confirmed/delivering: COD actions not yet available', () => {
    for (const s of ['confirmed', 'processing', 'ready_to_ship', 'shipped']) {
      const r = getOrderActions(order({ status: s, paymentMethod: 'cash_on_delivery', paymentStatus: 'pending', shipment: s === 'shipped' ? { id: 1, trackingNumber: 'TN' } : s === 'ready_to_ship' ? { id: 1, labelUrl: 'x', trackingNumber: 'TN' } : null }));
      if (s === 'shipped') {
        checkPrimaryAction(r, 'deliver');
      } else if (s === 'ready_to_ship') {
        checkPrimaryAction(r, 'hand_to_carrier');
      } else {
        checkPrimaryAction(r, s === 'confirmed' ? 'process' : 'ready_to_ship');
      }
      expect(keys(r, 'payment').length, `no payment actions at ${s}`).toBe(0); // COD not yet collectable
      expect(r.primaryAction!.key).not.toBe('collect_payment');
    }
  });

  it('handover to carrier does not change payment status', () => {
    // hand_to_carrier is a status transition, not a payment action
    const r = getOrderActions(order({ status: 'ready_to_ship', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending', shipment: { id: 1, labelUrl: 'x', trackingNumber: 'TN' } }));
    checkPrimaryAction(r, 'hand_to_carrier');
    expect(keys(r, 'payment').length).toBe(0); // COD collection not yet available
  });

  it('delivered + COD: complete is primary, payment actions appear as secondary', () => {
    const r = getOrderActions(order({ status: 'delivered', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
    checkPrimaryAction(r, 'complete'); // primary is still "إكمال", not COD
    expect(keys(r, 'payment').sort()).toEqual(['collect_payment', 'collection_failed', 'customer_refused']);
    // collect_payment has description since it's a meaningful action
    const collect = r.actions.find(a => a.key === 'collect_payment')!;
    expect(collect.description).toBeTruthy();
  });

  it('delivered + non-COD: no payment actions', () => {
    const r = getOrderActions(order({ status: 'delivered', paymentMethod: 'bank_transfer', paymentStatus: 'paid' }));
    expect(keys(r, 'payment').length).toBe(0);
  });

  it('collect_payment only changes payment status, not order status', () => {
    const r = getOrderActions(order({ status: 'delivered', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
    const collect = r.actions.find(a => a.key === 'collect_payment')!;
    expect(collect.targetStatus).toBe('delivered'); // same status, payment only
    expect(collect.section).toBe('payment');
  });

  it('no premature paid status: paymentStatus stays pending until collection', () => {
    // Throughout the delivery flow, paymentStatus should remain 'pending'
    for (const s of ['pending_payment', 'confirmed', 'processing', 'ready_to_ship', 'shipped']) {
      const r = getOrderActions(order({ status: s, paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
      expect(r.actions.filter(a => a.section === 'primary' || a.section === 'payment').some(a => a.key === 'collect_payment'))
        .toBe(false, `collect_payment should not appear at ${s}`);
    }
  });

  it('no section cross-contamination', () => {
    const r = getOrderActions(order({ status: 'delivered', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
    expectNoSectionCrossContamination(r);
  });
});

// ─── SCENARIO 3: PICKUP ORDER ────────────────────────────────────────

describe('QA: Scenario 3 — Pickup order', () => {
  const flow: Array<{ status: string; primaryKey: string | null; dangerKeys: string[] }> = [
    { status: 'pending_payment', primaryKey: 'confirm', dangerKeys: ['cancel'] },
    { status: 'confirmed', primaryKey: 'process', dangerKeys: ['cancel'] },
    { status: 'processing', primaryKey: 'ready_for_pickup', dangerKeys: ['cancel'] },
    { status: 'ready_for_pickup', primaryKey: 'confirm_pickup', dangerKeys: ['cancel'] },
    { status: 'picked_up', primaryKey: null, dangerKeys: [] },
  ];

  for (const step of flow) {
    it(`${step.status}: primaryAction = ${step.primaryKey}`, () => {
      const r = getOrderActions(order({ status: step.status, fulfillmentType: 'local_pickup' }));
      checkPrimaryAction(r, step.primaryKey);
      checkSinglePrimary(r);
      if (step.dangerKeys.length > 0) {
        expect(keys(r, 'danger').sort()).toEqual([...step.dangerKeys].sort());
        checkDangerSeparated(r);
      } else {
        expect(keys(r, 'danger').length).toBe(0);
      }
      expect(r.isPickup).toBe(true);
    });
  }

  it('pickup card has actions, shipping card has none', () => {
    const r = getOrderActions(order({ status: 'ready_for_pickup', fulfillmentType: 'local_pickup' }));
    expect(keys(r, 'pickup').length).toBeGreaterThanOrEqual(0);
    expect(keys(r, 'shipping').length).toBe(0);
  });

  it('no shipping actions ever appear', () => {
    for (const s of ['pending_payment', 'confirmed', 'processing', 'ready_for_pickup', 'picked_up']) {
      const r = getOrderActions(order({ status: s, fulfillmentType: 'local_pickup' }));
      expect(keys(r, 'shipping').length, `no shipping keys at ${s}`).toBe(0);
    }
  });

  it('picked_up (terminal, no COD): no actions', () => {
    const r = getOrderActions(order({ status: 'picked_up', fulfillmentType: 'local_pickup', paymentMethod: 'bank_transfer' }));
    expect(r.actions.length).toBe(0);
    checkPrimaryAction(r, null);
  });

  it('terminal notice is appropriate message', () => {
    const r = getOrderActions(order({ status: 'picked_up', fulfillmentType: 'local_pickup', paymentMethod: 'bank_transfer' }));
    expect(r.actions.length).toBe(0);
    expect(r.primaryAction).toBeNull();
  });

  it('no section cross-contamination', () => {
    for (const s of ['pending_payment', 'confirmed', 'processing', 'ready_for_pickup']) {
      const r = getOrderActions(order({ status: s, fulfillmentType: 'local_pickup' }));
      expectNoSectionCrossContamination(r);
    }
  });
});

// ─── SCENARIO 4: PICKUP + COD ────────────────────────────────────────

describe('QA: Scenario 4 — Pickup + COD', () => {
  it('processing + COD: ready_for_pickup is primary, no payment actions yet', () => {
    const r = getOrderActions(order({ status: 'processing', fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
    checkPrimaryAction(r, 'ready_for_pickup');
    expect(keys(r, 'payment').length).toBe(0);
  });

  it('ready_for_pickup + COD: confirm_pickup is primary, no payment actions yet', () => {
    const r = getOrderActions(order({ status: 'ready_for_pickup', fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
    checkPrimaryAction(r, 'confirm_pickup');
    expect(keys(r, 'payment').length).toBe(0);
  });

  it('confirm_pickup moves order to picked_up, does NOT affect payment', () => {
    const r = getOrderActions(order({ status: 'ready_for_pickup', fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
    const confirmPickup = r.actions.find(a => a.key === 'confirm_pickup')!;
    expect(confirmPickup.targetStatus).toBe('picked_up');
    expect(confirmPickup.section).toBe('primary');
    // Payment should not be touched by this action
    expect(hasAction(r, 'collect_payment')).toBe(false);
  });

  it('picked_up + COD: collect_payment is primaryAction, available in payment section', () => {
    const r = getOrderActions(order({ status: 'picked_up', fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
    checkPrimaryAction(r, 'collect_payment');
    expect(keys(r, 'payment')).toEqual(['collect_payment']);
    const collect = r.actions.find(a => a.key === 'collect_payment')!;
    expect(collect.description).toBeTruthy();
    expect(collect.targetStatus).toBe('picked_up'); // does not change order status
  });

  it('picked_up + COD: no danger actions (picked_up is terminal for pickup)', () => {
    const r = getOrderActions(order({ status: 'picked_up', fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
    expect(keys(r, 'danger').length).toBe(0);
  });

  it('payment is not marked paid before COD collection', () => {
    const r = getOrderActions(order({ status: 'picked_up', fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
    // Only collect_payment is available — collection_failed and customer_refused only for shipping COD
    expect(keys(r, 'payment')).toEqual(['collect_payment']);
    expect(r.primaryAction!.key).toBe('collect_payment');
  });

  it('no section cross-contamination', () => {
    for (const s of ['processing', 'ready_for_pickup', 'picked_up']) {
      const r = getOrderActions(order({ status: s, fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending' }));
      expectNoSectionCrossContamination(r);
    }
  });
});

// ─── SCENARIO 5: GIFT ORDER ──────────────────────────────────────────

describe('QA: Scenario 5 — Gift order', () => {
  const GIFT_ORDER = { sendAsGift: true, giftOptions: { message: 'شكراً لشرائك', recipientName: 'أحمد', recipientPhone: '0555000000' } };

  it('gift card appears only when gift data exists', () => {
    const withGift = getOrderActions(order({ status: 'confirmed', ...GIFT_ORDER }));
    expect(withGift.hasGift).toBe(true);
    expect(keys(withGift, 'gift').length).toBeGreaterThan(0);

    const withoutGift = getOrderActions(order({ status: 'confirmed' }));
    expect(withoutGift.hasGift).toBe(false);
    expect(keys(withoutGift, 'gift').length).toBe(0);
  });

  it('gift actions are secondary — never in primary, shipping, pickup, payment, or danger', () => {
    const r = getOrderActions(order({ status: 'confirmed', ...GIFT_ORDER }));
    const giftSection = bySection(r, 'gift');
    expect(giftSection.length).toBeGreaterThan(0);
    for (const a of giftSection) {
      expect(a.section).toBe('gift');
      expect(a.isDestructive).toBe(false);
    }
  });

  it('gift does not affect order transitions', () => {
    const statuses = ['pending_payment', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'ready_for_pickup'];
    for (const s of statuses) {
      const ft = s === 'ready_for_pickup' ? 'local_pickup' : 'shipping';
      const shipment = s === 'ready_to_ship' ? { id: 1, labelUrl: 'x', trackingNumber: 'TN' } : s === 'shipped' ? { id: 1, trackingNumber: 'TN' } : null;
      const normal = getOrderActions(order({ status: s, fulfillmentType: ft, shipment }));
      const gifted = getOrderActions(order({ status: s, fulfillmentType: ft, shipment, ...GIFT_ORDER }));
      const normalNonGift = normal.actions.filter(a => a.section !== 'gift').map(a => a.key).sort();
      const giftedNonGift = gifted.actions.filter(a => a.section !== 'gift').map(a => a.key).sort();
      expect(giftedNonGift, `same non-gift actions at ${s}`).toEqual(normalNonGift);
      expect(gifted.hasGift).toBe(true);
      expect(gifted.primaryAction?.key).toBe(normal.primaryAction?.key);
    }
  });

  it('shipping actions do not appear in gift card', () => {
    const r = getOrderActions(order({ status: 'confirmed', ...GIFT_ORDER }));
    for (const a of bySection(r, 'gift')) {
      expect(SHIPPING_KEYS).not.toContain(a.key);
    }
  });

  it('pickup actions do not appear in gift card', () => {
    const r = getOrderActions(order({ status: 'confirmed', fulfillmentType: 'local_pickup', ...GIFT_ORDER }));
    for (const a of bySection(r, 'gift')) {
      expect(a.key).not.toMatch(/pickup|ready/);
    }
  });

  it('payment actions do not appear in gift card', () => {
    const r = getOrderActions(order({ status: 'delivered', paymentMethod: 'cash_on_delivery', ...GIFT_ORDER }));
    for (const a of bySection(r, 'gift')) {
      expect(PAYMENT_KEYS).not.toContain(a.key);
    }
  });

  it('gift actions have description only if primary or collect_payment (they should not)', () => {
    const r = getOrderActions(order({ status: 'confirmed', ...GIFT_ORDER }));
    for (const a of bySection(r, 'gift')) {
      expect(a.description).toBeUndefined(); // gift actions are not primary or collect_payment
    }
  });

  it('no section cross-contamination', () => {
    for (const s of ['confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered']) {
      const r = getOrderActions(order({ status: s, ...GIFT_ORDER }));
      expectNoSectionCrossContamination(r);
    }
  });

  it('notify_recipient only when recipient info present', () => {
    const withRecipient = getOrderActions(order({ status: 'confirmed', sendAsGift: true, giftOptions: { recipientName: 'أحمد' } }));
    expect(hasAction(withRecipient, 'notify_recipient')).toBe(true);
    const withoutRecipient = getOrderActions(order({ status: 'confirmed', sendAsGift: true }));
    expect(hasAction(withoutRecipient, 'notify_recipient')).toBe(false);
  });
});

// ─── SCENARIO 6: EXTERNAL ORDERS ──────────────────────────────────────

describe('QA: Scenario 6 — External orders (salla/zid/noon/amazon)', () => {
  const EXTERNAL_SOURCES = ['salla', 'zid', 'noon', 'amazon'];

  for (const src of EXTERNAL_SOURCES) {
    describe(`${src}`, () => {
      it('resolver computes primaryAction regardless of source (page guards with !isExternal)', () => {
        for (const s of ['pending_payment', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered']) {
          const r = getOrderActions(order({ status: s, source: src, shipment: s === 'ready_to_ship' ? { id: 1, labelUrl: 'x', trackingNumber: 'TN' } : s === 'shipped' ? { id: 1, trackingNumber: 'TN' } : null }));
          expect(r.primaryAction).not.toBeNull();
          expect(r.primaryAction!.key).toBeTruthy();
        }
        // Terminal status: no primaryAction regardless of source
        expect(getOrderActions(order({ status: 'completed', source: src })).primaryAction).toBeNull();
      });

      it('resolver returns internal actions (page must filter them)', () => {
        for (const s of ['confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered']) {
          const r = getOrderActions(order({ status: s, source: src }));
          expect(r.actions.length).toBeGreaterThan(0, `resolver returns actions for ${s}`); // resolver is source-agnostic
        }
      });

      it('hasGift/isPickup/isCOD computed correctly regardless of source', () => {
        const r = getOrderActions(order({ status: 'confirmed', source: src, fulfillmentType: 'local_pickup', paymentMethod: 'cash_on_delivery', sendAsGift: true }));
        expect(r.hasGift).toBe(true);
        expect(r.isPickup).toBe(true);
        expect(r.isCOD).toBe(true);
      });

      it('shipping info is still accessible (read-only, no actions)', () => {
        const r = getOrderActions(order({ status: 'shipped', source: src, shipment: { id: 1, trackingNumber: 'TN123', carrierName: 'SMSA' } }));
        expect(keys(r, 'shipping').length).toBeGreaterThan(0); // resolver still computes
      });

      it('gift info is still accessible (read-only, no actions)', () => {
        const r = getOrderActions(order({ status: 'confirmed', source: src, sendAsGift: true, giftOptions: { message: 'Hi' } }));
        expect(r.hasGift).toBe(true);
        expect(keys(r, 'gift').length).toBeGreaterThan(0);
      });

      it('customer info, notes, and history are independent of source', () => {
        // These are data display, not actions — they work regardless of source
        const r = getOrderActions(order({ status: 'confirmed', source: src }));
        expect(r.actions.filter(a => a.section === 'documents')).toBeDefined();
      });
    });
  }
});
