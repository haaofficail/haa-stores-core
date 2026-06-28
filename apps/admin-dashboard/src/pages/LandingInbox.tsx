import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Icon } from '../components/ui/icon';
import { landingContactsApi } from '../lib/api';
import { ErrorState } from '../components/ui/ErrorState';

// ─── Domain types (narrowed locally from `unknown` per post-P2-030 pattern) ──
// Mirrors `packages/db/src/schema/landing-contacts.ts`. Dates come over the
// wire as ISO strings, not Date instances.
type LandingContactStatus = 'new' | 'in_progress' | 'replied' | 'closed' | 'spam';

interface LandingContact {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  sourceIp: string | null;
  userAgent: string | null;
  status: LandingContactStatus;
  adminUserId: number | null;
  adminNotes: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUSES: { key: '' | LandingContactStatus; label: string }[] = [
  { key: '', label: 'الكل' },
  { key: 'new', label: 'جديدة' },
  { key: 'in_progress', label: 'قيد المعالجة' },
  { key: 'replied', label: 'تم الرد' },
  { key: 'closed', label: 'مغلقة' },
  { key: 'spam', label: 'مزعجة' },
];

const STATUS_LABELS: Record<LandingContactStatus, string> = {
  new: 'جديدة',
  in_progress: 'قيد المعالجة',
  replied: 'تم الرد',
  closed: 'مغلقة',
  spam: 'مزعجة',
};

// Status badge colors per spec: new=primary, in_progress=warning,
// replied=success, closed=neutral, spam=danger.
const STATUS_BADGE: Record<LandingContactStatus, string> = {
  new: 'bg-primary-100 text-primary-700',
  in_progress: 'bg-amber-100 text-amber-700',
  replied: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-700',
  spam: 'bg-red-100 text-red-700',
};

// Lightweight "منذ" formatter. Avoids a date-library dep — admin dashboard
// only ships react + react-router + sonner + i18next + lucide today.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'الآن';
  if (min < 60) return `منذ ${min} د`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} س`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `منذ ${day} يوم`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `منذ ${mo} شهر`;
  return new Date(iso).toLocaleDateString('ar-SA');
}

// Type guard so we can take `unknown[]` from the API and only keep rows that
// look like LandingContact. Cheaper than zod for a single consumer.
function isLandingContact(value: unknown): value is LandingContact {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'number' &&
    typeof v.name === 'string' &&
    typeof v.email === 'string' &&
    typeof v.status === 'string' &&
    typeof v.createdAt === 'string'
  );
}

function narrowContact(value: unknown): LandingContact | null {
  return isLandingContact(value) ? value : null;
}

export default function LandingInbox() {
  const [contacts, setContacts] = useState<LandingContact[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [status, setStatus] = useState<'' | LandingContactStatus>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<LandingContact | null>(null);
  const [draftStatus, setDraftStatus] = useState<LandingContactStatus>('new');
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    landingContactsApi
      .list({ status: status || undefined, page, limit })
      .then((res) => {
        const rows = res.data
          .map(narrowContact)
          .filter((row): row is LandingContact => row !== null);
        setContacts(rows);
        setTotalPages(res.totalPages || 1);
      })
      .catch(() => {
        setError(true);
        toast.error('فشل تحميل صندوق الوارد');
      })
      .finally(() => setLoading(false));
  }, [status, page]);

  // Separate "new count" lookup — uses status=new so it's accurate even
  // when the user is viewing another filter. Cheap: one tiny page query.
  const loadNewCount = useCallback(() => {
    landingContactsApi
      .list({ status: 'new', page: 1, limit: 1 })
      .then((res) => setNewCount(res.total))
      .catch(() => {
        /* badge is best-effort; failure already surfaced by main load */
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadNewCount();
  }, [loadNewCount, contacts]);

  const openDetail = (c: LandingContact) => {
    setSelected(c);
    setDraftStatus(c.status);
    setDraftNotes(c.adminNotes ?? '');
  };

  const closeDetail = () => {
    setSelected(null);
    setSaving(false);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await landingContactsApi.update(selected.id, {
        status: draftStatus,
        adminNotes: draftNotes.trim() ? draftNotes.trim() : null,
      });
      toast.success('تم حفظ التغييرات');
      // Optimistic local update so the table reflects new status without a refetch flash.
      setContacts((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? { ...c, status: draftStatus, adminNotes: draftNotes.trim() ? draftNotes.trim() : null }
            : c,
        ),
      );
      closeDetail();
      loadNewCount();
    } catch {
      toast.error('فشل حفظ التغييرات');
      setSaving(false);
    }
  };

  const markAsSpam = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await landingContactsApi.update(selected.id, { status: 'spam' });
      toast.success('تم تعليم الرسالة كمزعجة');
      setContacts((prev) => prev.map((c) => (c.id === selected.id ? { ...c, status: 'spam' } : c)));
      closeDetail();
      loadNewCount();
    } catch {
      toast.error('فشل تحديث الحالة');
      setSaving(false);
    }
  };

  const mailtoHref = useMemo(() => {
    if (!selected) return '#';
    const subject = encodeURIComponent(`رد على: ${selected.name}`);
    const body = encodeURIComponent(
      `مرحباً ${selected.name},\n\nشكراً لتواصلك معنا.\n\n---\nرسالتك الأصلية:\n${selected.message}\n`,
    );
    return `mailto:${selected.email}?subject=${subject}&body=${body}`;
  }, [selected]);

  return (
    <div dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-title2 font-bold text-gray-900 tracking-tight">صندوق الوارد</h2>
        {newCount > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
            {newCount} جديدة
          </span>
        )}
      </div>

      {/* Filter chips */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = status === s.key;
          return (
            <button
              key={s.key || 'all'}
              onClick={() => {
                setStatus(s.key);
                setPage(1);
              }}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                active
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message="فشل تحميل صندوق الوارد" onRetry={load} />
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="Inbox" size="lg" className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-500">لا توجد رسائل بعد</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-gray-500">الاسم</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">البريد</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">الجوال</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openDetail(c)}
                  className="border-t hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-700">{c.email}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${STATUS_BADGE[c.status]}`}
                    >
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500" title={new Date(c.createdAt).toLocaleString('ar-SA')}>
                    {timeAgo(c.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <span className="text-gray-500">
              صفحة {page} من {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeDetail}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selected.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selected.email}
                  {selected.phone ? ` · ${selected.phone}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="text-gray-400 hover:text-gray-600 rounded p-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="إغلاق"
              >
                <Icon name="X" size="md" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">التاريخ</p>
                <p className="text-sm font-medium">
                  {new Date(selected.createdAt).toLocaleString('ar-SA')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">الحالة الحالية</p>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_BADGE[selected.status]}`}
                >
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500">الرسالة</p>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap">
                {selected.message}
              </div>
            </div>

            <details className="rounded-xl border border-gray-100 bg-gray-50">
              <summary className="cursor-pointer px-4 py-2 text-xs text-gray-500 hover:text-gray-700">
                البيانات التقنية (IP و User Agent)
              </summary>
              <div className="px-4 pb-3 space-y-2 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400">IP: </span>
                  <span className="font-mono">{selected.sourceIp || '—'}</span>
                </div>
                <div className="break-all">
                  <span className="text-gray-400">User Agent: </span>
                  <span className="font-mono">{selected.userAgent || '—'}</span>
                </div>
              </div>
            </details>

            <div className="space-y-1">
              <label
                htmlFor="landing-inbox-status"
                className="block text-xs text-gray-500"
              >
                تحديث الحالة
              </label>
              <select
                id="landing-inbox-status"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as LandingContactStatus)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="new">جديدة</option>
                <option value="in_progress">قيد المعالجة</option>
                <option value="replied">تم الرد</option>
                <option value="closed">مغلقة</option>
                <option value="spam">مزعجة</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="landing-inbox-notes"
                className="block text-xs text-gray-500"
              >
                ملاحظات داخلية
              </label>
              <textarea
                id="landing-inbox-notes"
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 h-28"
                placeholder="ملاحظات لفريق الإدارة (لا تُعرض للمرسل)"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex-1 min-w-[120px] px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? '...' : 'حفظ'}
              </button>
              <a
                href={mailtoHref}
                className="flex-1 min-w-[120px] px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors text-center inline-flex items-center justify-center gap-2"
              >
                <Icon name="Mail" size="xs" />
                رد عبر البريد
              </a>
              <button
                type="button"
                onClick={markAsSpam}
                disabled={saving || selected.status === 'spam'}
                className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                تعليم كمزعجة
              </button>
              <button
                type="button"
                onClick={closeDetail}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
