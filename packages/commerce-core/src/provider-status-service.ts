import { eq } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { getOfficialContactEmail, isValidWhatsappPhone } from './index.js';
import { WalletLedger } from '@haa/wallet-core';
import { OtoMarketplaceService } from '@haa/shipping-core';
import { getPaymentProviderStatus } from '@haa/payment-providers';

/**
 * ProviderStatusService — aggregates the integration status of
 * every external provider the store depends on.
 *
 * Originally extracted from `apps/api/src/routes/provider-status.ts`
 * as part of Quality Pass 5, Route Migration 7/24.
 *
 * This is an AGGREGATION service: it composes data from
 *   - @haa/payment-providers (payment provider config + mode)
 *   - @haa/wallet-core     (settlement readiness, compliance)
 *   - @haa/shipping-core    (OTO platform status)
 *   - @haa/db               (notification preferences, for
 *                            WhatsApp phone + enabled flag)
 *   - process.env          (SMTP config for email)
 *
 * The natural home for this service is @haa/commerce-core because
 *   - it already depends on all the above packages
 *   - putting it in @haa/integration-core would create a circular
 *     dep (integration-core → commerce-core → integration-core)
 *
 * Important: this service must NEVER return the VALUE of any
 * secret env var. Only existence checks (booleans). Callers that
 * need the actual key should use the appropriate provider's
 * dedicated service (which enforces its own access control).
 */

export class ProviderStatusService {
  constructor(private db: DbClient = createDbClient()) {}

  /**
   * Read the notification preferences for a store. Returns `null`
   * if the store has never set up notifications.
   */
  private async getNotificationPreferences(storeId: number) {
    const [prefs] = await this.db
      .select()
      .from(s.notificationPreferences)
      .where(eq(s.notificationPreferences.storeId, storeId))
      .limit(1);
    return prefs ?? null;
  }

  /**
   * Build the full provider-status aggregation for a store.
   *
   * Returns 5 sections:
   *   - payment          — Geidea / Moyasar / Tabby / Tamara
   *                        config + mode + settlement readiness
   *   - shipping         — OTO platform status (delegated)
   *   - shippingLabel    — derived from shipping status
   *   - whatsapp         — based on notification preferences
   *   - email            — based on SMTP env + from/replyTo
   */
  async getStatus(storeId: number) {
    const prefs = await this.getNotificationPreferences(storeId);
    const shipping = await new OtoMarketplaceService(this.db).getPlatformStatus(storeId);
    const settlement = await new WalletLedger(this.db).getSettlementReadiness(storeId);
    const paymentProviderStatus = getPaymentProviderStatus();

    // Geidea is the primary payment provider in this build.
    // Pull its `configured` flag from the existing helper to
    // avoid duplicating the env-var check.
    const geideaConfigured = paymentProviderStatus.geideaConfigured;
    const geideaMode = paymentProviderStatus.activeMode === 'live' ? 'live' : 'sandbox';

    // WhatsApp "configured" MUST require an actual provider transport
    // to be wired (Unifonic in this build). Previously a merchant who
    // toggled `whatsappEnabled` ON and saved a phone number saw the
    // status flip to "configured" — but no notification was ever sent
    // because `UnifoncWhatsAppProvider.isAvailable` checks for
    // UNIFONIC_APP_SID + UNIFONIC_WHATSAPP_SENDER, which were never
    // present. Audit findings (2026-06-25).
    const unifoncReady = !!(process.env.UNIFONIC_APP_SID && process.env.UNIFONIC_WHATSAPP_SENDER);
    const whatsappConfigured = unifoncReady
      && !!prefs?.whatsappEnabled
      && isValidWhatsappPhone(prefs.whatsappPhone);

    // SMTP "configured" mirrors `SmtpEmailProvider.isAvailable` — all
    // four env vars (HOST/PORT/USER/PASSWORD) must be present.
    // Previously the check missed SMTP_PORT, so the dashboard could
    // claim "configured" while the actual transport throws on send.
    const smtpConfigured = !!(
      process.env.SMTP_HOST
      && process.env.SMTP_PORT
      && process.env.SMTP_USER
      && process.env.SMTP_PASSWORD
    );

    return {
      payment: {
        provider: 'geidea',
        fundsModel: 'platform_collects_and_settles',
        settlementReadiness: settlement.settlementReadiness,
        complianceStatus: settlement.complianceStatus,
        safeguardedAccountConfigured: settlement.safeguardedAccountConfigured,
        pspSettlementPartnerConfirmed: settlement.pspSettlementPartnerConfirmed,
        merchantOfRecordConfirmed: settlement.merchantOfRecordConfirmed,
        samaComplianceStatus: settlement.samaComplianceStatus,
        mode: geideaMode,
        configured: geideaConfigured,
        liveEnabled: false,
        status: geideaConfigured ? (geideaMode === 'sandbox' ? 'sandbox' : 'configured') : 'not_configured',
      },
      shipping,
      shippingLabel: {
        provider: 'oto',
        configured: shipping.status === 'configured',
        labelType: shipping.status === 'configured' ? 'carrier_label' : shipping.manualFallback ? 'manual_label' : 'not_configured',
        status: shipping.status === 'configured' ? 'configured' : shipping.manualFallback ? 'partial' : 'not_configured',
      },
      whatsapp: {
        // `mode` advertises the truth: 'api' when Unifonic is wired,
        // 'qr_contact' when only the support QR link is shown.
        mode: unifoncReady ? 'api' : 'qr_contact',
        configured: whatsappConfigured,
        realDelivery: unifoncReady && whatsappConfigured,
        status: whatsappConfigured ? 'configured' : 'not_configured',
      },
      email: {
        fromEmail: getOfficialContactEmail(),
        replyToEmail: getOfficialContactEmail(),
        provider: smtpConfigured ? 'smtp' : null,
        configured: smtpConfigured,
        realDelivery: smtpConfigured,
        status: smtpConfigured ? 'configured' : 'contact_only',
      },
    };
  }
}

/** Shared default instance for ad-hoc callers (most code uses DI). */
export const providerStatusService = new ProviderStatusService();
