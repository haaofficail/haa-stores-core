/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { toast } from 'sonner';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { AdminEmptyState } from '../components/ui/AdminEmptyState';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { useTableControls } from '../lib/useTableControls';

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
  const queryClient = useQueryClient();
  const [filter, setFilter]     = useState<'all' | 'submitted' | 'verified' | 'rejected'>('all');
  const [reviewDialog, setReviewDialog] = useState<BankAccountReviewDialog | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  const { data: accounts = [], isPending: loading, isError: error, refetch } = useQuery<any[]>({
    queryKey: queryKeys.bankAccounts,
    queryFn: () => adminApi.getBankAccounts(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts });

  const reviewMutation = useMutation({
    mutationFn: (vars: { id: number; status: BankAccountReviewStatus; reason: string }) =>
      adminApi.reviewBankAccount(vars.id, vars.status, vars.reason),
    onSuccess: (_data, vars) => {
      toast.success(vars.status === 'verified' ? 'تم التحقق من الحساب' : 'تم رفض الحساب');
      closeReviewDialog();
      invalidate();
    },
    onError: () => toast.error('فشل تحديث الحساب البنكي'),
  });

  const busy = reviewMutation.isPending ? reviewMutation.variables?.id ?? null : null;

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
  const reviewReasonId = 'bank-account-review-reason';
  const reviewSubmitLabel = reviewDialog?.status === 'verified' ? 'تأكيد التوثيق' : 'تأكيد الرفض';

  const submitReviewDecision = () => {
    if (!reviewDialog || !reviewReason.trim()) return;
    reviewMutation.mutate({ id: reviewDialog.id, status: reviewDialog.status, reason: reviewReason.trim() });
  };

  const statusFiltered = accounts.filter(a => filter === 'all' || a.status === filter);

  const controls = useTableControls<any>({
    rows: statusFiltered,
    searchFields: ['bankName', 'accountHolderName', 'iban'],
    initialSort: { key: 'status', dir: 'asc' },
    storageKey: 'bankAccounts',
  });
  const { query, setQuery } = controls;

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
          <ErrorState message="فشل تحميل الحسابات البنكية" onRetry={() => refetch()} />
        ) : accounts.length === 0 ? (
          <AdminEmptyState
            icon="Building2"
            title="لا توجد حسابات بنكية للمراجعة"
            description="قد يعني ذلك أن التجار لم يضيفوا حساباتهم البنكية بعد، وليس أن كل المتاجر جاهزة للسحب."
            meaning="الإجراء التالي: افتح توثيق المتاجر أو صفحة المتاجر للعثور على المتاجر غير المكتملة."
            actions={[
              { label: 'فتح توثيق المتاجر', href: '/compliance' },
              { label: 'عرض المتاجر', href: '/stores' },
            ]}
          />
        ) : controls.filteredCount === 0 ? (
          <AdminEmptyState
            icon="AlertCircle"
            title="لا توجد نتائج ضمن الفلتر الحالي"
            description="غيّر البحث أو حالة الحساب البنكي قبل افتراض عدم وجود طلبات مراجعة."
          />
        ) : (
          <>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <SortableTh sortKey="accountHolderName" label="صاحب الحساب" sort={controls.sort} onToggle={controls.toggleSort} />
                <SortableTh sortKey="bankName" label="البنك" sort={controls.sort} onToggle={controls.toggleSort} />
                <th className="px-4 py-3 text-start font-medium text-gray-500">IBAN (آخر 4)</th>
                <SortableTh sortKey="storeId" label="المتجر" sort={controls.sort} onToggle={controls.toggleSort} />
                <SortableTh sortKey="status" label="الحالة" sort={controls.sort} onToggle={controls.toggleSort} />
                <th className="px-4 py-3 text-start font-medium text-gray-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {controls.rows.map(a => {
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
          <TablePager
            page={controls.page}
            totalPages={controls.totalPages}
            startIndex={controls.startIndex}
            endIndex={controls.endIndex}
            filteredCount={controls.filteredCount}
            onPageChange={controls.setPage}
            itemLabel="حساب"
          />
          </>
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
            <label htmlFor={reviewReasonId} className="block text-xs text-gray-500 mt-4 mb-1">
              سبب القرار *
            </label>
            <textarea
              id={reviewReasonId}
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
                {busy === reviewDialog.id ? 'جاري...' : reviewSubmitLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
