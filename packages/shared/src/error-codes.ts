export type ErrorSeverity = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'

export type ErrorSource =
  | 'platform_bug'
  | 'merchant_config'
  | 'external_provider'
  | 'permission_denied'
  | 'validation_error'
  | 'theme_runtime'
  | 'network_error'
  | 'database_error'
  | 'unknown'

export type ErrorOrigin =
  | 'api'
  | 'dashboard'
  | 'storefront'
  | 'worker'
  | 'webhook'
  | 'local_simulation'

/**
 * Each error code follows the BRANDING_BRIEF §4.3 pattern: "السبب + الحل"
 * (Cause + Remedy). The `safeMessage` explains what happened; the `remedy`
 * tells the user what to do next. Use `getFullErrorMessage()` to render both.
 */
export interface ErrorCodeDef {
  code: string
  severity: ErrorSeverity
  source: ErrorSource
  safeMessage: string
  /** Concrete action the user can take to resolve the issue. May be empty for P0/P1 platform bugs. */
  remedy: string
  description: string
}

export const ERROR_CODES: Record<string, ErrorCodeDef> = {
  'API-001': {
    code: 'API-001',
    severity: 'P2',
    source: 'platform_bug',
    safeMessage: 'تعذر تنفيذ العملية حاليًا.',
    remedy: 'يرجى إعادة المحاولة خلال لحظات. إن استمر الخطأ، تواصل مع الدعم.',
    description: 'خطأ API غير مصنف',
  },
  'SYS-001': {
    code: 'SYS-001',
    severity: 'P2',
    source: 'unknown',
    safeMessage: 'حدث خطأ غير متوقع في النظام.',
    remedy: 'يرجى إعادة تحديث الصفحة. إن استمر الخطأ، تواصل مع الدعم.',
    description: 'خطأ نظام غير متوقع',
  },
  'STORE-001': {
    code: 'STORE-001',
    severity: 'P0',
    source: 'platform_bug',
    safeMessage: 'المتجر غير متاح حاليًا.',
    remedy: 'نعمل على إعادته للخدمة. يرجى المحاولة بعد قليل.',
    description: 'المتجر العام أو الصفحة لا تحمل',
  },
  'DASH-001': {
    code: 'DASH-001',
    severity: 'P0',
    source: 'platform_bug',
    safeMessage: 'تعذر تحميل هذا الجزء من لوحة التحكم.',
    remedy: 'يرجى إعادة تحميل الصفحة. إن استمر الخطأ، تواصل مع الدعم.',
    description: 'لوحة التاجر لا تحمل جزءًا من الواجهة',
  },
  'THEME-001': {
    code: 'THEME-001',
    severity: 'P1',
    source: 'theme_runtime',
    safeMessage: 'تعذر تحميل الثيم المطلوب.',
    remedy: 'يرجى اختيار ثيم آخر من إعدادات المتجر، أو التواصل مع الدعم.',
    description: 'الثيم غير موجود',
  },
  'THEME-002': {
    code: 'THEME-002',
    severity: 'P2',
    source: 'theme_runtime',
    safeMessage: 'حدث خطأ أثناء تحميل الثيم.',
    remedy: 'يرجى إعادة تحميل الصفحة. إن استمر الخطأ، جرّب مسح ذاكرة التخزين المؤقت.',
    description: 'فشل تحميل الثيم أو احتمال تسريب الثيم',
  },
  'PAY-001': {
    code: 'PAY-001',
    severity: 'P1',
    source: 'external_provider',
    safeMessage: 'تعذر إتمام عملية الدفع.',
    remedy: 'يرجى التحقق من بيانات البطاقة والمحاولة مرة أخرى. إن استمر الخطأ، جرّب وسيلة دفع أخرى.',
    description: 'فشل تهيئة الدفع أو فشل العملية',
  },
  'SHIP-001': {
    code: 'SHIP-001',
    severity: 'P1',
    source: 'external_provider',
    safeMessage: 'تعذر إنشاء بوليصة الشحن.',
    remedy: 'يرجى التحقق من بيانات الشحن والمحاولة لاحقًا. إن استمر الخطأ، تواصل مع شركة الشحن.',
    description: 'فشل إنشاء بوليصة الشحن',
  },
  'ORDER-001': {
    code: 'ORDER-001',
    severity: 'P2',
    source: 'platform_bug',
    safeMessage: 'تعذر تغيير حالة الطلب.',
    remedy: 'تأكد من انتقال الطلب للحالة الصحيحة أولاً، أو تواصل مع الدعم.',
    description: 'تغيير حالة الطلب غير مسموح',
  },
  'RBAC-001': {
    code: 'RBAC-001',
    severity: 'P2',
    source: 'permission_denied',
    safeMessage: 'لا تملك الصلاحية الكافية للقيام بهذا الإجراء.',
    remedy: 'تواصل مع مدير المتجر لمنحك الصلاحية، أو سجّل دخول بحساب آخر.',
    description: 'لا توجد صلاحية',
  },
  'WEBHOOK-001': {
    code: 'WEBHOOK-001',
    severity: 'P2',
    source: 'external_provider',
    safeMessage: 'تعذر معالجة الإشعار الخارجي.',
    remedy: 'سيتم إعادة المحاولة تلقائيًا. إن استمر الخطأ، تواصل مع الدعم.',
    description: 'فشل معالجة webhook',
  },
  'JOB-001': {
    code: 'JOB-001',
    severity: 'P2',
    source: 'platform_bug',
    safeMessage: 'تعذر تنفيذ مهمة الخلفية.',
    remedy: 'سيتم إعادة جدولة المهمة تلقائيًا. إن استمر الخطأ، تواصل مع الدعم.',
    description: 'فشل مهمة خلفية',
  },
  'VALIDATION-001': {
    code: 'VALIDATION-001',
    severity: 'P3',
    source: 'validation_error',
    safeMessage: 'يرجى التأكد من صحة البيانات المدخلة.',
    remedy: 'راجع الحقول الموضحة باللون الأحمر، وأعد المحاولة بالقيم الصحيحة.',
    description: 'بيانات غير صحيحة',
  },
  'NETWORK-001': {
    code: 'NETWORK-001',
    severity: 'P3',
    source: 'network_error',
    safeMessage: 'تعذر الاتصال بالخادم.',
    remedy: 'يرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة.',
    description: 'مشكلة اتصال أو timeout',
  },
}

