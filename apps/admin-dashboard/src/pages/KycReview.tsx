/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, type AdminKycReviewStatus } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { toast } from 'sonner';
import { Icon } from '../components/ui/icon';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { AdminEmptyState } from '../components/ui/AdminEmptyState';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { useTableControls } from '../lib/useTableControls';

export default function KycReview() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const { data: profiles = [], isPending: loading, isError: error, refetch } = useQuery<any[]>({
    queryKey: queryKeys.kycProfiles,
    queryFn: () => adminApi.getKycProfiles(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.kycProfiles });

  const reviewMutation = useMutation({
    mutationFn: (vars: { id: number; status: AdminKycReviewStatus; rejectionReason?: string }) =>
      adminApi.reviewKyc(vars.id, vars.status, vars.rejectionReason),
    onSuccess: (_data, vars) => {
      toast.success(vars.status === 'approved' ? t('kyc.approved', 'تم اعتماد الملف') : t('kyc.rejected', 'تم رفض الملف'));
      setRejectingId(null);
      setRejectReason('');
      setSelectedProfile((prev: any) => prev ? { ...prev, status: vars.status } : null);
      invalidate();
    },
    onError: () => toast.error(t('kyc.updateError', 'فشل تحديث حالة الملف')),
  });

  const review = (id: number, status: AdminKycReviewStatus, rejectionReason?: string) =>
    reviewMutation.mutate({ id, status, rejectionReason });

  const openDetail = (p: any) => {
    setSelectedProfile(p);
    setDetailOpen(true);
  };

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = {
      not_started: t('kyc.statusNotStarted', 'لم يبدأ'),
      draft: t('kyc.statusDraft', 'مسودة'),
      submitted: t('kyc.statusSubmitted', 'مقدم'),
      under_review: t('kyc.statusUnderReview', 'قيد المراجعة'),
      approved: t('kyc.statusApproved', 'معتمد'),
      rejected: t('kyc.statusRejected', 'مرفوض'),
      needs_more_info: t('kyc.statusNeedsInfo', 'يحتاج معلومات')
    };
    return labels[s] || s;
  };

  const controls = useTableControls<any>({
    rows: profiles,
    filterFn: (p, q) => {
      const term = q.toLowerCase();
      return String(p.storeId || '').includes(term) || (p.legalName || p.commercialName || '').toLowerCase().includes(term);
    },
    initialSort: { key: 'storeId', dir: 'desc' },
    storageKey: 'kycReview',
  });
  const { query, setQuery } = controls;

  return (
    <div>
      <h2 className="text-title2 font-bold text-gray-900 tracking-tight mb-4">{t('kyc.pageTitle', 'مراجعة التحقق')}</h2>
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('kyc.search', 'بحث باسم الشركة أو رقم المتجر...')}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <AdminTableSkeleton columns={['w-16', 'w-24', 'w-32', 'w-20', 'w-24']} />
        ) : error ? (
          <ErrorState message={t('kyc.loadError', 'فشل تحميل ملفات التحقق')} onRetry={() => refetch()} />
        ) : profiles.length === 0 ? (
          <AdminEmptyState
            icon="ShieldCheck"
            title={t('kyc.noProfiles', 'لا توجد ملفات تحقق للمراجعة')}
            description="هذا لا يعني أن كل التجار موثقون؛ قد يعني أن التجار لم يبدؤوا التوثيق أو لم يرسلوا طلبًا بعد."
            meaning="الإجراء التالي: افتح توثيق المتاجر لعرض غير المكتملين وموانع النشر."
            actions={[{ label: 'فتح توثيق المتاجر', href: '/compliance' }]}
          />
        ) : controls.filteredCount === 0 ? (
          <AdminEmptyState
            icon="AlertCircle"
            title={t('kyc.noResults', 'لا توجد نتائج مطابقة')}
            description="غيّر البحث قبل اعتبار قائمة التحقق خالية من الطلبات."
          />
        ) : (
          <>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <SortableTh sortKey="storeId" label={t('kyc.store', 'المتجر')} sort={controls.sort} onToggle={controls.toggleSort} />
                <SortableTh sortKey="businessType" label={t('kyc.type', 'النوع')} sort={controls.sort} onToggle={controls.toggleSort} />
                <SortableTh sortKey="legalName" label={t('kyc.legalName', 'الاسم التجاري')} sort={controls.sort} onToggle={controls.toggleSort} />
                <SortableTh sortKey="status" label={t('kyc.status', 'الحالة')} sort={controls.sort} onToggle={controls.toggleSort} />
                <th className="px-4 py-3 text-start font-medium text-gray-500">{t('common.actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {controls.rows.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-900">#{p.storeId}</td>
                  <td className="px-4 py-3 text-gray-500">{p.businessType}</td>
                  <td className="px-4 py-3 text-gray-900">{p.legalName || p.commercialName || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      p.status === 'approved' ? 'bg-green-100 text-green-700' :
                      p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      p.status === 'submitted' ? 'bg-primary-100 text-primary-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{statusLabel(p.status)}</span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => openDetail(p)} className="text-sm text-gray-600 hover:text-gray-900 ms-2 transition-colors cursor-pointer px-2 py-1" title={t('kyc.viewDetails', 'عرض التفاصيل')}>
                      <Icon name="Eye" size="xs" className="inline-block" />
                    </button>
                    {p.status === 'submitted' || p.status === 'under_review' ? (
                      <>
                        <button
                          onClick={() => review(p.id, 'approved')}
                          className="text-sm text-green-600 hover:text-green-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded px-2 py-1"
                        >
                          {t('kyc.approve', 'قبول')}
                        </button>
                        <button
                          onClick={() => { setRejectReason(''); setRejectingId(p.id); }}
                          className="text-sm text-red-600 hover:text-red-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-2 py-1"
                        >
                          {t('kyc.reject', 'رفض')}
                        </button>
                      </>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePager
            page={controls.page}
            totalPages={controls.totalPages}
            startIndex={controls.startIndex}
            endIndex={controls.endIndex}
            filteredCount={controls.filteredCount}
            onPageChange={controls.setPage}
            itemLabel={t('kyc.itemLabel', 'طلب')}
          />
          </>
        )}
      </div>

      {detailOpen && selectedProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{t('kyc.detailTitle', 'تفاصيل ملف التحقق - متجر #{{storeId}}', { storeId: selectedProfile.storeId })}</h3>
              <button onClick={() => setDetailOpen(false)} className="text-gray-400 hover:text-gray-600">{t('common.close', 'إغلاق')}</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{t('kyc.legalName', 'الاسم التجاري')}</p>
                <p className="text-sm font-medium">{selectedProfile.legalName || selectedProfile.commercialName || '-'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{t('kyc.businessType', 'نوع النشاط')}</p>
                <p className="text-sm font-medium">{selectedProfile.businessType}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{t('kyc.registrationNumber', 'رقم السجل التجاري')}</p>
                <p className="text-sm font-medium">{selectedProfile.registrationNumber || '-'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{t('kyc.currentStatus', 'الحالة الحالية')}</p>
                <p className="text-sm font-medium">{statusLabel(selectedProfile.status)}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900">{t('kyc.documents', 'المستندات المرفوعة')}</h4>
              <div className="grid grid-cols-1 gap-2">
                {selectedProfile.documents?.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Icon name="FileText" size="md" className="text-gray-400" />
                      <span className="text-sm text-gray-700">{doc.type}</span>
                    </div>
                    {doc.fileUrl ? (
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">{t('kyc.viewFile', 'عرض الملف')}</a>
                    ) : (
                      <span className="text-xs text-gray-400">{t('kyc.fileNotAvailable', 'الملف غير متاح')}</span>
                    )}
                  </div>
                ))}
                {!selectedProfile.documents?.length && <p className="text-xs text-gray-400">{t('kyc.noDocuments', 'لا توجد مستندات مرفوعة')}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{t('kyc.rejectionReason', 'سبب الرفض')}</h3>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('kyc.rejectionHint', 'يرجى توضيح سبب الرفض للمتجر')}</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 h-32"
                placeholder={t('kyc.rejectionPlaceholder', 'مثال: الصورة غير واضحة، المستند منتهي الصلاحية...')}
              />
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => { if (!rejectReason.trim()) { toast.error(t('kyc.rejectionRequired', 'يرجى إدخال سبب الرفض')); return; } review(rejectingId, 'rejected', rejectReason); }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={!rejectReason.trim()}
              >
                {t('kyc.confirmRejection', 'تأكيد الرفض')}
              </button>
              <button
                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel', 'إلغاء')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
