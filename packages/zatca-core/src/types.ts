/** ZATCA invoice types for KSA e-invoicing compliance */

/**
 * Per-tenant seller configuration for ZATCA invoicing.
 * Populated from the `tenants` table (compliance fields added in migration 0061).
 */
export interface ZatcaSellerConfig {
  /** Arabic legal name as registered with ZATCA */
  sellerName: string;
  /** 15-digit VAT number issued by ZATCA */
  vatNumber: string;
  /** Street address */
  street: string;
  /** District / neighbourhood (optional) */
  district?: string;
  /** City name in Arabic */
  city: string;
  /** Postal code */
  postalCode: string;
}

export type InvoiceType = 'simplified' | 'standard';
export type InvoiceTransactionType = 'invoice' | 'credit_note' | 'debit_note';

export interface ZatcaSellerInfo {
  /** Arabic name as registered with ZATCA */
  name: string;
  vatNumber: string;
  address: {
    street: string;
    district?: string;
    city: string;
    postalCode: string;
    country: 'SA';
  };
}

export interface ZatcaBuyerInfo {
  name: string;
  vatNumber?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface ZatcaLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  vatRate: number;
  vatCategoryCode?: 'S' | 'Z' | 'E' | 'O';
}

export interface ZatcaInvoiceInput {
  type: InvoiceType;
  transactionType: InvoiceTransactionType;
  invoiceNumber: string;
  issueDate: string;
  issueTime: string;
  seller: ZatcaSellerInfo;
  buyer?: ZatcaBuyerInfo;
  lineItems: ZatcaLineItem[];
  currencyCode?: string;
  notes?: string;
}

export interface ZatcaInvoiceResult {
  invoiceNumber: string;
  qrCode: string;
  xmlContent: string;
  totals: {
    subtotal: number;
    discountTotal: number;
    vatTotal: number;
    grandTotal: number;
  };
}

export interface ZatcaPortalConfig {
  /** Base URL for ZATCA sandbox: https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal */
  baseUrl: string;
  /** CSID obtained from ZATCA onboarding */
  csid?: string;
  /** PCSID (production) obtained after compliance checks */
  pcsid?: string;
}

export interface ZatcaClearanceResult {
  status: 'cleared' | 'reported' | 'error';
  uuid?: string;
  warnings?: string[];
  errors?: string[];
}
