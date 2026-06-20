/**
 * دفاع الواجهة على وجهات التحويل للدفع (3DS/BNPL). الـ backend هو المصدر الأساسي،
 * وهذا حاجز إضافي يمنع javascript:/data:/blob: والـ protocol-relative (//evil) — QA CO5/Security.
 * يسمح فقط بمسار داخلي (يبدأ بـ / وليس //) أو URL مطلق http(s).
 */
export function isSafeRedirectUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const u = url.trim();
  if (u === '') return false;
  if (u.startsWith('//')) return false;            // protocol-relative → خطر
  if (u.startsWith('/')) return true;              // مسار داخلي
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;                                   // javascript:, data:, نص غير صالح
  }
}
