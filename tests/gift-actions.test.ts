import { describe, it, expect } from 'vitest';
import { getOrderActions } from '../apps/merchant-dashboard/src/lib/order-actions';

function makeOrder(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    status: 'confirmed',
    fulfillmentType: 'shipping',
    paymentMethod: 'bank_transfer',
    giftOptions: null,
    sendAsGift: false,
    giftMessage: null,
    shipment: null,
    ...overrides,
  };
}

describe('getOrderActions — Gift', () => {
  describe('gift detection (hasGift)', () => {
    it('is false for a normal order', () => {
      const result = getOrderActions(makeOrder());
      expect(result.hasGift).toBe(false);
    });

    it('is true when sendAsGift is true at top level', () => {
      const result = getOrderActions(makeOrder({ sendAsGift: true }));
      expect(result.hasGift).toBe(true);
    });

    it('is true when sendAsGift is true inside giftOptions', () => {
      const result = getOrderActions(makeOrder({ giftOptions: { sendAsGift: true } }));
      expect(result.hasGift).toBe(true);
    });

    it('is true when giftMessage exists', () => {
      const result = getOrderActions(makeOrder({ giftMessage: 'Happy birthday!' }));
      expect(result.hasGift).toBe(true);
    });

    it('is true when giftOptions has recipientName', () => {
      const result = getOrderActions(makeOrder({ giftOptions: { recipientName: 'Ahmed' } }));
      expect(result.hasGift).toBe(true);
    });

    it('is true when giftOptions has sendAsGift', () => {
      const result = getOrderActions(makeOrder({ giftOptions: { sendAsGift: true } }));
      expect(result.hasGift).toBe(true);
    });
  });

  describe('gift actions', () => {
    it('includes gift section actions for gift orders', () => {
      const result = getOrderActions(makeOrder({ sendAsGift: true, giftOptions: { message: 'Hello' } }));
      const giftActions = result.actions.filter(a => a.section === 'gift');
      expect(giftActions.length).toBeGreaterThan(0);
    });

    it('includes view_gift_message when message exists', () => {
      const result = getOrderActions(makeOrder({ sendAsGift: true, giftOptions: { message: 'Hello' } }));
      expect(result.actions.find(a => a.key === 'view_gift_message')).toBeDefined();
    });

    it('includes print_gift_message when message exists', () => {
      const result = getOrderActions(makeOrder({ sendAsGift: true, giftOptions: { message: 'Hello' } }));
      expect(result.actions.find(a => a.key === 'print_gift_message')).toBeDefined();
    });

    it('includes copy_gift_message when message exists', () => {
      const result = getOrderActions(makeOrder({ sendAsGift: true, giftOptions: { message: 'Hello' } }));
      expect(result.actions.find(a => a.key === 'copy_gift_message')).toBeDefined();
    });

    it('does not include message actions (view/print/copy) when no message', () => {
      const result = getOrderActions(makeOrder({ sendAsGift: true, giftOptions: null }));
      expect(result.actions.find(a => a.key === 'view_gift_message')).toBeUndefined();
      expect(result.actions.find(a => a.key === 'print_gift_message')).toBeUndefined();
      expect(result.actions.find(a => a.key === 'copy_gift_message')).toBeUndefined();
    });

    it('includes notify_buyer for all gift orders', () => {
      const result = getOrderActions(makeOrder({ sendAsGift: true }));
      expect(result.actions.find(a => a.key === 'notify_buyer')).toBeDefined();
    });

    it('includes notify_recipient when recipient info exists', () => {
      const result = getOrderActions(makeOrder({
        sendAsGift: true,
        giftOptions: { recipientName: 'Ahmed', recipientPhone: '0555000000' },
      }));
      expect(result.actions.find(a => a.key === 'notify_recipient')).toBeDefined();
    });

    it('does not include notify_recipient without recipient info', () => {
      const result = getOrderActions(makeOrder({ sendAsGift: true }));
      expect(result.actions.find(a => a.key === 'notify_recipient')).toBeUndefined();
    });

    it('has no gift actions for normal orders', () => {
      const result = getOrderActions(makeOrder());
      expect(result.actions.some(a => a.section === 'gift')).toBe(false);
    });
  });

  describe('gift separation from other sections', () => {
    it('does not put shipping actions in gift section', () => {
      const result = getOrderActions(makeOrder({
        status: 'ready_to_ship',
        sendAsGift: true,
        shipment: { id: 1, labelUrl: 'http://example.com/label' },
      }));
      const giftKeys = result.actions.filter(a => a.section === 'gift').map(a => a.key);
      expect(giftKeys).not.toContain('create_label');
      expect(giftKeys).not.toContain('print_label');
      expect(giftKeys).not.toContain('hand_to_carrier');
    });

    it('does not put pickup actions in gift section', () => {
      const result = getOrderActions(makeOrder({
        status: 'ready_for_pickup',
        fulfillmentType: 'local_pickup',
        sendAsGift: true,
      }));
      const giftKeys = result.actions.filter(a => a.section === 'gift').map(a => a.key);
      expect(giftKeys).not.toContain('confirm_pickup');
    });

    it('does not put payment actions in gift section', () => {
      const result = getOrderActions(makeOrder({
        status: 'delivered',
        paymentMethod: 'cash_on_delivery',
        sendAsGift: true,
      }));
      const giftKeys = result.actions.filter(a => a.section === 'gift').map(a => a.key);
      expect(giftKeys).not.toContain('collect_payment');
      expect(giftKeys).not.toContain('collection_failed');
      expect(giftKeys).not.toContain('customer_refused');
    });
  });

  describe('gift does not affect order transitions', () => {
    it('returns same primary actions with or without gift (confirmed status)', () => {
      const normal = getOrderActions(makeOrder({ status: 'confirmed' }));
      const gift = getOrderActions(makeOrder({ status: 'confirmed', sendAsGift: true }));
      const normalPrimary = normal.actions.filter(a => a.section === 'primary').map(a => a.key).sort();
      const giftPrimary = gift.actions.filter(a => a.section === 'primary').map(a => a.key).sort();
      expect(giftPrimary).toEqual(normalPrimary);
    });

    it('returns same danger actions with or without gift (confirmed status)', () => {
      const normal = getOrderActions(makeOrder({ status: 'confirmed' }));
      const gift = getOrderActions(makeOrder({ status: 'confirmed', sendAsGift: true }));
      const normalDanger = normal.actions.filter(a => a.section === 'danger').map(a => a.key).sort();
      const giftDanger = gift.actions.filter(a => a.section === 'danger').map(a => a.key).sort();
      expect(giftDanger).toEqual(normalDanger);
    });

    it('returns processing primary action for gift order at confirmed', () => {
      const result = getOrderActions(makeOrder({ status: 'confirmed', sendAsGift: true }));
      expect(result.actions.some(a => a.key === 'process')).toBe(true);
    });
  });
});
