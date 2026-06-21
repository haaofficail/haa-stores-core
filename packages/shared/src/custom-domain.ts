/**
 * Custom domain — pure helpers (QA Custom Domain).
 *
 * Normalisation + validation + verification-record formatting for letting a
 * merchant point their own domain (e.g. shop.example.com) at their Haa store.
 * No I/O, no randomness — the service layer owns token generation + DNS lookups.
 */

/** النطاق الأساسي للمنصّة — الدومينات المخصّصة يجب ألا تكونه أو نطاقاً فرعياً منه */
export const BASE_DOMAIN = 'haastores.com';

/** هدف الـ CNAME الذي يوجّه إليه التاجر دومينه */
export const CUSTOM_DOMAIN_CNAME_TARGET = `stores.${BASE_DOMAIN}`;

/** نطاقات فرعية محجوزة لا تُعدّ slug متجر */
export const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'merchant', 'staging', 'stores', 'mail', 'cdn', 'assets',
]);

const LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * طبّع مُدخل دومين: حروف صغيرة، إزالة البروتوكول/المسار/المنفذ/النقطة الأخيرة/www.
 * يُعيد null إن لم يكن دوميناً صالحاً للتطبيع.
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let host = String(input).trim().toLowerCase();
  if (!host) return null;

  // أزل البروتوكول
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  // أزل أي مسار/استعلام/شظية
  host = host.split('/')[0].split('?')[0].split('#')[0];
  // أزل بيانات اعتماد user@host
  host = host.split('@').pop() as string;
  // أزل المنفذ
  host = host.split(':')[0];
  // أزل النقطة الأخيرة (FQDN المطلق)
  host = host.replace(/\.$/, '');
  // أزل بادئة www. (نخزّن النطاق العاري)
  host = host.replace(/^www\./, '');

  return host || null;
}

/** هل المضيف هو نطاق المنصّة أو فرعٌ منه */
export function isPlatformHost(host: string | null | undefined, baseDomain = BASE_DOMAIN): boolean {
  const h = normalizeDomain(host);
  if (!h) return false;
  return h === baseDomain || h.endsWith(`.${baseDomain}`);
}

/**
 * تحقّق من صلاحية دومين مخصّص: FQDN صحيح، ليس IP/localhost، ليس نطاق المنصّة،
 * كل label ضمن القواعد، الطول الكلي ≤ 253.
 */
export function isValidCustomDomain(input: string | null | undefined, baseDomain = BASE_DOMAIN): boolean {
  const host = normalizeDomain(input);
  if (!host) return false;
  if (host.length > 253) return false;
  if (IPV4_RE.test(host)) return false;
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (!host.includes('.')) return false; // يجب أن يكون FQDN
  // امنع نطاق المنصّة ونطاقاته الفرعية (لتفادي اختطاف/تعارض)
  if (host === baseDomain || host.endsWith(`.${baseDomain}`)) return false;

  const labels = host.split('.');
  if (labels.length < 2) return false;
  for (const label of labels) {
    if (!LABEL_RE.test(label)) return false;
  }
  // أعلى مستوى (TLD) يجب ألا يكون رقمياً
  if (/^\d+$/.test(labels[labels.length - 1])) return false;
  return true;
}

/**
 * استخرج slug المتجر من نطاق فرعي للمنصّة (<slug>.haastores.com).
 * يُعيد null للنطاقات المحجوزة أو غير المطابقة.
 */
export function extractSubdomainSlug(host: string | null | undefined, baseDomain = BASE_DOMAIN): string | null {
  const h = normalizeDomain(host);
  if (!h || !h.endsWith(`.${baseDomain}`)) return null;
  const prefix = h.slice(0, -(`.${baseDomain}`).length);
  if (!prefix || prefix.includes('.')) return null; // مستوى واحد فقط
  if (RESERVED_SUBDOMAINS.has(prefix)) return null;
  if (!LABEL_RE.test(prefix)) return null;
  return prefix;
}

/**
 * صغة سجل TXT المتوقّع للتحقّق من ملكية الدومين.
 * يُعيد { name, value } ليعرضهما التاجر في مزوّد DNS.
 */
export function buildVerificationRecord(domain: string, token: string): { name: string; value: string } | null {
  const host = normalizeDomain(domain);
  if (!host || !token) return null;
  return { name: `_haa-verify.${host}`, value: `haa-domain-verify=${token}` };
}
