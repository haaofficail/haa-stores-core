/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { AdminEmptyState } from '../components/ui/AdminEmptyState';
import { TablePager } from '../components/ui/TablePager';
import { downloadRowsAsCsv } from '../lib/downloadRowsAsCsv';

const PAGE_SIZE = 50;

// P1-9 audit fix (two bugs):
//   1. This page had no tenantId/storeId filter UI but always called
//      adminApi.getAuditLogs() unscoped — and the backend returned an
//      empty array whenever both were absent. This page has therefore
//      always rendered zero rows regardless of how much audit history
//      existed. Backend now allows an unscoped (platform-wide) query.
//   2. Even once populated, the old client-side useTableControls
//      pagination sat on top of a hard-capped 200-row snapshot with no
//      total count — silently hiding older events. Now mirrors the real
//      server-side page/limit/total contract used by SupportGateway.tsx.
export default function AuditLogs() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const auditQuery = useQuery({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => adminApi.getAuditLogs({ page, limit: PAGE_SIZE }),
  });

  useEffect(() => {
    if (auditQuery.isError) toast.error(t('auditLogs.loadError', 'فشل تحميل سجل التدقيق'));
  }, [auditQuery.isError, t]);

  const result = auditQuery.data;
  const rows = (result?.data ?? []) as any[];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const startIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = total === 0 ? 0 : Math.min(total, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title2 font-bold text-gray-900 tracking-tight">{t('auditLogs.pageTitle', 'سجل التدقيق')}</h2>
        <button
          onClick={() => downloadRowsAsCsv(rows, 'audit-logs.csv')}
          disabled={rows.length === 0}
          className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
          title="يصدّر الصفحة الحالية المعروضة فقط"
        >
          تصدير الصفحة الحالية CSV
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {auditQuery.isPending ? (
          <AdminTableSkeleton columns={['w-24', 'w-32', 'w-28', 'w-20', 'w-24']} />
        ) : auditQuery.isError ? (
          <ErrorState message={t('auditLogs.loadError', 'فشل تحميل سجل التدقيق')} onRetry={() => auditQuery.refetch()} />
        ) : rows.length === 0 ? (
          <AdminEmptyState
            icon="ScrollText"
            title={t('auditLogs.empty', 'لا توجد سجلات ضمن النطاق الحالي')}
            description="إذا كانت هناك تعديلات حديثة، فهذا يحتاج فحص فلترة أو ربط audit API بدل اعتباره وضعًا طبيعيًا."
            meaning="الإجراء التالي: وسّع البحث أو راجع آخر عمليات مالية/تعطيل للتأكد من تسجيل السبب."
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{t('auditLogs.event', 'الحدث')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{t('auditLogs.user', 'المستخدم')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{t('auditLogs.target', 'الهدف')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{t('auditLogs.details', 'التفاصيل')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{t('auditLogs.date', 'التاريخ')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(l => (
                  <tr key={l.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900">{l.event || l.action || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{l.userEmail || l.userId || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{l.targetType ? `${l.targetType} #${l.targetId}` : '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{l.details || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{l.createdAt ? new Date(l.createdAt).toLocaleDateString('ar-SA') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePager
              page={page}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              filteredCount={total}
              onPageChange={setPage}
              itemLabel={t('auditLogs.itemLabel', 'سجل')}
            />
          </>
        )}
      </div>
    </div>
  );
}
