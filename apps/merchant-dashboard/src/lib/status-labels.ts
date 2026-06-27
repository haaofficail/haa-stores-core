// Central status-label layer — single source of truth for every backend enum
// that surfaces in the merchant UI. Replaces the scattered inline ternaries
// (which collapsed unknown states, e.g. a cancelled sync showing "قيد التشغيل",
// or every non-active listing showing "غير نشط") and the raw `{enum}` leaks
// the audit found. Each entry carries an Arabic label + a tone; the tone maps
// to a badge class so colour stays consistent across pages.

export type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export const toneBadgeClass: Record<Tone, string> = {
  success: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  danger: 'bg-red-500/10 text-red-700 border-red-200',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-200',
  info: 'bg-sky-500/10 text-sky-700 border-sky-200',
  neutral: 'bg-neutral-100 text-neutral-500 border-neutral-200',
};

export interface StatusEntry {
  label: string;
  tone: Tone;
}

type StatusMap = Record<string, StatusEntry>;

// Integration sync runs (SyncLogs).
export const SYNC_STATUS: StatusMap = {
  completed: { label: 'تم', tone: 'success' },
  success: { label: 'تم', tone: 'success' },
  failed: { label: 'فشل', tone: 'danger' },
  error: { label: 'خطأ', tone: 'danger' },
  running: { label: 'قيد التشغيل', tone: 'warning' },
  in_progress: { label: 'قيد التشغيل', tone: 'warning' },
  syncing: { label: 'قيد المزامنة', tone: 'warning' },
  pending: { label: 'بالانتظار', tone: 'neutral' },
  queued: { label: 'في الطابور', tone: 'neutral' },
  cancelled: { label: 'ملغاة', tone: 'neutral' },
  partial: { label: 'جزئي', tone: 'warning' },
};

// Marketplace product listings (MarketplaceDetail, MarketplaceListings).
export const LISTING_STATUS: StatusMap = {
  active: { label: 'نشط', tone: 'success' },
  published: { label: 'منشور', tone: 'success' },
  inactive: { label: 'غير نشط', tone: 'neutral' },
  draft: { label: 'مسودة', tone: 'neutral' },
  pending: { label: 'قيد المراجعة', tone: 'warning' },
  syncing: { label: 'قيد المزامنة', tone: 'info' },
  out_of_stock: { label: 'نفد المخزون', tone: 'warning' },
  rejected: { label: 'مرفوض', tone: 'danger' },
  error: { label: 'خطأ', tone: 'danger' },
};

// Settlement batches + payout requests (SettlementOverview, SettlementDetail).
export const SETTLEMENT_STATUS: StatusMap = {
  pending: { label: 'قيد الانتظار', tone: 'warning' },
  requested: { label: 'مطلوبة', tone: 'warning' },
  under_review: { label: 'قيد المراجعة', tone: 'warning' },
  approved: { label: 'معتمدة', tone: 'info' },
  processing: { label: 'قيد المعالجة', tone: 'info' },
  transfer_pending: { label: 'بانتظار التحويل', tone: 'info' },
  transferred: { label: 'حُوّلت', tone: 'info' },
  proof_uploaded: { label: 'رُفع الإثبات', tone: 'info' },
  transfer_verified: { label: 'تم التحقق', tone: 'success' },
  reversed: { label: 'معكوسة', tone: 'danger' },
  verified: { label: 'مؤكدة', tone: 'success' },
  completed: { label: 'مكتملة', tone: 'success' },
  failed: { label: 'فشلت', tone: 'danger' },
  rejected: { label: 'مرفوضة', tone: 'danger' },
  cancelled: { label: 'ملغاة', tone: 'neutral' },
};

// Notification delivery logs (Notifications, NotificationsInbox).
export const NOTIFICATION_STATUS: StatusMap = {
  sent: { label: 'أُرسلت', tone: 'success' },
  delivered: { label: 'وصلت', tone: 'success' },
  queued: { label: 'في الطابور', tone: 'neutral' },
  pending: { label: 'قيد الانتظار', tone: 'neutral' },
  failed: { label: 'فشلت', tone: 'danger' },
  bounced: { label: 'مرتدّة', tone: 'danger' },
};

// Channel provider configuration state (Notifications hub).
export const PROVIDER_STATUS: StatusMap = {
  configured: { label: 'مُفعّل', tone: 'success' },
  contact_only: { label: 'تواصل فقط', tone: 'warning' },
  not_configured: { label: 'غير مُفعّل', tone: 'neutral' },
};

// Plain (tone-less) label maps.
export const CHANNEL_LABEL: Record<string, string> = {
  email: 'بريد إلكتروني',
  sms: 'رسالة نصية',
  whatsapp: 'واتساب',
};

export function plainLabel(map: Record<string, string>, value: string | null | undefined): string {
  if (value == null || value === '') return '—';
  return map[String(value).toLowerCase().trim()] ?? String(value);
}

// Returns the Arabic label + tone for a raw enum value. Unknown/empty values
// fall back to a neutral "—" or the raw value, never a misleading other-state.
export function statusInfo(map: StatusMap, value: string | null | undefined): StatusEntry {
  if (value == null || value === '') return { label: '—', tone: 'neutral' };
  return map[String(value).toLowerCase().trim()] ?? { label: String(value), tone: 'neutral' };
}
