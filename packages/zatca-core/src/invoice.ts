import { randomUUID } from 'node:crypto';
import { generateZatcaQr } from './qr.js';
import type { ZatcaInvoiceInput, ZatcaInvoiceResult } from './types.js';

// PROBLEM-013: validates a UUIDv4 string. ZATCA Phase 2 requires
// `<cbc:UUID>` be a valid UUIDv4 — the previous code shoved
// `INV-${orderId}` here which is rejected on portal validation.
const UUIDV4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidInvoiceUuid(value: unknown): value is string {
  return typeof value === 'string' && UUIDV4_RE.test(value);
}

/**
 * Build a ZATCA Phase 1 simplified invoice (B2C).
 * Generates QR code + minimal UBL 2.1 XML per ZATCA e-invoicing specifications.
 *
 * Phase 2 (clearance via ZATCA portal) is handled by portal.ts.
 */
export function buildZatcaInvoice(input: ZatcaInvoiceInput): ZatcaInvoiceResult {
  const currency = input.currencyCode || 'SAR';

  // PROBLEM-013: `<cbc:UUID>` MUST be a UUIDv4. If the caller passes
  // a valid one, use it (so the value is stable across regenerations
  // of the XML). Otherwise mint a fresh UUIDv4. We never fall back
  // to `invoiceNumber` here — that path landed `INV-${orderId}` in
  // production and would fail ZATCA Phase 2 portal validation.
  const invoiceUuid = isValidInvoiceUuid(input.invoiceUuid)
    ? input.invoiceUuid
    : randomUUID();

  let subtotal = 0;
  let discountTotal = 0;
  let vatTotal = 0;

  const lineItems = input.lineItems.map((item, i) => {
    const lineSubtotal = item.unitPrice * item.quantity;
    const lineDiscount = item.discountAmount || 0;
    const taxableAmount = lineSubtotal - lineDiscount;
    const lineVat = parseFloat((taxableAmount * item.vatRate).toFixed(2));

    subtotal += lineSubtotal;
    discountTotal += lineDiscount;
    vatTotal += lineVat;

    const vatCode = item.vatCategoryCode || 'S';
    const vatPct = (item.vatRate * 100).toFixed(2);

    return `    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${currency}">${taxableAmount.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${currency}">${lineVat.toFixed(2)}</cbc:TaxAmount>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${escapeXml(item.name)}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>${vatCode}</cbc:ID>
          <cbc:Percent>${vatPct}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
  });

  const grandTotal = parseFloat((subtotal - discountTotal + vatTotal).toFixed(2));
  const taxableTotal = subtotal - discountTotal;
  const timestamp = `${input.issueDate}T${input.issueTime}`;

  const qrCode = generateZatcaQr({
    sellerName: input.seller.name,
    vatNumber: input.seller.vatNumber,
    invoiceTimestamp: timestamp,
    invoiceTotal: grandTotal.toFixed(2),
    vatTotal: vatTotal.toFixed(2),
  });

  const invoiceTypeCode = input.transactionType === 'invoice' ? '388'
    : input.transactionType === 'credit_note' ? '381' : '383';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(input.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${invoiceUuid}</cbc:UUID>
  <cbc:IssueDate>${input.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${input.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0200000">${invoiceTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${currency}</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${qrCode}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escapeXml(input.seller.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(input.seller.address.street)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(input.seller.address.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(input.seller.address.postalCode)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(input.seller.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>${input.buyer ? buildBuyerXml(input.buyer, currency) : ''}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${vatTotal.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${taxableTotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${vatTotal.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${taxableTotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${currency}">${discountTotal.toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="${currency}">${grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lineItems.join('\n')}
</Invoice>`;

  return {
    invoiceNumber: input.invoiceNumber,
    invoiceUuid,
    qrCode,
    xmlContent: xml,
    totals: {
      subtotal,
      discountTotal,
      vatTotal: parseFloat(vatTotal.toFixed(2)),
      grandTotal,
    },
  };
}

function buildBuyerXml(buyer: NonNullable<ZatcaInvoiceInput['buyer']>, _currency: string): string {
  return `
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escapeXml(buyer.name)}</cbc:Name></cac:PartyName>${buyer.vatNumber ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(buyer.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