export function getErrorDef(code: string): ErrorCodeDef {
  return ERROR_CODES[code] || {
    code,
    severity: 'P2' as ErrorSeverity,
    source: 'unknown' as ErrorSource,
    safeMessage: 'تعذر تنفيذ العملية حاليًا.',
    remedy: 'يرجى إعادة المحاولة خلال لحظات. إن استمر الخطأ، تواصل مع الدعم.',
    description: 'خطأ غير مصنف',
  }
}

export function getSafeMessage(code: string, fallback?: string): string {
  return getErrorDef(code).safeMessage || fallback || 'حدث خطأ غير متوقع.'
}

/**
 * Returns the full "السبب + الحل" message for a given error code.
 * Format: "<safeMessage> <remedy>" when both exist; otherwise just one.
 *
 * Use this in user-facing toasts, banners, and error screens.
 */
export function getFullErrorMessage(code: string, fallback?: string): string {
  const def = getErrorDef(code);
  const cause = def.safeMessage || fallback || 'حدث خطأ غير متوقع.';
  if (!def.remedy) return cause;
  return `${cause} ${def.remedy}`;
}

/**
 * Returns just the remedy for a given error code (what the user should do).
 */
export function getErrorRemedy(code: string): string {
  return getErrorDef(code).remedy;
}

export function generateFingerprint(
  errorCode: string,
  source: string,
  route: string | undefined,
  normalizedMessage: string,
): string {
  const parts = [errorCode, source, route || 'unknown', normalizedMessage.slice(0, 60)]
  return parts.join('::').replace(/\s+/g, '_')
}

export function generateCorrelationId(): string {
  return 'req_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function generateEventId(): string {
  return 'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}
