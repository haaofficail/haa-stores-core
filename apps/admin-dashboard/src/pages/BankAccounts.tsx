/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'بانتظار المراجعة', cls: 'bg-yellow-100 text-yellow-700' },
  verified:  { label: 'موثّق',            cls: 'bg-green-100 text-green-700'  },
  rejected:  { label: 'مرفوض',            cls: 'bg-red-100 text-red-700'      },
};

type BankAccountReviewStatus = 'verified' | 'rejected';

type BankAccountReviewDialog = {
  id: number;
  status: BankAccountReviewStatus;
  accountHolderName: string;
  bankName: string;
  ibanLast4: string;
};

export default function BankAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [query, setQuery]       = useState('');
  const [busy, setBusy]         = useState<number | null>(null);
  const [filter, setFilter]     = useState<'all' | 'submitted' | 'verified' | 'rejected'>('all');
  const [reviewDialog, setReviewDialog] = useState<BankAccountReviewDialog | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { setAccounts(await adminApi.getBankAccounts()); }
    catch { setError(true); toast.error('فشل تحميل الحسابات البنكية'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: number, status: BankAccountReviewStatus, reason: string) => {
    setBusy(id);
    try {
      await adminApi.reviewBankAccount(id, status, reason);
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      toast.success(status === 'verified' ? 'تم التحقق من الحساب' : 'تم رفض الحساب');
    } catch { toast.error('فشل تحديث الحساب البنكي'); }
    finally { setBusy(null); }
  };

  const openReviewDialog = (account: any, status: BankAccountReviewStatus) => {
    setReviewDialog({
      id: Number(account.id),
      status,
      accountHolderName: String(account.accountHolderName || ''),
      bankName: String(account.bankName || ''),
      ibanLast4: String(account.ibanLast4 || account.iban?.slice(-4) || ''),
    });
    setReviewReason('');
  };

  const closeReviewDialog = () => {
    setReviewDialog(null);
    setReviewReason('');
  };

  const submitReviewDecision = () => {
    if (!reviewDialog || !reviewReason.trim()) return;
    void decide(reviewDialog.id, reviewDialog.status, reviewReason.trim());
    closeReviewDialog();
  };

  const visible = accounts.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (a.bankName || '').toLowerCase().includes(q)
      || (a.accountHolderName || '').toLowerCase().includes(q)
      || (a.iban || '').toLowerCase().includes(q);
  });

  const pending = accounts.filter(a => a.status === 'submitted').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-title2 font-bold text-gray-900 tracking-tight">الحسابات البنكية</h2>
          {pending > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
              {pending} بانتظار المراجعة
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="بحث باسم البنك أو صاحب الحساب أو IBAN..."
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">جميع الحالات</option>
          <option value="submitted">بانتظار المراجعة</option>
          <option value="verified">موثّق</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <AdminTableSkeleton columns={['w-32', 'w-40', 'w-24']} rows={3} />
        ) : error ? (
          <ErrorState message="فشل تحميل الحسابات البنكية" onRetry={load} />
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-footnote text-gray-400">لا توجد حسابات بنكية</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-gray-500">صاحب الحساب</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">البنك</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">IBAN (آخر 4)</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">المتجر</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(a => {
                const s = STATUS_LABEL[a.status] ?? STATUS_LABEL.submitted;
                return (
                  <tr key={a.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.accountHolderName}</td>
                    <td className="px-4 py-3 text-gray-600">{a.bankName}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">****{a.ibanLast4 || a.iban?.slice(-4)}</td>
                    <td className="px-4 py-3 text-gray-500">{a.storeId}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {a.status === 'submitted' ? (
                        <div className="flex items-center gap-2">
	                          <button
	                            onClick={() => openReviewDialog(a, 'verified')}
	                            disabled={busy === a.id}
	                            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
	                          >
                            {busy === a.id ? '...' : 'تحقق'}
                          </button>
	                          <button
	                            onClick={() => openReviewDialog(a, 'rejected')}
	                            disabled={busy === a.id}
	                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
	                          >
                            رفض
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {reviewDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-lg mb-3">
              {reviewDialog.status === 'verified' ? 'تأكيد توثيق الحساب البنكي' : 'تأكيد رفض الحساب البنكي'}
            </h3>
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 space-y-1">
              <p><span className="text-gray-500">صاحب الحساب:</span> {reviewDialog.accountHolderName || '-'}</p>
              <p><span className="text-gray-500">البنك:</span> {reviewDialog.bankName || '-'}</p>
              <p><span className="text-gray-500">IBAN:</span> ****{reviewDialog.ibanLast4 || '----'}</p>
            </div>
            <label className="block text-xs text-gray-500 mt-4 mb-1">
              سبب القرار *
            </label>
            <textarea
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              placeholder={reviewDialog.status === 'verified'
                ? 'مثال: تمت مطابقة اسم المستفيد وآخر 4 أرقام من IBAN.'
                : 'مثال: اسم المستفيد لا يطابق بيانات المتجر.'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={closeReviewDialog}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                رجوع
              </button>
              <button
                onClick={submitReviewDecision}
                disabled={!reviewReason.trim() || busy === reviewDialog.id}
                className={`px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 ${
                  reviewDialog.status === 'verified' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {busy === reviewDialog.id ? 'جاري...' : reviewDialog.status === 'verified' ? 'تأكيد التوثيق' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
