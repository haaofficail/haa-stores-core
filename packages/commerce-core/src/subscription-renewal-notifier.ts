/**
 * HAA-SUB-RENEWAL — daily renewal-reminder email dispatcher.
 *
 * Wired into the API scheduler (`apps/api/src/worker.ts`). The
 * scheduler ticks hourly and only invokes `runDailySweep()` at 09:00
 * Asia/Riyadh — the early-morning merchant inbox slot. Email failure
 * MUST NEVER throw out of the scheduler tick.
 *
 * Behaviour contract:
 *
 *   - For each ACTIVE subscription with a non-NULL currentPeriodEnd,
 *     compute `daysUntilRenewal = ceil((periodEnd - now) / 1d)`.
 *   - Fire when daysUntilRenewal ∈ {7, 1}. Other windows skip.
 *   - Dedup: skip when `last_renewal_reminder_step === daysUntilRenewal`
 *     AND `last_renewal_reminder_at >= current_period_start`. The
 *     period-start anchor means a brand-new period automatically
 *     re-arms both ladder steps without any backfill.
 *   - On successful send, UPDATE both columns. A failure MUST NOT
 *     consume the dedup slot — the columns are only set AFTER
 *     `provider.send()` resolves.
 *
 * Provider precedence: shared with welcome + publish-success +
 * low-stock emails via `pickWelcomeEmailProvider()` (SMTP > Resend).
 * No provider, no recipient, no merchant → silent no-op.
 *
 * Logging: kind=renewal_reminder store=${id} step=${day} err=${msg}.
 * NEVER logs merchant emails, names, plan names, or amounts — those
 * are PII / commercially sensitive.
 */

import { and, eq, isNotNull } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import {
  renderSubscriptionRenewalEmail,
  type SubscriptionRenewalContext,
} from '@haa/notification-core';
import { pickWelcomeEmailProvider } from './email-provider.js';

const MS_PER_DAY = 86_400_000;
const REMINDER_STEPS = [7, 1] as const;

/**
 * Resolve the merchant dashboard base URL. Mirrors `low-stock-notifier.ts`
 * and `publish-gate.ts` — the dashboard is hosted on `merchant.<apex>`.
 *
 * No /billing sub-route exists yet on the merchant dashboard (the
 * Subscriptions page lives at `/subscriptions`). Per the spec, when
 * billing isn't a route, the CTA falls back to the dashboard root —
 * the email body still mentions "إدارة الاشتراك" so the merchant knows
 * where to go.
 */
