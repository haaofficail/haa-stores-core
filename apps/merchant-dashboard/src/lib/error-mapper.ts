// Central API error mapper.
//
// Audit Part 4 (Storefront + Marketplaces) flagged this cross-cutting
// gap: every `.catch(() => toast.error('common.error'))` in the codebase
// swallows the `ApiClientError.code` / `.message`, so merchants get a
// useless "حدث خطأ" toast instead of an actionable diagnostic.
//
// This module centralizes the mapping so each page can write:
//
//     try {
//       await someApi();
//     } catch (e) {
//       toast.error(messageFromError(e, t));
//     }
//
// — and the right Arabic message is selected from the API error code,
// or the raw .message is shown if the code is unknown. No code path
// silently collapses to "حدث خطأ" again.
//
// Adding a new error code: extend `KNOWN_CODES` below with a translation
// key. The key MUST exist in apps/merchant-dashboard/src/i18n/locales/ar.json
// under the `errors.<code>` namespace; the i18n fallback string is the
// second argument to t(), so missing keys still render meaningful text.

import type { TFunction } from 'i18next';
import { ApiClientError } from './api';

// Codes the API actually emits today (sampled from
// apps/api/src/middleware + apps/api/src/routes). Extend as the API
// grows new codes; unknown codes fall through to `.message`.
const KNOWN_CODES: Record<string, { key: string; fallback: string }> = {
  // ── Auth ──────────────────────────────────────────────────────
  INVALID_CREDENTIALS: { key: 'errors.invalidCredentials', fallback: 'بيانات الدخول غير صحيحة' },
  UNAUTHORIZED: { key: 'errors.unauthorized', fallback: 'يجب تسجيل الدخول للمتابعة' },
  FORBIDDEN: { key: 'errors.forbidden', fallback: 'ليس لديك صلاحية لهذا الإجراء' },
  RATE_LIMITED: { key: 'errors.rateLimited', fallback: 'تم تجاوز الحد المسموح من المحاولات. حاول لاحقًا.' },
  CSRF_INVALID: { key: 'errors.csrfInvalid', fallback: 'انتهت صلاحية الجلسة. أعد تحميل الصفحة.' },

  // ── Validation / shape ────────────────────────────────────────
  VALIDATION_ERROR: { key: 'errors.validation', fallback: 'البيانات المُدخلة غير صحيحة' },
  NOT_FOUND: { key: 'errors.notFound', fallback: 'العنصر غير موجود' },
  CONFLICT: { key: 'errors.conflict', fallback: 'حدث تعارض — أعد تحميل الصفحة وحاول مرة أخرى' },

  // ── Idempotency / concurrency ─────────────────────────────────
  IDEMPOTENCY_CONFLICT: {
    key: 'errors.idempotencyConflict',
    fallback: 'هذه العملية تم تنفيذها بالفعل — لا داعي لتكرارها',
  },

  // ── Network / server ──────────────────────────────────────────
  NETWORK_ERROR: { key: 'errors.network', fallback: 'تعذّر الاتصال بالخادم. تحقق من الاتصال.' },
  SERVER_ERROR: { key: 'errors.server', fallback: 'خطأ في الخادم. حاول مرة أخرى لاحقًا.' },
  TIMEOUT: { key: 'errors.timeout', fallback: 'انتهت مهلة الطلب. حاول مرة أخرى.' },

  // ── Domain — money ───────────────────────────────────────────
  INSUFFICIENT_BALANCE: { key: 'errors.insufficientBalance', fallback: 'الرصيد غير كافٍ لإتمام العملية' },
  PAYOUT_PENDING: {
    key: 'errors.payoutPending',
    fallback: 'يوجد طلب سحب قيد المعالجة — انتظر اكتماله قبل بدء طلب جديد',
  },

  // ── Domain — orders / shipping ───────────────────────────────
  ORDER_LOCKED: { key: 'errors.orderLocked', fallback: 'لا يمكن تعديل هذا الطلب في حالته الحالية' },
  SHIPPING_RATE_UNAVAILABLE: {
    key: 'errors.shippingRateUnavailable',
    fallback: 'لا توجد طريقة شحن متاحة لهذا الطلب',
  },

  // ── Beta policy gates ────────────────────────────────────────
  FORBIDDEN_BETA_POLICY: {
    key: 'errors.forbiddenBetaPolicy',
    fallback: 'هذه الميزة معطّلة في المرحلة التجريبية. تواصل مع الدعم لإلغائها.',
  },
};

/**
 * Best-effort translation of an API error into a human-readable Arabic
 * sentence. Pass any caught value — `ApiClientError`, native `Error`,
 * or `unknown` — and a user-facing string comes back.
 *
 * Falls back through:
 *   1. Known code in `KNOWN_CODES` → translated string.
 *   2. `ApiClientError.message` if it's specific (not a generic
 *      "Request failed").
 *   3. A generic "خطأ غير متوقع" so the merchant always sees something.
 */
export function messageFromError(err: unknown, t?: TFunction): string {
  const generic = t ? t('errors.unexpected', 'حدث خطأ غير متوقع') : 'حدث خطأ غير متوقع';

  if (err instanceof ApiClientError) {
    const mapping = KNOWN_CODES[err.code];
    if (mapping) {
      return t ? t(mapping.key, mapping.fallback) : mapping.fallback;
    }
    // Unknown code but a specific message — show it (after a sanity
    // check that it's not the same as the generic).
    if (err.message && err.message !== 'Request failed') {
      return err.message;
    }
    return generic;
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return generic;
}

/**
 * Convenience for the common pattern:
 *
 *     try { ... } catch (e) {
 *       toast.error(messageFromError(e, t));
 *       console.error('[ContextName]', e);
 *     }
 *
 * Use when you want to ALWAYS surface the diagnostic to the dev console
 * (errors that the merchant sees are also worth seeing in DevTools).
 */
export function reportError(err: unknown, context: string, t?: TFunction): string {
  console.error(`[${context}]`, err);
  return messageFromError(err, t);
}
