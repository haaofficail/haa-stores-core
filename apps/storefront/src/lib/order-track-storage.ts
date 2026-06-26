// Guest order-tracking phone, persisted in sessionStorage.
//
// A guest order (`OrderSuccess` / `TrackOrderResult`) is fetched with
// `orderApi.getByOrderNumber(slug, orderNumber, phone)` — the phone is the
// per-order access token the server validates. After a successful checkout
// the buyer has *just* typed their phone, so we stash it here keyed by the
// new order number; the confirmation page then auto-loads the order without
// asking for the phone a second time.
//
// This is the single source of truth for the key shared between the writer
// (Checkout) and the reader (OrderSuccess) — keeping them in sync prevents
// the "الطلب غير موجود" gate from showing right after a successful purchase.
//
// Security: this only stores the phone the buyer entered for *their own*
// just-created order. It never bypasses the server check — a wrong/missing
// phone still yields no order, so other orders stay inaccessible.

export function trackPhoneKey(orderNumber: string): string {
  return `track_phone_${orderNumber}`;
}

export function saveTrackPhone(orderNumber: string, phone: string): void {
  if (typeof sessionStorage === 'undefined') return;
  const trimmed = phone.trim();
  if (!orderNumber || !trimmed) return;
  try {
    sessionStorage.setItem(trackPhoneKey(orderNumber), trimmed);
  } catch {
    // sessionStorage can throw in private mode / when full — non-fatal.
  }
}

export function getTrackPhone(orderNumber: string): string | null {
  if (typeof sessionStorage === 'undefined' || !orderNumber) return null;
  try {
    return sessionStorage.getItem(trackPhoneKey(orderNumber));
  } catch {
    return null;
  }
}
