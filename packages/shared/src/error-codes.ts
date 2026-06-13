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

export interface ErrorCodeDef {
  code: string
  severity: ErrorSeverity
  source: ErrorSource
  safeMessage: string
  description: string
}

export const ERROR_CODES: Record<string, ErrorCodeDef> = {
  'API-001': {
    code: 'API-001',
    severity: 'P2',
    source: 'platform_bug',
    safeMessage: 'تعذر تنفيذ العملية حاليًا.',
    description: 'خطأ API غير مصنف',
  },
  'SYS-001': {
    code: 'SYS-001',
    severity: 'P2',
    source: 'unknown',
    safeMessage: 'حدث خطأ غير متوقع في النظام.',
    description: 'خطأ نظام غير متوقع',
  },
  'STORE-001': {
    code: 'STORE-001',
    severity: 'P0',
    source: 'platform_bug',
    safeMessage: 'المتجر غير متاح حاليًا.',
    description: 'المتجر العام أو الصفحة لا تحمل',
  },
  'DASH-001': {
    code: 'DASH-001',
    severity: 'P0',
    source: 'platform_bug',
    safeMessage: 'تعذر تحميل هذا الجزء من لوحة التحكم.',
    description: 'لوحة التاجر لا تحمل جزءًا من الواجهة',
  },
  'THEME-001': {
    code: 'THEME-001',
    severity: 'P1',
    source: 'theme_runtime',
    safeMessage: 'تعذر تحميل الثيم.',
    description: 'الثيم غير موجود',
  },
  'THEME-002': {
    code: 'THEME-002',
    severity: 'P2',
    source: 'theme_runtime',
    safeMessage: 'حدث خطأ أثناء تحميل الثيم.',
    description: 'فشل تحميل الثيم أو احتمال تسريب الثيم',
  },
  'PAY-001': {
    code: 'PAY-001',
    severity: 'P1',
    source: 'external_provider',
    safeMessage: 'تعذر تهيئة الدفع. يرجى المحاولة لاحقًا.',
    description: 'فشل تهيئة الدفع',
  },
  'SHIP-001': {
    code: 'SHIP-001',
    severity: 'P1',
    source: 'external_provider',
    safeMessage: 'تعذر إنشاء بوليصة الشحن. يرجى المحاولة لاحقًا.',
    description: 'فشل إنشاء بوليصة الشحن',
  },
  'ORDER-001': {
    code: 'ORDER-001',
    severity: 'P2',
    source: 'platform_bug',
    safeMessage: 'تعذر تغيير حالة الطلب.',
    description: 'تغيير حالة الطلب غير مسموح',
  },
  'RBAC-001': {
    code: 'RBAC-001',
    severity: 'P2',
    source: 'permission_denied',
    safeMessage: 'لا تملك الصلاحية الكافية للقيام بهذا الإجراء.',
    description: 'لا توجد صلاحية',
  },
  'WEBHOOK-001': {
    code: 'WEBHOOK-001',
    severity: 'P2',
    source: 'external_provider',
    safeMessage: 'تعذر معالجة الإشعار الخارجي.',
    description: 'فشل معالجة webhook',
  },
  'JOB-001': {
    code: 'JOB-001',
    severity: 'P2',
    source: 'platform_bug',
    safeMessage: 'تعذر تنفيذ مهمة الخلفية.',
    description: 'فشل مهمة خلفية',
  },
  'VALIDATION-001': {
    code: 'VALIDATION-001',
    severity: 'P3',
    source: 'validation_error',
    safeMessage: 'يرجى التأكد من صحة البيانات المدخلة.',
    description: 'بيانات غير صحيحة',
  },
  'NETWORK-001': {
    code: 'NETWORK-001',
    severity: 'P3',
    source: 'network_error',
    safeMessage: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك.',
    description: 'مشكلة اتصال أو timeout',
  },
}

export function getErrorDef(code: string): ErrorCodeDef {
  return ERROR_CODES[code] || {
    code,
    severity: 'P2' as ErrorSeverity,
    source: 'unknown' as ErrorSource,
    safeMessage: 'تعذر تنفيذ العملية حاليًا.',
    description: 'خطأ غير مصنف',
  }
}

export function getSafeMessage(code: string, fallback?: string): string {
  return getErrorDef(code).safeMessage || fallback || 'حدث خطأ غير متوقع.'
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
