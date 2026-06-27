// ZATCA invoice monetary-totals correctness (UBL business rules).
//
// Bug: with a line-level discount, the header LegalMonetaryTotal/LineExtensionAmount
// was emitted as the GROSS subtotal while each InvoiceLine emitted the NET amount,
// so `Σ line LineExtensionAmount ≠ header LineExtensionAmount` — a guaranteed
// BR-CO-10 portal-validation failure. Reproduced empirically: 1×100 with a 10
// discount produced header 100.00 but a single line of 90.00.
//
// Fix models the discount as a line-level cac:AllowanceCharge, sets the header
// LineExtensionAmount + TaxExclusiveAmount to the sum of per-line net amounts,
// and zeroes the document-level AllowanceTotalAmount.

import { describe, expect, it } from 'vitest';
import { buildZatcaInvoice, generateZatcaQr } from '@haa/zatca-core';

const seller = {
  name: 'متجر هاء',
  vatNumber: '300000000000003',
  address: { street: 'King Fahd Rd', city: 'Riyadh', postalCode: '12345', country: 'SA' as const },
};

const base = {
  type: 'simplified' as const,
  transactionType: 'invoice' as const,
  invoiceNumber: 'INV-100',
  issueDate: '2026-06-27',
  issueTime: '12:00:00',
  seller,
};

const num = (xml: string, re: RegExp) => Number(xml.match(re)![1]);
const lineExtensions = (xml: string) =>
  [...xml.matchAll(/<cac:InvoiceLine>[\s\S]*?<cbc:LineExtensionAmount[^>]*>([\d.]+)</g)].map((m) => Number(m[1]));
const round2 = (n: number) => Math.round(n * 100) / 100;

const headerLE = (xml: string) =>
  num(xml, /<cac:LegalMonetaryTotal>[\s\S]*?<cbc:LineExtensionAmount[^>]*>([\d.]+)</);
const taxExclusive = (xml: string) => num(xml, /<cbc:TaxExclusiveAmount[^>]*>([\d.]+)</);
const taxInclusive = (xml: string) => num(xml, /<cbc:TaxInclusiveAmount[^>]*>([\d.]+)</);
const allowanceTotal = (xml: string) => num(xml, /<cbc:AllowanceTotalAmount[^>]*>([\d.]+)</);
const payable = (xml: string) => num(xml, /<cbc:PayableAmount[^>]*>([\d.]+)</);

describe('ZATCA invoice monetary totals — UBL business rules', () => {
  it('BR-CO-10: header LineExtensionAmount equals the sum of line LineExtensionAmounts (with a line discount)', () => {
    const { xmlContent } = buildZatcaInvoice({
      ...base,
      lineItems: [{ name: 'منتج', quantity: 1, unitPrice: 100, discountAmount: 10, vatRate: 0.15 }],
    });
    expect(round2(lineExtensions(xmlContent).reduce((a, b) => a + b, 0))).toBe(headerLE(xmlContent));
    expect(headerLE(xmlContent)).toBe(90); // 100 − 10
  });

  it('declares a line-level AllowanceCharge so Price × Qty − allowance = LineExtensionAmount', () => {
    const { xmlContent } = buildZatcaInvoice({
      ...base,
      lineItems: [{ name: 'منتج', quantity: 2, unitPrice: 50, discountAmount: 10, vatRate: 0.15 }],
    });
    expect(xmlContent).toMatch(/<cac:AllowanceCharge>[\s\S]*?<cbc:ChargeIndicator>false<\/cbc:ChargeIndicator>/);
    const allowance = num(xmlContent, /<cac:AllowanceCharge>[\s\S]*?<cbc:Amount[^>]*>([\d.]+)</);
    const price = num(xmlContent, /<cbc:PriceAmount[^>]*>([\d.]+)</);
    const qty = num(xmlContent, /<cbc:InvoicedQuantity[^>]*>([\d.]+)</);
    expect(round2(price * qty - allowance)).toBe(lineExtensions(xmlContent)[0]); // 100 − 10 = 90
  });

  it('BR-CO-13: TaxExclusiveAmount = header LineExtensionAmount − AllowanceTotalAmount; document allowance is 0', () => {
    const { xmlContent } = buildZatcaInvoice({
      ...base,
      lineItems: [{ name: 'منتج', quantity: 1, unitPrice: 100, discountAmount: 10, vatRate: 0.15 }],
    });
    expect(allowanceTotal(xmlContent)).toBe(0);
    expect(taxExclusive(xmlContent)).toBe(round2(headerLE(xmlContent) - allowanceTotal(xmlContent)));
  });

  it('TaxInclusive = TaxExclusive + VAT, and PayableAmount matches (1×100 −10 @15%)', () => {
    const { xmlContent, totals } = buildZatcaInvoice({
      ...base,
      lineItems: [{ name: 'منتج', quantity: 1, unitPrice: 100, discountAmount: 10, vatRate: 0.15 }],
    });
    expect(taxExclusive(xmlContent)).toBe(90);
    expect(round2(taxExclusive(xmlContent) + totals.vatTotal)).toBe(taxInclusive(xmlContent)); // 90 + 13.5
    expect(taxInclusive(xmlContent)).toBe(103.5);
    expect(payable(xmlContent)).toBe(103.5);
  });

  it('no-discount invoice is unchanged: header LineExtension = subtotal, allowance 0', () => {
    const { xmlContent } = buildZatcaInvoice({
      ...base,
      lineItems: [{ name: 'منتج', quantity: 1, unitPrice: 100, vatRate: 0.15 }],
    });
    expect(headerLE(xmlContent)).toBe(100);
    expect(allowanceTotal(xmlContent)).toBe(0);
    expect(xmlContent).not.toMatch(/<cac:AllowanceCharge>/); // no line allowance when no discount
  });

  it('multi-line BR-CO-10 holds with mixed discounts', () => {
    const { xmlContent } = buildZatcaInvoice({
      ...base,
      lineItems: [
        { name: 'أ', quantity: 3, unitPrice: 33.33, discountAmount: 0, vatRate: 0.15 },
        { name: 'ب', quantity: 1, unitPrice: 100, discountAmount: 15.5, vatRate: 0.15 },
      ],
    });
    expect(round2(lineExtensions(xmlContent).reduce((a, b) => a + b, 0))).toBe(headerLE(xmlContent));
  });
});

describe('ZATCA QR TLV — single-byte length guard', () => {
  it('throws (fail-loud) instead of silently corrupting when a field exceeds 255 bytes', () => {
    // 130 Arabic chars ≈ 260 UTF-8 bytes — would overflow the one-byte TLV length.
    const longName = 'ه'.repeat(130);
    expect(() =>
      generateZatcaQr({
        sellerName: longName,
        vatNumber: '300000000000003',
        invoiceTimestamp: '2026-06-27T12:00:00',
        invoiceTotal: '100.00',
        vatTotal: '15.00',
      }),
    ).toThrow(/single byte|max 255/i);
  });

  it('encodes a normal short field without error', () => {
    expect(typeof generateZatcaQr({
      sellerName: 'متجر هاء',
      vatNumber: '300000000000003',
      invoiceTimestamp: '2026-06-27T12:00:00',
      invoiceTotal: '100.00',
      vatTotal: '15.00',
    })).toBe('string');
  });
});
