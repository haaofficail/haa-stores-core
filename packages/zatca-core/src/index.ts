export const ZATCA_CORE_VERSION = '0.1.0';

export { generateZatcaQr } from './qr.js';
export type { ZatcaQrInput } from './qr.js';

export { buildZatcaInvoice, isValidInvoiceUuid } from './invoice.js';

// PROBLEM-015 — hash chain compute layer (pure, no DB).
export {
  GENESIS_PREVIOUS_HASH,
  canonicaliseInvoiceXml,
  sha256Hex,
  computeChainEntry,
  verifyChainEntry,
} from './chain.js';
export type { ChainEntry, ChainEntryInput } from './chain.js';

export { reportInvoice, clearInvoice, isZatcaConfigured } from './portal.js';

export type {
  ZatcaSellerInfo,
  ZatcaBuyerInfo,
  ZatcaLineItem,
  ZatcaInvoiceInput,
  ZatcaInvoiceResult,
  ZatcaPortalConfig,
  ZatcaClearanceResult,
  ZatcaSellerConfig,
  InvoiceType,
  InvoiceTransactionType,
} from './types.js';
