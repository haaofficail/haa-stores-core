/**
 * HAA-PREP-001 — Preparation status state machine: backend (behavioral) + UI (functional)
 *
 * preparationStatus tracks the merchant's packing workflow:
 *   not_started → preparing → prepared → packed
 *
 * Gating rules:
 * - Forward transitions only (no admin override in tests — reverse requires admin+reason).
 * - ShipmentsService.createShipment blocks unless preparationStatus = 'packed'.
 * - UI: processing status shows prep buttons per current state.
 * - UI: create_label at ready_to_ship disabled unless preparationStatus = 'packed'.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mockGetById = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockInsert = vi.hoisted(() => vi.fn());
const mockCreateShipment = vi.hoisted(() => vi.fn());

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../packages/commerce-core/src/orders.js', () => ({
  OrdersService: class {
     
    getById: any = mockGetById;
     
    changePreparationStatus: any = vi.fn(async (_storeId: number, _orderId: number, newStatus: string) => ({
      id: 1,
      preparationStatus: newStatus,
    }));
  },
}));

vi.mock('@haa/shipping-core', () => ({
  ShippingService: class {
     
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
  createDbClient: vi.fn().mockReturnValue({
    update: mockUpdate,
    insert: mockInsert,
  }),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { ShipmentsService } from '../packages/commerce-core/src/shipments-service.js';
import { getOrderActions } from '../apps/merchant-dashboard/src/lib/order-actions.js';
import { PREPARATION_STATUS_TRANSITIONS } from '../packages/shared/src/constants/index.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const validAddress = { street: 'شارع الملك فهد', city: 'الرياض', country: 'Saudi Arabia' };

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

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    storeId: 1,
    status: 'ready_to_ship',
    paymentStatus: 'paid',
    paymentMethod: 'credit_card',
    fulfillmentStatus: 'unfulfilled',
    preparationStatus: 'packed',
    customerName: 'أحمد',
    customerPhone: '966500000000',
    shippingAddress: validAddress,
    ...overrides,
  };
}

 
const validBody: any = {
  shippingMethodId: 1,
  recipientName: 'أحمد',
  recipientPhone: '966500000000',
  address: validAddress,
};

// ─── 1. State machine constants ───────────────────────────────────────────────

describe('PREPARATION_STATUS_TRANSITIONS constant', () => {
  it('not_started can only transition to preparing', () => {
    expect(PREPARATION_STATUS_TRANSITIONS['not_started']).toEqual(['preparing']);
  });

  it('preparing can only transition to prepared', () => {
    expect(PREPARATION_STATUS_TRANSITIONS['preparing']).toEqual(['prepared']);
  });

  it('prepared can only transition to packed', () => {
    expect(PREPARATION_STATUS_TRANSITIONS['prepared']).toEqual(['packed']);
  });

  it('packed is terminal — no forward transitions', () => {
    expect(PREPARATION_STATUS_TRANSITIONS['packed']).toEqual([]);
  });

  it('covers exactly 4 states', () => {
    expect(Object.keys(PREPARATION_STATUS_TRANSITIONS)).toHaveLength(4);
  });
});

// ─── 2. Backend: createShipment preparationStatus gate ───────────────────────

describe('Backend — ShipmentsService.createShipment preparationStatus gate (HAA-PREP-001)', () => {
  beforeEach(() => {
    mockGetById.mockReset();
    mockCreateShipment.mockReset();
    mockCreateShipment.mockResolvedValue({ id: 1, status: 'label_created' });
  });

  it('blocks when preparationStatus is not_started', async () => {
    mockGetById.mockResolvedValue(makeOrder({ preparationStatus: 'not_started' }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(false);
    expect((result as { code: string }).code).toBe('ORDER_NOT_SHIPPABLE');
    expect((result as { message: string }).message).toContain('not packed');
  });

  it('blocks when preparationStatus is preparing', async () => {
    mockGetById.mockResolvedValue(makeOrder({ preparationStatus: 'preparing' }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(false);
    expect((result as { code: string }).code).toBe('ORDER_NOT_SHIPPABLE');
    expect((result as { message: string }).message).toContain('not packed');
  });

  it('blocks when preparationStatus is prepared (packed is required, not just prepared)', async () => {
    mockGetById.mockResolvedValue(makeOrder({ preparationStatus: 'prepared' }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(false);
    expect((result as { code: string }).code).toBe('ORDER_NOT_SHIPPABLE');
    expect((result as { message: string }).message).toContain('not packed');
  });

  it('blocks when preparationStatus is missing (defaults to not_started)', async () => {
    const orderWithoutPrepStatus = makeOrder();
    delete (orderWithoutPrepStatus as Record<string, unknown>)['preparationStatus'];
    mockGetById.mockResolvedValue(orderWithoutPrepStatus);
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(false);
    expect((result as { code: string }).code).toBe('ORDER_NOT_SHIPPABLE');
  });

  it('allows shipment creation when preparationStatus is packed', async () => {
    mockGetById.mockResolvedValue(makeOrder({ preparationStatus: 'packed' }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(true);
  });

  it('error message includes preparationStatus value for debugging', async () => {
    mockGetById.mockResolvedValue(makeOrder({ preparationStatus: 'preparing' }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect((result as { message: string }).message).toContain('preparing');
  });

  it('preparation blocker AND payment blocker both appear in message', async () => {
    mockGetById.mockResolvedValue(makeOrder({
      preparationStatus: 'not_started',
      paymentStatus: 'unpaid',
      paymentMethod: 'credit_card',
    }));
    const result = await new ShipmentsService(makeDb()).createShipment(1, 1, validBody);
    expect(result.success).toBe(false);
    const msg = (result as { message: string }).message;
    expect(msg).toContain('not packed');
    expect(msg).toContain('unpaid');
  });
});

// ─── 3. UI — preparation actions at processing status ────────────────────────

function makeProcessingOrder(overrides: Record<string, unknown> = {}) {
  return {
    status: 'processing',
    paymentStatus: 'paid',
    paymentMethod: 'credit_card',
    fulfillmentType: 'delivery',
    fulfillmentStatus: 'unfulfilled',
    preparationStatus: 'not_started',
    shippingAddress: validAddress,
    shipment: null,
    ...overrides,
  };
}

describe('UI — preparation actions at processing status (HAA-PREP-001)', () => {
  it('shows prep_start button when preparationStatus is not_started', () => {
    const { actions } = getOrderActions(makeProcessingOrder({ preparationStatus: 'not_started' }));
    const btn = actions.find(a => a.key === 'prep_start');
    expect(btn).toBeDefined();
    expect(btn?.targetPreparationStatus).toBe('preparing');
    expect(btn?.section).toBe('preparation');
  });

  it('shows prep_done button when preparationStatus is preparing', () => {
    const { actions } = getOrderActions(makeProcessingOrder({ preparationStatus: 'preparing' }));
    const btn = actions.find(a => a.key === 'prep_done');
    expect(btn).toBeDefined();
    expect(btn?.targetPreparationStatus).toBe('prepared');
    expect(btn?.section).toBe('preparation');
  });

  it('shows prep_packed button when preparationStatus is prepared', () => {
    const { actions } = getOrderActions(makeProcessingOrder({ preparationStatus: 'prepared' }));
    const btn = actions.find(a => a.key === 'prep_packed');
    expect(btn).toBeDefined();
    expect(btn?.targetPreparationStatus).toBe('packed');
    expect(btn?.section).toBe('preparation');
  });

  it('shows no preparation button when already packed', () => {
    const { actions } = getOrderActions(makeProcessingOrder({ preparationStatus: 'packed' }));
    const prepBtns = actions.filter(a => a.section === 'preparation');
    expect(prepBtns).toHaveLength(0);
  });

  it('ready_to_ship primary action is present alongside prep actions', () => {
    const { actions } = getOrderActions(makeProcessingOrder({ preparationStatus: 'not_started' }));
    const primary = actions.find(a => a.key === 'ready_to_ship');
    expect(primary).toBeDefined();
    expect(primary?.section).toBe('primary');
  });

  it('ready_to_ship is disabled when preparationStatus is not packed', () => {
    const { actions } = getOrderActions(makeProcessingOrder({ preparationStatus: 'preparing' }));
    const primary = actions.find(a => a.key === 'ready_to_ship');
    expect(primary?.disabledReason).toBeDefined();
    expect(primary?.disabledReason).toContain('packed');
  });

  it('ready_to_ship is enabled when preparationStatus is packed', () => {
    const { actions } = getOrderActions(makeProcessingOrder({ preparationStatus: 'packed' }));
    const primary = actions.find(a => a.key === 'ready_to_ship');
    expect(primary?.disabledReason).toBeUndefined();
  });

  it('prep actions are absent for pickup orders (delivery-only feature)', () => {
    const { actions } = getOrderActions(makeProcessingOrder({
      fulfillmentType: 'local_pickup',
      preparationStatus: 'not_started',
    }));
    expect(actions.filter(a => a.section === 'preparation')).toHaveLength(0);
  });
});

// ─── 4. UI — create_label preparationStatus gate at ready_to_ship ────────────

function makeReadyToShipOrder(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ready_to_ship',
    paymentStatus: 'paid',
    paymentMethod: 'credit_card',
    fulfillmentType: 'delivery',
    fulfillmentStatus: 'unfulfilled',
    preparationStatus: 'packed',
    shippingAddress: validAddress,
    shipment: null,
    ...overrides,
  };
}

describe('UI — create_label preparationStatus gate at ready_to_ship (HAA-PREP-001)', () => {
  it('create_label is active when preparationStatus is packed + paid + valid address', () => {
    const { actions } = getOrderActions(makeReadyToShipOrder());
    const label = actions.find(a => a.key === 'create_label');
    expect(label).toBeDefined();
    expect(label?.disabledReason).toBeUndefined();
  });

  it('create_label is disabled when preparationStatus is not_started', () => {
    const { actions } = getOrderActions(makeReadyToShipOrder({ preparationStatus: 'not_started' }));
    const label = actions.find(a => a.key === 'create_label');
    expect(label?.disabledReason).toContain('لم يتم تغليفه');
  });

  it('create_label is disabled when preparationStatus is preparing', () => {
    const { actions } = getOrderActions(makeReadyToShipOrder({ preparationStatus: 'preparing' }));
    const label = actions.find(a => a.key === 'create_label');
    expect(label?.disabledReason).toContain('لم يتم تغليفه');
  });

  it('create_label is disabled when preparationStatus is prepared (packed is required)', () => {
    const { actions } = getOrderActions(makeReadyToShipOrder({ preparationStatus: 'prepared' }));
    const label = actions.find(a => a.key === 'create_label');
    expect(label?.disabledReason).toContain('لم يتم تغليفه');
  });

  it('payment check takes priority over preparationStatus in disabledReason', () => {
    const { actions } = getOrderActions(makeReadyToShipOrder({
      paymentStatus: 'unpaid',
      paymentMethod: 'credit_card',
      preparationStatus: 'not_started',
    }));
    const label = actions.find(a => a.key === 'create_label');
    expect(label?.disabledReason).toBe('الطلب غير مدفوع');
  });

  it('preparationStatus check takes priority over address in disabledReason', () => {
    const { actions } = getOrderActions(makeReadyToShipOrder({
      preparationStatus: 'not_started',
      shippingAddress: { district: 'حي' }, // incomplete
    }));
    const label = actions.find(a => a.key === 'create_label');
    expect(label?.disabledReason).toContain('لم يتم تغليفه');
  });

  it('address check fires after prep check passes', () => {
    const { actions } = getOrderActions(makeReadyToShipOrder({
      preparationStatus: 'packed',
      shippingAddress: { district: 'حي' }, // incomplete
    }));
    const label = actions.find(a => a.key === 'create_label');
    expect(label?.disabledReason).toBe('عنوان الشحن غير مكتمل');
  });
});

// ─── 5. Source regression guards ─────────────────────────────────────────────

describe('Source regression — HAA-PREP-001 implementation present', () => {
  const root = resolve(new URL('..', import.meta.url).pathname);
  const svcSrc = readFileSync(resolve(root, 'packages/commerce-core/src/shipments-service.ts'), 'utf-8');
  const uiSrc = readFileSync(resolve(root, 'apps/merchant-dashboard/src/lib/order-actions.ts'), 'utf-8');
  const ordersSrc = readFileSync(resolve(root, 'packages/commerce-core/src/orders.ts'), 'utf-8');
  const schemaSrc = readFileSync(resolve(root, 'packages/db/src/schema/orders.ts'), 'utf-8');

  it('DB schema has preparation_status column', () => {
    expect(schemaSrc).toContain("'preparation_status'");
    expect(schemaSrc).toContain("'not_started'");
  });

  it('OrdersService has changePreparationStatus method', () => {
    expect(ordersSrc).toContain('changePreparationStatus');
    expect(ordersSrc).toContain('PREPARATION_STATUS_TRANSITIONS');
  });

  it('backend: preparationStatus packed guard present in createShipment', () => {
    expect(svcSrc).toContain("prepStatus !== 'packed'");
    expect(svcSrc).toContain('HAA-PREP-001');
  });

  it('UI: preparation workflow actions present', () => {
    expect(uiSrc).toContain('prep_start');
    expect(uiSrc).toContain('prep_done');
    expect(uiSrc).toContain('prep_packed');
    expect(uiSrc).toContain('HAA-PREP-001');
  });

  it('UI: create_label prep guard present', () => {
    expect(uiSrc).toContain('لا يمكن إنشاء بوليصة لأن الطلب لم يتم تغليفه بعد');
  });

  it('migration file exists with idempotent ADD COLUMN', () => {
    const migSrc = readFileSync(resolve(root, 'packages/db/src/migrations/0077_order_preparation_status.sql'), 'utf-8');
    expect(migSrc).toContain('ADD COLUMN IF NOT EXISTS');
    expect(migSrc).toContain('preparation_status');
    expect(migSrc).toContain('not_started');
  });
});