function buildDashboardUrl(): string {
  const apex = (process.env.STOREFRONT_APEX_DOMAIN || 'haastores.com').replace(/^https?:\/\//, '');
  return `https://merchant.${apex}`;
}

function resolveSupportEmail(): string {
  return process.env.SUPPORT_EMAIL || 'support@haastores.com';
}

/**
 * Format the renewal date in a stable, Arabic-locale-safe form. We
 * stick to ISO `YYYY-MM-DD` because Arabic month names vary by region
 * and "2026-07-15" is unambiguous in every locale.
 */
function formatRenewalDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface SubscriptionRenewalSweepResult {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
}

export class SubscriptionRenewalNotifier {
  constructor(private db: DbClient = createDbClient()) {}

  /**
   * Sweep every active subscription, send any 7-day or 1-day reminder
   * that's eligible, and return counter totals so the scheduler can
   * log them. Idempotent — re-running within the same step is a
   * no-op via the (last_renewal_reminder_step, last_renewal_reminder_at)
   * dedupe anchor.
   */
  async runDailySweep(): Promise<SubscriptionRenewalSweepResult> {
    const result: SubscriptionRenewalSweepResult = {
      scanned: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    };

    let rows: Awaited<ReturnType<typeof this.loadEligibleSubscriptions>>;
    try {
      rows = await this.loadEligibleSubscriptions();
    } catch (err) {
      console.error(
        '[subscription-renewal] kind=renewal_reminder load_err=' +
          (err instanceof Error ? err.message : 'unknown'),
      );
      return result;
    }

    result.scanned = rows.length;

    if (rows.length === 0) return result;

    const provider = pickWelcomeEmailProvider();
    if (!provider) {
      // No provider configured — count every eligible row as skipped
      // (a transient ops state, not a per-store failure).
      result.skipped = rows.length;
      return result;
    }

    const dashboardUrl = buildDashboardUrl();
    const supportEmail = resolveSupportEmail();
    const now = Date.now();

    for (const row of rows) {
      // The query already filtered currentPeriodEnd IS NOT NULL via
      // the WHERE clause, but TypeScript can't know that across the
      // Drizzle result type — defensive guard.
      if (!row.currentPeriodEnd) {
        result.skipped += 1;
        continue;
      }

      const daysUntilRenewal = Math.ceil(
        (row.currentPeriodEnd.getTime() - now) / MS_PER_DAY,
      );

      // Skip when not on the 7-day or 1-day rung of the ladder.
      const isLadderStep =
        (REMINDER_STEPS as readonly number[]).includes(daysUntilRenewal);
      if (!isLadderStep) {
        result.skipped += 1;
        continue;
      }

      // Per-period dedup. The skip predicate anchors on
      // currentPeriodStart so a brand-new period naturally re-arms
      // both ladder steps. last_renewal_reminder_step === daysUntilRenewal
      // AND last_renewal_reminder_at >= currentPeriodStart → already sent.
      if (
        row.lastRenewalReminderStep === daysUntilRenewal &&
        row.lastRenewalReminderAt !== null &&
        row.lastRenewalReminderAt >= row.currentPeriodStart
      ) {
        result.skipped += 1;
        continue;
      }

      // Resolve recipient. Mirror LowStockNotifier.buildEmailContext —
      // walk store → tenant → first tenant_user → user. Skip the row
      // (counted as skipped, not failed) when any link is missing.
      const recipient = await this.resolveRecipient(row.storeId);
      if (!recipient) {
        result.skipped += 1;
        continue;
      }

      const priceField =
        row.billingCycle === 'annual' ? row.priceAnnual : row.priceMonthly;
      const amountSar = Number(priceField || '0').toFixed(2);
      const billingCycle: 'monthly' | 'annual' =
        row.billingCycle === 'annual' ? 'annual' : 'monthly';
      const step = daysUntilRenewal as 7 | 1;

      const ctx: SubscriptionRenewalContext = {
        merchantName: recipient.merchantName,
        planName: row.planName,
        amountSar,
        billingCycle,
        renewalDate: formatRenewalDate(row.currentPeriodEnd),
        daysUntilRenewal: step,
        dashboardUrl,
        supportEmail,
      };

      const { subject, html } = renderSubscriptionRenewalEmail(ctx);

      let sendOk = false;
      try {
        const sendResult = await provider.send({
          recipient: recipient.merchantEmail,
          subject,
          body: html,
        });
        sendOk = sendResult?.success !== false;
      } catch (err) {
        console.error(
          '[subscription-renewal] kind=renewal_reminder store=' +
            row.storeId +
            ' step=' +
            step +
            ' err=' +
            (err instanceof Error ? err.message : 'unknown'),
        );
      }

      if (!sendOk) {
        result.failed += 1;
        // CRITICAL: do NOT update the dedupe columns on failure. The
        // next sweep retries.
        continue;
      }

      // SUCCESS — stamp the dedupe anchor.
      try {
        await this.db
          .update(s.merchantSubscriptions)
          .set({
            lastRenewalReminderAt: new Date(),
            lastRenewalReminderStep: step,
          })
          .where(eq(s.merchantSubscriptions.id, row.id));
        result.sent += 1;
      } catch (err) {
        // Stamp failed — log + count as failed so a future sweep can
        // retry. Without the UPDATE the dedupe slot is NOT consumed.
        result.failed += 1;
        console.error(
          '[subscription-renewal] kind=renewal_reminder store=' +
            row.storeId +
            ' step=' +
            step +
            ' err=' +
            (err instanceof Error ? err.message : 'unknown'),
        );
      }
    }

    return result;
  }

  /**
   * Join merchant_subscriptions with subscription_plans and pull the
   * fields needed to render the email. status === 'active' AND
   * currentPeriodEnd IS NOT NULL — every other guard is JS-side so the
   * caller can introspect counters per skip reason.
   */
  private async loadEligibleSubscriptions() {
    return this.db
      .select({
        id: s.merchantSubscriptions.id,
        storeId: s.merchantSubscriptions.storeId,
        billingCycle: s.merchantSubscriptions.billingCycle,
        currentPeriodStart: s.merchantSubscriptions.currentPeriodStart,
        currentPeriodEnd: s.merchantSubscriptions.currentPeriodEnd,
        lastRenewalReminderAt: s.merchantSubscriptions.lastRenewalReminderAt,
        lastRenewalReminderStep: s.merchantSubscriptions.lastRenewalReminderStep,
        planName: s.subscriptionPlans.name,
        priceMonthly: s.subscriptionPlans.priceMonthly,
        priceAnnual: s.subscriptionPlans.priceAnnual,
      })
      .from(s.merchantSubscriptions)
      .innerJoin(
        s.subscriptionPlans,
        eq(s.subscriptionPlans.id, s.merchantSubscriptions.planId),
      )
      .where(
        and(
          eq(s.merchantSubscriptions.status, 'active'),
          isNotNull(s.merchantSubscriptions.currentPeriodEnd),
        ),
      );
  }

  /**
   * Walk store → tenant → first tenant_user → user, returning the
   * merchant's display name + email. Null on any missing link.
   */
  private async resolveRecipient(
    storeId: number,
  ): Promise<{ merchantName: string; merchantEmail: string } | null> {
    const [store] = await this.db
      .select({ tenantId: s.stores.tenantId })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    if (!store) return null;

    const [tenantUser] = await this.db
      .select({ userId: s.tenantUsers.userId })
      .from(s.tenantUsers)
      .where(eq(s.tenantUsers.tenantId, store.tenantId))
      .limit(1);
    if (!tenantUser) return null;

    const [user] = await this.db
      .select({ name: s.users.name, email: s.users.email })
      .from(s.users)
      .where(eq(s.users.id, tenantUser.userId))
      .limit(1);
    if (!user || !user.email) return null;

    return {
      merchantName: user.name ?? '',
      merchantEmail: user.email,
    };
  }
}
