/** تحويل آمن لقيمة مالية — يمنع NaN في العرض (QA Cart/Checkout). */
export function toMoneyNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
/** تنسيق مبلغ بخانتين عشريتين، آمن من NaN. */
export function formatAmount(value: unknown): string {
  return toMoneyNumber(value).toFixed(2);
}
/** حدّ كمية آمن مقابل المخزون: 0 لا يتحوّل إلى 1، و undefined لا يصبح NaN (QA CART4). */
export function safeMaxQty(trackInventory: boolean, stock: unknown, cap = 99): number {
  if (!trackInventory) return cap;
  const n = Number(stock);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
