import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { OrdersService } from '@haa/commerce-core';
import { generateZatcaQr, buildZatcaInvoice, isZatcaConfigured } from '@haa/zatca-core';
import { resolveSellerConfig } from '../services/zatca-config.js';

export const zatcaRouter = new Hono();
zatcaRouter.use('*', requireAuth(), requireStoreAccess());

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

  // PROBLEM-013: `invoiceNumber` is the human business identifier
  // (lands in <cbc:ID>). `invoiceUuid` is a real UUIDv4 (lands in
  // <cbc:UUID>) — Phase 2 portal validation rejects anything else.
  // The UUID is minted per-request here; persisting it (so reprints
  // see the same value) is tracked under PROBLEM-015 (hash chain).
  const result = buildZatcaInvoice({
    type: 'simplified',
    transactionType: 'invoice',
    invoiceNumber: `INV-${orderId}`,
    invoiceUuid: randomUUID(),
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
      invoiceNumber: result.invoiceNumber,
      invoiceUuid: result.invoiceUuid,
      qrCode,
      xmlContent: result.xmlContent,
      totals: result.totals,
      configured: isZatcaConfigured(),
    },
  });
});
