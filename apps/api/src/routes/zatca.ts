import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { OrdersService } from '@haa/commerce-core';
import { generateZatcaQr, buildZatcaInvoice, isZatcaConfigured } from '@haa/zatca-core';
import type { ZatcaSellerConfig } from '@haa/zatca-core';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { eq } from 'drizzle-orm';

export const zatcaRouter = new Hono();
zatcaRouter.use('*', requireAuth(), requireStoreAccess());

/**
 * Resolve per-tenant ZATCA seller config from the DB.
 * Falls back to env-level globals if the tenant row is missing fields,
 * so existing single-tenant deployments keep working without changes.
 */
async function resolveSellerConfig(storeId: number): Promise<ZatcaSellerConfig> {
  try {
    const db = createDbClient();
    const [row] = await db
      .select({
        tenantName: s.tenants.name,
        vatNumber: s.tenants.vatNumber,
      })
      .from(s.stores)
      .innerJoin(s.tenants, eq(s.stores.tenantId, s.tenants.id))
      .where(eq(s.stores.id, storeId))
      .limit(1);

    return {
      sellerName: row?.tenantName ?? process.env.ZATCA_SELLER_NAME ?? 'متجر هاء',
      vatNumber: row?.vatNumber ?? process.env.ZATCA_VAT_NUMBER ?? '',
      street: process.env.ZATCA_STREET ?? 'شارع الملك عبدالعزيز',
      district: process.env.ZATCA_DISTRICT,
      city: process.env.ZATCA_CITY ?? 'الرياض',
      postalCode: process.env.ZATCA_POSTAL_CODE ?? '12345',
    };
  } catch {
    // DB unavailable — fall back to env-level globals
    return {
      sellerName: process.env.ZATCA_SELLER_NAME ?? 'متجر هاء',
      vatNumber: process.env.ZATCA_VAT_NUMBER ?? '',
      street: process.env.ZATCA_STREET ?? 'شارع الملك عبدالعزيز',
      district: process.env.ZATCA_DISTRICT,
      city: process.env.ZATCA_CITY ?? 'الرياض',
      postalCode: process.env.ZATCA_POSTAL_CODE ?? '12345',
    };
  }
}

/**
 * GET /orders/:orderId/zatca-invoice
 * Generates ZATCA Phase 1 simplified tax invoice for an order (on-demand).
 * Returns:
 *   - qrCode:  base64 TLV QR (embed in receipt PDF / show to customer)
 *   - xmlContent: full UBL 2.1 XML (print/archive; Phase 2 clearance-ready)
 *   - configured: whether ZATCA portal API credentials are set (for Phase 2)
 */
zatcaRouter.get('/orders/:orderId/zatca-invoice', requirePermission('orders:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));

  const order = await new OrdersService().getById(storeId, orderId);
  if (!order) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  }

  // Resolve per-tenant seller config (falls back to env vars for legacy deployments)
  const sellerConfig = await resolveSellerConfig(storeId);

  const issueDate = new Date(order.createdAt as string | Date);
  const issueDateStr = issueDate.toISOString().slice(0, 10);
  const issueTimeStr = issueDate.toISOString().slice(11, 19);
  const invoiceTotal = String(Number(order.total).toFixed(2));
  const vatTotal = String(Number(order.taxAmount ?? 0).toFixed(2));

  // Generate Phase 1 QR (5-field TLV)
  const qrCode = generateZatcaQr({
    sellerName: sellerConfig.sellerName,
    vatNumber: sellerConfig.vatNumber,
    invoiceTimestamp: issueDate.toISOString(),
    invoiceTotal,
    vatTotal,
  });

  // Build full UBL 2.1 XML
  const lineItems = ((order.items ?? []) as Array<Record<string, unknown>>).map(item => ({
    name: String(item.productName ?? item.name ?? 'منتج'),
    quantity: Number(item.quantity ?? 1),
    unitPrice: Number(item.unitPrice ?? item.price ?? 0),
    discountAmount: Number(item.discountAmount ?? 0),
    vatRate: 0.15,
  }));

  const result = buildZatcaInvoice({
    type: 'simplified',
    transactionType: 'invoice',
    invoiceNumber: `INV-${orderId}`,
    issueDate: issueDateStr,
    issueTime: issueTimeStr,
    seller: {
      name: sellerConfig.sellerName,
      vatNumber: sellerConfig.vatNumber,
      address: {
        street: sellerConfig.street,
        district: sellerConfig.district,
        city: sellerConfig.city,
        postalCode: sellerConfig.postalCode,
        country: 'SA',
      },
    },
    buyer: {
      name: order.customerName ?? 'عميل',
    },
    lineItems,
    currencyCode: 'SAR',
  });

  return c.json({
    success: true,
    data: {
      orderId,
      orderNumber: order.orderNumber,
      qrCode,
      xmlContent: result.xmlContent,
      totals: result.totals,
      configured: isZatcaConfigured(),
    },
  });
});
