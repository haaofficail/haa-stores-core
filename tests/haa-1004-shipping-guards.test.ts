/**
 * HAA-1004 — Shipping guards: backend (behavioral) + UI (functional)
 *
 * Findings from code review:
 * - fulfillmentStatus = 'fulfilled' is set ONLY when order reaches 'completed'/'picked_up'
 *   (post-delivery). A ready_to_ship order always has fulfillmentStatus = 'unfulfilled'.
 * - 'partially_fulfilled' is defined in the type but never set anywhere in the application.
 * - createShipment passes items: [] — no line item / quantity selection (no split shipment).
 * - The ORDER STATUS ('ready_to_ship') is the preparation signal, not fulfillmentStatus.
 * Therefore the fulfillmentStatus guard was removed from createShipment and getOrderActions.
 * TODO: add preparationStatus field (prepared/packed) and gate on it when implemented.
 *
 * Backend tests: actually instantiate ShipmentsService with mocked dependencies and
 * assert on the returned result object — NOT string searches.
 *
 * UI tests: call getOrderActions() directly (pure function, no DB).
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// ─── Hoisted mocks (available before vi.mock factory runs) ────────────────────

const mockGetById = vi.hoisted(() => vi.fn());
const mockCreateShipment = vi.hoisted(() => vi.fn());

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../packages/commerce-core/src/orders.js', () => ({
  OrdersService: class {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getById: any = mockGetById;
  },
}));

vi.mock('@haa/shipping-core', () => ({
  ShippingService: class {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createShipment: any = mockCreateShipment;
    listShipments = vi.fn();
    getShipment = vi.fn();
    createLabel = vi.fn();
    updateShipmentStatus = vi.fn();
    addTrackingEvent = vi.fn();
  },
  LabelService: class { getLabel = vi.fn(); },
  ReturnService: class { createReturn = vi.fn(); listReturns = vi.fn(); },
  createShippingProvider: vi.fn().mockReturnValue({ cancelShipment: vi.fn() }),
  getShippingProviderStatus: vi.fn().mockReturnValue({ active: true }),
}));

vi.mock('@haa/db', () => ({
  createDbClient: vi.fn().mockReturnValue({}),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { ShipmentsService } from '../packages/commerce-core/src/shipments-service.js';
import { getOrderActions } from '../apps/merchant-dashboard/src/lib/order-actions.js';

// ─── DB stub ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeDb(hasExistingShipment = false): any {
  const limitResult = hasExistingShipment ? [{ id: 999 }] : [];
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(limitResult),
        }),
      }),
    }),
  };
}

// ─── Order fixtures ───────────────────────────────────────────────────────────

const validAddress = { street: 'شارع الملك فهد', city: 'الرياض', country: 'Saudi Arabia' };

// A normal ready_to_ship order: fulfillmentStatus is 'unfulfilled' by design —
// it only becomes 'fulfilled' post-delivery (completed/picked_up).
// preparationStatus must be 'packed' for shipment creation (HAA-PREP-001).
function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    storeId: 1,
    status: 'ready_to_ship',
    paymentStatus: 'paid',
    paymentMethod: 'credit_card',
    fulfillmentStatus: 'unfulfilled', // ← normal for ready_to_ship orders
    preparationStatus: 'packed',      // ← required by HAA-PREP-001
    customerName: 'أحمد',
    customerPhone: '966500000000',
    shippingAddress: validAddress,
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validBody: any = {
  shippingMethodId: 1,
  recipientName: 'أحمد',
  recipientPhone: '966500000000',
  address: validAddress,
};

// ─── Backend behavioral tests ─────────────────────────────────────────────────

describe('Backend guard — ShipmentsService.createShipment (behavioral)', () => {
  beforeEach(() => {
    mockGetById.mockReset();
    mockCreateShipment.mockReset();
    mockCreateShipment.mockResolvedValue({ id: 1, status: 'label_created' });
  });

  it('returns NOT_FOUND when order does not exist', async () => {
    mockGetById.mockResolvedValue(null);
    const result = await new ShipmentsService(makeDb()).createShipment(1, 99, validBody);
    expect(result.success).toBe(false);
    expect((result as { code: string }).code).toBe('NOT_FOUND');
  });

  it('rejects unpaid non-COD order with ORDER_NOT_SHIPPABLE', async () => {
    mockGetById.mockResolvedValue(makeOrder({ paymentStatus: 'unpaid', paymentMethod: 'credit_card' }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(false);
    expect((result as { code: string }).code).toBe('ORDER_NOT_SHIPPABLE');
    expect((result as { message: string }).message).toMatch(/unpaid.*not COD/i);
  });

  it('rejects COD order with paymentStatus=unpaid (not yet confirmed — paymentStatus must be pending)', async () => {
    mockGetById.mockResolvedValue(makeOrder({
      paymentStatus: 'unpaid',
      paymentMethod: 'cash_on_delivery',
    }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(false);
    expect((result as { code: string }).code).toBe('ORDER_NOT_SHIPPABLE');
    expect((result as { message: string }).message).toMatch(/COD/);
  });

  it('rejects when an active shipment already exists', async () => {
    mockGetById.mockResolvedValue(makeOrder());
    const result = await new ShipmentsService(makeDb(true)).createShipment(1, 1, validBody);
    expect(result.success).toBe(false);
    expect((result as { code: string }).code).toBe('ORDER_NOT_SHIPPABLE');
    expect((result as { message: string }).message).toMatch(/active shipment/);
  });

  it('rejects when shipping address is missing required fields', async () => {
    mockGetById.mockResolvedValue(makeOrder({ shippingAddress: { district: 'حي' } }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(false);
    expect((result as { code: string }).code).toBe('ORDER_NOT_SHIPPABLE');
    expect((result as { message: string }).message).toMatch(/incomplete/);
  });

  it('allows COD order with paymentStatus=pending (confirmed for collection) + valid address', async () => {
    mockGetById.mockResolvedValue(makeOrder({
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
    }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(true);
  });

  it('allows paid + valid address + no existing shipment (normal ready_to_ship flow)', async () => {
    mockGetById.mockResolvedValue(makeOrder());
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(true);
  });

  it('allows paid order with fulfillmentStatus=unfulfilled — the normal state for ready_to_ship', async () => {
    // fulfillmentStatus = 'unfulfilled' is expected and correct for ready_to_ship orders.
    // The fulfillmentStatus guard was removed because 'fulfilled' only applies post-delivery.
    mockGetById.mockResolvedValue(makeOrder({ fulfillmentStatus: 'unfulfilled' }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(true);
  });

  it('collects multiple blockers (unpaid + missing address) into one response', async () => {
    mockGetById.mockResolvedValue(makeOrder({
      paymentStatus: 'unpaid',
      paymentMethod: 'bank_transfer',
      shippingAddress: { district: 'حي' }, // missing city/street/country
    }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, {
      ...validBody,
      recipientPhone: '', // force phone check onto order.customerPhone
    });
    expect(result.success).toBe(false);
    const msg = (result as { message: string }).message;
    expect(msg).toMatch(/unpaid/i);
    expect(msg).toMatch(/incomplete/i);
  });
});

// ─── UI guard: getOrderActions (functional pure-function tests) ───────────────

function makeUiOrder(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ready_to_ship',
    paymentStatus: 'paid',
    paymentMethod: 'credit_card',
    fulfillmentStatus: 'unfulfilled', // ← normal for ready_to_ship
    preparationStatus: 'packed',      // ← required since HAA-PREP-001
    fulfillmentType: 'delivery',
    shippingAddress: validAddress,
    shipment: null,
    ...overrides,
  };
}

describe('UI guard — getOrderActions (HAA-1004)', () => {
  it('shows create_label disabled for unpaid non-COD', () => {
    const { actions } = getOrderActions(makeUiOrder({ paymentStatus: 'unpaid', paymentMethod: 'credit_card' }));
    const label = actions.find(a => a.key === 'create_label');
    expect(label?.disabledReason).toBe('الطلب غير مدفوع');
  });

  it('shows create_label disabled for COD with paymentStatus=unpaid (not confirmed)', () => {
    const { actions } = getOrderActions(makeUiOrder({
      paymentStatus: 'unpaid',
      paymentMethod: 'cash_on_delivery',
    }));
    const label = actions.find(a => a.key === 'create_label');
    expect(label?.disabledReason).toBe('الدفع عند الاستلام غير مؤكد');
  });

  it('shows create_label disabled for incomplete shipping address', () => {
    const { actions } = getOrderActions(makeUiOrder({ shippingAddress: { district: 'حي' } }));
    const label = actions.find(a => a.key === 'create_label');
    expect(label?.disabledReason).toBe('عنوان الشحن غير مكتمل');
  });

  it('shows create_label ACTIVE for paid + valid address (fulfillmentStatus=unfulfilled is normal)', () => {
    const { actions } = getOrderActions(makeUiOrder());
    const label = actions.find(a => a.key === 'create_label');
    expect(label).toBeDefined();
    expect(label?.disabledReason).toBeUndefined();
  });

  it('shows create_label ACTIVE for COD+pending (confirmed for collection)', () => {
    const { actions } = getOrderActions(makeUiOrder({
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
    }));
    const label = actions.find(a => a.key === 'create_label');
    expect(label?.disabledReason).toBeUndefined();
  });

  it('does not render create_label when active shipment exists', () => {
    const { actions } = getOrderActions(makeUiOrder({ shipment: { id: 42 } }));
    expect(actions.find(a => a.key === 'create_label')).toBeUndefined();
  });

  it('payment check takes priority over address for disabledReason', () => {
    const { actions } = getOrderActions(makeUiOrder({
      paymentStatus: 'unpaid',
      paymentMethod: 'credit_card',
      shippingAddress: { district: 'حي' }, // also missing address
    }));
    const label = actions.find(a => a.key === 'create_label');
    expect(label?.disabledReason).toBe('الطلب غير مدفوع');
  });
});

// ─── Source regression guards ─────────────────────────────────────────────────

describe('Source regression — guard code still present and semantically correct', () => {
  const root = resolve(new URL('..', import.meta.url).pathname);
  const svcSrc = readFileSync(resolve(root, 'packages/commerce-core/src/shipments-service.ts'), 'utf-8');
  const uiSrc = readFileSync(resolve(root, 'apps/merchant-dashboard/src/lib/order-actions.ts'), 'utf-8');

  it('backend: ORDER_NOT_SHIPPABLE code present', () => {
    expect(svcSrc).toContain('ORDER_NOT_SHIPPABLE');
  });

  it('backend: COD guard uses paymentStatus === pending', () => {
    expect(svcSrc).toContain("paymentStatus === 'pending'");
  });

  it('backend: fulfillmentStatus guard is intentionally absent — preparationStatus guard implemented', () => {
    // fulfillmentStatus is NOT a shipment gate (correct — it reflects post-delivery state).
    // preparationStatus is the packing gate (HAA-PREP-001).
    expect(svcSrc).toContain("preparationStatus must be 'packed'");
    expect(svcSrc).toContain('HAA-PREP-001');
    // SHIPPABLE_FULFILLMENT must NOT be present — the allowlist was removed
    expect(svcSrc).not.toContain('SHIPPABLE_FULFILLMENT');
  });

  it('backend: address checks city, street, country, customerName', () => {
    expect(svcSrc).toContain('addr?.city');
    expect(svcSrc).toContain('addr?.street');
    expect(svcSrc).toContain('addr?.country');
    expect(svcSrc).toContain('order.customerName');
  });

  it('UI: payment disabledReasons present', () => {
    expect(uiSrc).toContain('الطلب غير مدفوع');
    expect(uiSrc).toContain('الدفع عند الاستلام غير مؤكد');
    expect(uiSrc).toContain('عنوان الشحن غير مكتمل');
  });

  it('UI: fulfillmentStatus guard absent; preparationStatus guard implemented (HAA-PREP-001)', () => {
    // fulfillmentStatus is NOT a label gate (correct — it reflects post-delivery state).
    // preparationStatus is now the packing gate (HAA-PREP-001).
    expect(uiSrc).toContain('لا يمكن إنشاء بوليصة لأن الطلب لم يتم تغليفه بعد');
    expect(uiSrc).toContain('HAA-PREP-001');
    // SHIPPABLE_FULFILLMENT must NOT be present in the UI file either
    expect(uiSrc).not.toContain('SHIPPABLE_FULFILLMENT');
  });

  it('UI: COD confirmed uses paymentStatus === pending', () => {
    expect(uiSrc).toContain("paymentStatus === 'pending'");
  });
});
