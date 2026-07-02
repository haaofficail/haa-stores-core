/**
 * Real DB-backed integration tests for CheckoutService, covering the P0/P1
 * fixes made in this session:
 *   - P0-1: bank_transfer is pending (not auto-paid) until the merchant
 *     confirms via OrdersService.confirmBankTransfer.
 *   - P0-2: loyalty point redemption is actually deducted from the order
 *     total and debited from the customer's balance server-side.
 *   - P1-16: an exception thrown by the payment provider (not a normal
 *     'failed' confirmResult) still releases the stock reserved in Phase 1.
 *
 * Requires a running PostgreSQL database (TEST_DATABASE_URL / DATABASE_URL,
 * wired by tests/setup.ts). Excluded from the standard CI test run per
 * vitest.config.ts — run manually with:
 *   pnpm vitest run tests/checkout-financial-flows.integration.test.ts
 *
 * Replaces the 10 test.todo placeholders in tests/checkout.test.ts with
 * real, verified behavior for the highest-risk paths touched this session.
 *
 * Writing these against a real, fully-migrated database (rather than mocks)
 * surfaced two previously-undiscovered production bugs, both fixed alongside
 * this file:
 *   - packages/wallet-core/src/ledger.ts: ensureAccountForUpdate() ran a raw
 *     `SELECT * ... FOR UPDATE` that returned snake_case columns, so every
 *     wallet posting against a store's SECOND+ ledger entry threw a
 *     DecimalError. Fixed by using drizzle's `.for('update')` instead.
 *   - packages/shared/src/constants/index.ts: ORDER_STATUS_TRANSITIONS was
 *     missing 'awaiting_3ds' and 'payment_failed' entirely, even though both
 *     are valid OrderStatus values — so every declined/failed online payment
 *     and every 3DS confirmation (success or failure) threw instead of
 *     completing. Fixed by adding both states to the transition table.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as s from '@haa/db/schema';
import { sql } from '@haa/db';
import { db } from './setup';
import {
  CheckoutService,
  CartService,
  CustomersService,
  OrdersService,
} from '@haa/commerce-core';
import { FAKE_CAPABILITIES, type PaymentProvider } from '@haa/payment-providers';

const STORE_ID = 1;
let productId: number;
let pickupLocationId: number;

function uniquePhone(): string {
  return `05${Math.floor(10000000 + Math.random() * 89999999)}`;
}

async function createCartWithProduct() {
  const cartService = new CartService(db);
  const cart = await cartService.createCart(STORE_ID, undefined, crypto.randomUUID());
  await cartService.addItem(STORE_ID, cart.id, productId, 1);
  return cart.id;
}

async function getProductStock(): Promise<number> {
  const [row] = await db.select({ stockQuantity: s.products.stockQuantity }).from(s.products).where(sql`id = ${productId}`).limit(1);
  return row!.stockQuantity;
}

beforeAll(async () => {
  // Loyalty must be enabled + redemption threshold low enough for the test.
  await db.insert(s.loyaltySettings).values({
    storeId: STORE_ID,
    enabled: true,
    earnRatePerCurrency: '1',
    redeemValuePerPoint: '0.01',
    minRedeemPoints: 10,
    maxRedeemPercent: '1',
  }).onConflictDoUpdate({
    target: s.loyaltySettings.storeId,
    set: { enabled: true, minRedeemPoints: 10, maxRedeemPercent: '1' },
  });

  const [pickup] = await db.insert(s.pickupLocations).values({
    storeId: STORE_ID,
    nameAr: 'فرع اختبار التكامل',
    isActive: true,
  }).returning();
  pickupLocationId = pickup!.id;

  const [product] = await db.insert(s.products).values({
    storeId: STORE_ID,
    name: 'منتج اختبار التكامل',
    slug: `integration-test-product-${Date.now()}`,
    status: 'active',
    price: '100.00',
    stockQuantity: 20,
    trackInventory: true,
    requiresShipping: false,
  }).returning();
  productId = product!.id;
});

afterAll(async () => {
  await db.delete(s.products).where(sql`id = ${productId}`).catch(() => {});
  await db.delete(s.pickupLocations).where(sql`id = ${pickupLocationId}`).catch(() => {});
});

describe('CheckoutService — bank_transfer (P0-1)', () => {
  it('leaves paymentStatus pending with no wallet entry until the merchant confirms', async () => {
    const cartId = await createCartWithProduct();
    const service = new CheckoutService(db);
    const phone = uniquePhone();

    const { session } = await service.createSession(STORE_ID, {
      cartId,
      idempotencyKey: crypto.randomUUID(),
      customerName: 'عميل تحويل بنكي',
      customerPhone: phone,
      paymentMethod: 'bank_transfer',
      fulfillmentType: 'local_pickup',
      pickupLocationId,
    });

    const { order, paymentStatus } = await service.confirm(STORE_ID, session!.id);

    expect(paymentStatus).toBe('pending');
    expect(order!.paymentStatus).toBe('pending');
    expect(order!.status).toBe('confirmed');

    const entries = await db.select().from(s.walletEntries)
      .where(sql`reference_type = 'order' AND reference_id = ${order!.id}`);
    expect(entries).toHaveLength(0);

    // Merchant confirms the transfer landed — NOW the wallet gets credited.
    const confirmed = await new OrdersService(db).confirmBankTransfer(STORE_ID, order!.id);
    expect(confirmed!.paymentStatus).toBe('paid');

    const entriesAfter = await db.select().from(s.walletEntries)
      .where(sql`reference_type = 'order' AND reference_id = ${order!.id}`);
    const saleEntry = entriesAfter.find((e) => e.type === 'sale');
    expect(saleEntry).toBeDefined();
    expect(saleEntry!.direction).toBe('credit');
  });
});

describe('CheckoutService — loyalty redemption (P0-2)', () => {
  it('deducts the redeemed points and subtracts the value from the charged total', async () => {
    const phone = uniquePhone();
    // Pre-create the customer with a real points balance — checkout's own
    // findOrCreate(name, phone) will resolve to this same customer row.
    const customer = await new CustomersService(db).findOrCreate(STORE_ID, { name: 'عميل نقاط الولاء', phone });
    await db.insert(s.loyaltyAccounts).values({
      storeId: STORE_ID,
      customerId: customer.id,
      balance: 500,
      lifetimeEarned: 500,
    }).onConflictDoUpdate({
      target: [s.loyaltyAccounts.storeId, s.loyaltyAccounts.customerId],
      set: { balance: 500, lifetimeEarned: 500 },
    });

    const cartId = await createCartWithProduct();
    const service = new CheckoutService(db);

    const { session } = await service.createSession(STORE_ID, {
      cartId,
      idempotencyKey: crypto.randomUUID(),
      customerName: 'عميل نقاط الولاء',
      customerPhone: phone,
      paymentMethod: 'cash_on_delivery',
      fulfillmentType: 'local_pickup',
      pickupLocationId,
      redeemPoints: 100, // 100 points * 0.01 SAR/point = 1.00 SAR discount
    });

    // Server-side re-validated discount must already be baked into the
    // session total — never trust the client-supplied points count alone.
    expect(Number(session!.total)).toBeLessThan(Number(session!.subtotal));

    const { order } = await service.confirm(STORE_ID, session!.id);
    expect(Number(order!.total)).toBe(Number(session!.total));

    const [account] = await db.select().from(s.loyaltyAccounts)
      .where(sql`store_id = ${STORE_ID} AND customer_id = ${customer.id}`);
    expect(account!.balance).toBeLessThan(500);

    const redeemTx = await db.select().from(s.loyaltyTransactions)
      .where(sql`customer_id = ${customer.id} AND type = 'redeem'`);
    expect(redeemTx.length).toBeGreaterThan(0);
  });
});

describe('CheckoutService — stock release on provider exception (P1-16)', () => {
  it('restores stock and marks the order payment_failed when the provider throws', async () => {
    const stockBefore = await getProductStock();
    const cartId = await createCartWithProduct();

    const throwingProvider: PaymentProvider = {
      code: 'fake',
      name: 'Throwing Test Provider',
      capabilities: FAKE_CAPABILITIES,
      isAvailable: true,
      mode: 'fake',
      createPaymentIntent: async () => { throw new Error('simulated provider outage'); },
      confirmPayment: async () => { throw new Error('unreachable'); },
      getPaymentStatus: async () => ({ status: 'failed' }),
      refundPayment: async () => ({ success: false }),
      handleWebhook: async () => ({ success: false }),
      verifyWebhookSignature: () => false,
    };

    const service = new CheckoutService(db, throwingProvider);
    const phone = uniquePhone();

    const { session } = await service.createSession(STORE_ID, {
      cartId,
      idempotencyKey: crypto.randomUUID(),
      customerName: 'عميل اختبار فشل المزود',
      customerPhone: phone,
      paymentMethod: 'fake_card_success',
      fulfillmentType: 'local_pickup',
      pickupLocationId,
    });

    const { order, paymentStatus } = await service.confirm(STORE_ID, session!.id);

    expect(paymentStatus).toBe('failed');
    expect(order!.status).toBe('payment_failed');

    const stockAfter = await getProductStock();
    expect(stockAfter).toBe(stockBefore);
  });
});
