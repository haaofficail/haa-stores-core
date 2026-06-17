// VAT-Aware Pricing helpers — TASK-0035 sub-item 6
//
// ZATCA (Zakat, Tax and Customs Authority) requires 15% VAT to be
// visible on tax invoices in Saudi Arabia. Merchants store product
// prices ex-VAT (base price); the storefront and checkout display the
// price inc-VAT (gross) and a separate VAT line for transparency.
//
// The platform supports a default 15% rate (ZATCA standard) with
// optional env override (`VAT_RATE`) for future jurisdiction support
// (e.g. UAE 5%, Bahrain 10%) without code changes.
//
// Rounding policy: 2 decimal places (matches SAR halalas). All
// conversions round-half-away-from-zero for fairness to merchants
// (a 0.005 SAR rounding is always rounded up, never down).
//
// Defense-in-depth: `isValidVatRate` rejects negative rates, rates
// above 1 (100%), NaN, and Infinity before any calculation.

export const DEFAULT_VAT_RATE = 0.15;

const ROUND_DECIMALS = 2;
const ROUND_MULTIPLIER = 10 ** ROUND_DECIMALS;

/**
 * Defense-in-depth: validate a VAT rate before using it.
 * Accepts 0 ≤ rate ≤ 1; rejects negative, > 100%, NaN, and Infinity.
 */
export function isValidVatRate(rate: number): boolean {
  if (typeof rate !== 'number') return false;
  if (Number.isNaN(rate) || !Number.isFinite(rate)) return false;
  return rate >= 0 && rate <= 1;
}

/**
 * Round to 2 decimal places (SAR halalas).
 * Uses round-half-away-from-zero for fairness.
 */
function roundHalfUp(value: number): number {
  return Math.round(value * ROUND_MULTIPLIER) / ROUND_MULTIPLIER;
}

/**
 * Add VAT to a base price.
 *   priceIncVat(100, 0.15) → 115
 */
export function priceIncVat(basePrice: number, rate: number = DEFAULT_VAT_RATE): number {
  if (!isValidVatRate(rate)) {
    throw new Error(`Invalid VAT rate: ${rate}. Must be 0 ≤ rate ≤ 1.`);
  }
  if (basePrice < 0) {
    throw new Error(`Invalid base price: ${basePrice}. Must be non-negative.`);
  }
  return roundHalfUp(basePrice * (1 + rate));
}

/**
 * Extract the base price (ex-VAT) from a gross price (inc-VAT).
 *   priceExVat(115, 0.15) → 100
 */
export function priceExVat(grossPrice: number, rate: number = DEFAULT_VAT_RATE): number {
  if (!isValidVatRate(rate)) {
    throw new Error(`Invalid VAT rate: ${rate}. Must be 0 ≤ rate ≤ 1.`);
  }
  if (grossPrice < 0) {
    throw new Error(`Invalid gross price: ${grossPrice}. Must be non-negative.`);
  }
  if (rate === 0) return roundHalfUp(grossPrice);
  return roundHalfUp(grossPrice / (1 + rate));
}

/**
 * Compute the VAT amount.
 *   vatAmount(100, 0.15)                   → 15  (exclusive: VAT on top of base)
 *   vatAmount(115, 0.15, { inclusive: true }) → 15  (extracted from gross)
 */
export function vatAmount(
  price: number,
  rate: number = DEFAULT_VAT_RATE,
  options: { inclusive?: boolean } = {}
): number {
  if (!isValidVatRate(rate)) {
    throw new Error(`Invalid VAT rate: ${rate}. Must be 0 ≤ rate ≤ 1.`);
  }
  if (price < 0) {
    throw new Error(`Invalid price: ${price}. Must be non-negative.`);
  }
  if (options.inclusive) {
    // VAT is already inside the price; extract it.
    return roundHalfUp(price - priceExVat(price, rate));
  }
  return roundHalfUp(price * rate);
}

/**
 * Format the VAT line for a receipt / order summary.
 * Arabic: "ضريبة القيمة المضافة (15%) — 15.00 ر.س"
 * English: "VAT (15%) — 15.00 SAR"
 */
export function formatVatLine(
  basePrice: number,
  rate: number = DEFAULT_VAT_RATE,
  locale: 'ar' | 'en' = 'en'
): string {
  const vat = vatAmount(basePrice, rate);
  const pct = (rate * 100).toFixed(0);
  if (locale === 'ar') {
    return `ضريبة القيمة المضافة (${pct}%) — ${vat.toFixed(ROUND_DECIMALS)} ر.س`;
  }
  return `VAT (${pct}%) — ${vat.toFixed(ROUND_DECIMALS)} SAR`;
}

/**
 * Format the price + VAT badge for product cards.
 * Arabic: { price: "115.00", badge: "شامل الضريبة" }
 * English: { price: "115.00", badge: "VAT included" }
 */
export function formatPriceIncVatLabel(
  grossPrice: number,
  locale: 'ar' | 'en' = 'en'
): { price: string; badge: string } {
  return {
    price: grossPrice.toFixed(ROUND_DECIMALS),
    badge: locale === 'ar' ? 'شامل الضريبة' : 'VAT included',
  };
}
