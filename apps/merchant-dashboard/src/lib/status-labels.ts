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

// Returns the Arabic label + tone for a raw enum value. Unknown/empty values
// fall back to a neutral "—" or the raw value, never a misleading other-state.
export function statusInfo(map: StatusMap, value: string | null | undefined): StatusEntry {
  if (value == null || value === '') return { label: '—', tone: 'neutral' };
  return map[String(value).toLowerCase().trim()] ?? { label: String(value), tone: 'neutral' };
}
