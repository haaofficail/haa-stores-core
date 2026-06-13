import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { getOfficialContactEmail, isValidWhatsappPhone } from '@haa/commerce-core';
import { WalletLedger } from '@haa/wallet-core';
import { OtoMarketplaceService } from '@haa/shipping-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const providerStatusRouter = new Hono();

providerStatusRouter.use('*', requireAuth(), requireStoreAccess());

providerStatusRouter.get('/', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const [prefs] = await db.select().from(s.notificationPreferences).where(eq(s.notificationPreferences.storeId, storeId)).limit(1);
  const shipping = await new OtoMarketplaceService(db).getPlatformStatus(storeId);
  const settlement = await new WalletLedger(db).getSettlementReadiness(storeId);
  const geideaConfigured = !!(process.env.GEIDEA_MERCHANT_PUBLIC_KEY && process.env.GEIDEA_API_PASSWORD);
  const geideaMode = process.env.PAYMENT_MODE === 'live' ? 'live' : 'sandbox';
  const whatsappConfigured = !!prefs?.whatsappEnabled && isValidWhatsappPhone(prefs.whatsappPhone);
  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

  return c.json({
    success: true,
    data: {
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
        mode: 'qr_contact',
        configured: whatsappConfigured,
        realDelivery: false,
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
    },
  });
});

export { providerStatusRouter };
