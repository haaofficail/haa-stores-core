/**
 * ZATCA Phase 1 QR code generator — TLV encoding per ZATCA specification.
 *
 * Tags:
 *  1 = Seller name (UTF-8)
 *  2 = VAT registration number
 *  3 = Invoice timestamp (ISO 8601)
 *  4 = Invoice total (with VAT)
 *  5 = VAT total
 *
 * Output: base64-encoded TLV byte array, ready for a QR code library.
 */

function tlvField(tag: number, value: string): Uint8Array {
  const valueBytes = new TextEncoder().encode(value);
  // ZATCA TLV length is a single byte (0–255). A longer value (e.g. a long
  // UTF-8 Arabic seller name — 2 bytes/char) would silently overflow
  // `result[1] = length & 0xFF`, producing a corrupt QR a scanner misparses.
  // Fail loud instead of emitting a malformed invoice QR.
  if (valueBytes.length > 255) {
    throw new Error(
      `generateZatcaQr: TLV value for tag ${tag} is ${valueBytes.length} bytes; ZATCA TLV length is a single byte (max 255).`,
    );
  }
  const result = new Uint8Array(2 + valueBytes.length);
  result[0] = tag;
  result[1] = valueBytes.length;
  result.set(valueBytes, 2);
  return result;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

export interface ZatcaQrInput {
  sellerName: string;
  vatNumber: string;
  invoiceTimestamp: string;
  invoiceTotal: string;
  vatTotal: string;
}

/**
 * Generate ZATCA-compliant QR code data (base64 TLV).
 * Pass the result to a QR code library (e.g. qrcode, qr-image) to render.
 */
export function generateZatcaQr(input: ZatcaQrInput): string {
  const tlv = concatUint8Arrays([
    tlvField(1, input.sellerName),
    tlvField(2, input.vatNumber),
    tlvField(3, input.invoiceTimestamp),
    tlvField(4, input.invoiceTotal),
    tlvField(5, input.vatTotal),
  ]);
  return Buffer.from(tlv).toString('base64');
}
