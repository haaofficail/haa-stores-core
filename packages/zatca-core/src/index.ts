export const ZATCA_CORE_VERSION = '0.1.0';

export { generateZatcaQr } from './qr.js';
export type { ZatcaQrInput } from './qr.js';

export { buildZatcaInvoice } from './invoice.js';

export { reportInvoice, clearInvoice, isZatcaConfigured } from './portal.js';

export type {
  ZatcaSellerInfo,
  ZatcaBuyerInfo,
  ZatcaLineItem,
  ZatcaInvoiceInput,
  ZatcaInvoiceResult,
  ZatcaPortalConfig,
  ZatcaClearanceResult,
  InvoiceType,
  InvoiceTransactionType,
} from './types.js';
