// Date-range helpers for analytics queries.
//
// The dashboard previously sent `YYYY-MM-DD` strings from a browser
// `<input type="date">` straight to the API, which the server treated
// as UTC. A merchant in Riyadh selecting "today" at 02:00 AM local
// time was actually asking for "yesterday at 23:00–24:00 UTC", so
// orders placed minutes earlier didn't appear in the report.
//
// All Haa Stores merchants are in KSA. We normalise every date-range
// boundary to Asia/Riyadh (UTC+3, no DST) before sending it to the
// server. Audit P0 #36 (2026-06-25).

export const STORE_TIMEZONE = 'Asia/Riyadh';
export const STORE_TZ_OFFSET = '+03:00';

/**
 * Convert a `YYYY-MM-DD` date (as picked in the UI) into an ISO
 * timestamp marking the START of that day in Asia/Riyadh.
 *
 *   toRiyadhDayStart('2026-06-25') → '2026-06-25T00:00:00+03:00'
 *
 * The server can parse this with `new Date()` and get the correct
 * absolute instant regardless of the server's own TZ setting.
 */
export function toRiyadhDayStart(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error(`toRiyadhDayStart: expected YYYY-MM-DD, got "${ymd}"`);
  }
  return `${ymd}T00:00:00${STORE_TZ_OFFSET}`;
}

/**
 * Convert a `YYYY-MM-DD` date into the END of that day in Riyadh,
 * inclusive (one millisecond before midnight). Use this for the
 * `dateTo` boundary of a closed range so the last second of the day
 * is included.
 *
 *   toRiyadhDayEnd('2026-06-25') → '2026-06-25T23:59:59.999+03:00'
 */
export function toRiyadhDayEnd(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error(`toRiyadhDayEnd: expected YYYY-MM-DD, got "${ymd}"`);
  }
  return `${ymd}T23:59:59.999${STORE_TZ_OFFSET}`;
}

/**
 * Return today's date in Riyadh as `YYYY-MM-DD`. Use this for
 * pre-populating the `dateTo` input — without this, a merchant on a
 * traveller's laptop set to another TZ would see "today" off by a day.
 */
export function todayRiyadhYmd(): string {
  // `toLocaleDateString('en-CA', { timeZone })` reliably yields
  // YYYY-MM-DD per the Canadian en locale rules.
  return new Date().toLocaleDateString('en-CA', { timeZone: STORE_TIMEZONE });
}

/**
 * Subtract `days` from `todayRiyadhYmd()` and return the result.
 * Used for the "last 7 days" / "last 30 days" preset shortcuts.
 */
export function daysAgoRiyadhYmd(days: number): string {
  const today = new Date();
  today.setUTCDate(today.getUTCDate() - days);
  return today.toLocaleDateString('en-CA', { timeZone: STORE_TIMEZONE });
}
