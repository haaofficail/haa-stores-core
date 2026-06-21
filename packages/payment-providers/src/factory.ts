// Payment provider factory + status helpers.
//
// Extracted from packages/commerce-core/src/payment.ts in
// Quality Pass 2 — Item 2.5. Centralizes the runtime selection
// of which provider to instantiate based on environment config.

import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import type { DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type { ProviderCode, PaymentMode } from '@haa/shared';
import { type PaymentProvider } from './base.js';
import { FakePaymentProvider } from './fake.js';
import { GeideaPaymentProvider } from './geidea.js';
import { TabbyProvider } from './tabby.js';
import { TamaraProvider } from './tamara.js';
import { MoyasarSandboxProvider } from './moyasar.js';

export function createPaymentProvider(providerCode?: ProviderCode, mode?: PaymentMode): PaymentProvider {
  const resolvedProvider = providerCode ?? (process.env.PAYMENT_PROVIDER as ProviderCode) ?? 'fake';
  const resolvedMode = mode ?? (process.env.PAYMENT_MODE as PaymentMode) ?? 'fake';

  if (resolvedMode === 'live') {
    throw new Error(
      'PAYMENT_MODE=live is not allowed. ' +
      'Live payments are blocked until the Payment Review Gate, KYC, Admin, ' +
      'and a formal GO decision. Set PAYMENT_MODE=fake or sandbox for now.'
    );
  }

  if (resolvedProvider === 'tabby') {
    const provider = new TabbyProvider(process.env.TABBY_COUNTRY);
    if (!provider.isAvailable) {
      console.warn(
        'Tabby provider requested but not configured — falling back to FakePaymentProvider. ' +
        'Set TABBY_SECRET_KEY and TABBY_PUBLIC_KEY env vars to enable.'
      );
      return new FakePaymentProvider();
    }
    return provider;
  }

  if (resolvedProvider === 'tamara') {
    const provider = new TamaraProvider();
    if (!provider.isAvailable) {
      console.warn(
        'Tamara provider requested but not configured — falling back to FakePaymentProvider. ' +
        'Set TAMARA_API_TOKEN env var to enable.'
      );
      return new FakePaymentProvider();
    }
    return provider;
  }

  if (resolvedProvider === 'moyasar') {
    const provider = new MoyasarSandboxProvider();
    if (!provider.isAvailable) {
      console.warn(
        'Moyasar provider requested but not configured — falling back to FakePaymentProvider. ' +
        'Set PAYMENT_SANDBOX_SECRET_KEY and PAYMENT_SANDBOX_PUBLIC_KEY to enable.'
      );
      return new FakePaymentProvider();
    }
    return provider;
  }

  if (resolvedProvider === 'geidea') {
    const provider = new GeideaPaymentProvider();
    if (!provider.isAvailable) {
      throw new Error(
        'GEIDEA_NOT_CONFIGURED: PAYMENT_PROVIDER=geidea requires GEIDEA_MERCHANT_PUBLIC_KEY and GEIDEA_API_PASSWORD. Fake fallback is disabled.'
      );
    }
    return provider;
  }

  return new FakePaymentProvider();
}

export function getPaymentProviderStatus(): {
  activeProvider: ProviderCode;
  activeMode: PaymentMode;
  moyasarConfigured: boolean;
  moyasarAvailable: boolean;
  geideaConfigured: boolean;
  geideaAvailable: boolean;
  tabbyConfigured: boolean;
  tabbyAvailable: boolean;
  tamaraConfigured: boolean;
  tamaraAvailable: boolean;
  liveBlocked: boolean;
} {
  const mode = (process.env.PAYMENT_MODE as PaymentMode) || 'fake';
  const provider = (process.env.PAYMENT_PROVIDER as ProviderCode) || 'fake';
  const hasMoyasarKeys = !!(process.env.PAYMENT_SANDBOX_SECRET_KEY && process.env.PAYMENT_SANDBOX_PUBLIC_KEY);
  const hasGeideaKeys = !!(process.env.GEIDEA_MERCHANT_PUBLIC_KEY && process.env.GEIDEA_API_PASSWORD);
  const hasTabbyKeys = !!(process.env.TABBY_SECRET_KEY && process.env.TABBY_PUBLIC_KEY);
  const hasTamaraToken = !!(process.env.TAMARA_API_TOKEN);

  return {
    activeProvider: provider,
    activeMode: mode,
    moyasarConfigured: hasMoyasarKeys,
    moyasarAvailable: provider === 'moyasar' && hasMoyasarKeys,
    geideaConfigured: hasGeideaKeys,
    geideaAvailable: provider === 'geidea' && hasGeideaKeys,
    tabbyConfigured: hasTabbyKeys,
    tabbyAvailable: provider === 'tabby' && hasTabbyKeys,
    tamaraConfigured: hasTamaraToken,
    tamaraAvailable: provider === 'tamara' && hasTamaraToken,
    liveBlocked: true,
  };
}

export function getAvailablePaymentMethods(providerCode?: ProviderCode): string[] {
  const code = providerCode ?? (process.env.PAYMENT_PROVIDER as ProviderCode) ?? 'fake';
  if (code === 'tabby') return ['tabby_installments'];
  if (code === 'tamara') return ['tamara_installments'];
  if (code === 'moyasar') {
    return ['moyasar_creditcard', 'moyasar_mada', 'moyasar_applepay', 'moyasar_stcpay'];
  }
  if (code === 'geidea') return ['geidea_card'];
  return ['fake_card_success', 'fake_card_failed', 'bank_transfer', 'cash_on_delivery'];
}

// ── PaymentService ───────────────────────────────────
// Stays in this package for now; uses only public schema tables.
// Could be moved to a dedicated service package in a future pass.

export class PaymentService {
  constructor(private db: DbClient = createDbClient()) {}

  async getPaymentsByOrder(orderId: number) {
    return this.db.select().from(s.payments).where(eq(s.payments.orderId, orderId));
  }

  async getPayment(id: number) {
    const [payment] = await this.db.select().from(s.payments).where(eq(s.payments.id, id)).limit(1);
    if (!payment) return null;
    const attempts = await this.db.select().from(s.paymentAttempts)
      .where(eq(s.paymentAttempts.paymentId, id));
    const transactions = await this.db.select().from(s.paymentTransactions)
      .where(eq(s.paymentTransactions.paymentId, id));
    return { ...payment, attempts, transactions };
  }

  async getPaymentByProviderReference(providerPaymentId: string) {
    const [payment] = await this.db.select().from(s.payments)
      .where(eq(s.payments.providerPaymentId, providerPaymentId)).limit(1);
    return payment ?? null;
  }

  async getReconciliationReport(storeId: number, opts?: { dateFrom?: string; dateTo?: string }) {
    const conditions = [eq(s.payments.storeId, storeId)];
    if (opts?.dateFrom) conditions.push(...[]); // simplified
    const payments = await this.db.select().from(s.payments).where(eq(s.payments.storeId, storeId));
    const mismatches: Array<{ paymentId: number; orderId: number; paymentAmount: number; orderTotal: number; difference: number }> = [];

    for (const payment of payments) {
      const [order] = await this.db.select().from(s.orders)
        .where(eq(s.orders.id, payment.orderId)).limit(1);
      if (order && Number(payment.amount) !== Number(order.total)) {
        mismatches.push({
          paymentId: payment.id,
          orderId: payment.orderId,
          paymentAmount: Number(payment.amount),
          orderTotal: Number(order.total),
          difference: Number(payment.amount) - Number(order.total),
        });
      }
    }

    return { totalPayments: payments.length, mismatches, mismatchCount: mismatches.length };
  }
}
