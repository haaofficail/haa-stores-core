import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { adminApi, hasAdminPermission } from '../lib/api';
import type { SettlementBatchDetail, PayoutDetail, UploadProofData } from '../lib/api';
import { toast } from 'sonner';

const settlementStatusColors: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const settlementStatusLabels: Record<string, string> = {
  pending: 'معلق',
  processing: 'قيد المعالجة',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

const reconciliationColors: Record<string, string> = {
  matched: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  unmatched: 'bg-gray-100 text-gray-700',
};

const eventTypeLabels: Record<string, string> = {
  payout_requested: 'تم إنشاء الدفعة',
  payout_review_started: 'قيد المراجعة',
  payout_approved: 'تمت الموافقة',
  payout_rejected: 'تم الرفض',
  payout_marked_transfer_pending: 'بانتظار التحويل',
  payout_marked_transferred: 'تم تسجيل التحويل',
  payout_transfer_proof_uploaded: 'تم رفع الإثبات',
  payout_transfer_verified: 'تم التحقق',
  payout_cancelled: 'ملغية',
};

const eventTypeIcons: Record<string, string> = {
  payout_requested: '📋',
  payout_review_started: '🔍',
  payout_approved: '✅',
  payout_rejected: '❌',
  payout_marked_transfer_pending: '⏳',
  payout_marked_transferred: '📤',
  payout_transfer_proof_uploaded: '📎',
  payout_transfer_verified: '✔️',
  payout_cancelled: '🗑️',
};

function formatDate(d: string | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ar-SA');
}

function formatCurrency(val: string | number | undefined | null): string {
  if (val == null) return '0.00 SAR';
  return `${Number(val).toFixed(2)} SAR`;
}

export default function SettlementBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [searchParams] = useSearchParams();
  const manualMode = searchParams.get('manual') === '1';
  const [detail, setDetail] = useState<SettlementBatchDetail | null>(null);
  const [payout, setPayout] = useState<PayoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofFileName, setProofFileName] = useState('');
  const [proofUploading, setProofUploading] = useState(false);
  const [proofForm, setProofForm] = useState<UploadProofData>({
    bankReference: '',
    bankName: '',
    transferredAt: '',
    beneficiaryName: '',
    beneficiaryIbanMasked: '',
    notes: '',
  });

  const resetProofForm = () => {
    setProofForm({ bankReference: '', bankName: '', transferredAt: '', beneficiaryName: '', beneficiaryIbanMasked: '', notes: '' });
    setProofFileName('');
  };

  const load = useCallback(() => {
    if (!batchId) return;
    setLoading(true);
    if (manualMode) {
      adminApi.getPayout(Number(batchId))
        .then((data) => {
          setPayout(data);
          setDetail({
            id: data.id,
            provider: 'manual',
            providerBatchId: data.reference,
            currency: data.currency,
            grossAmount: data.amount,
            gatewayFees: '0',
            platformFees: '0',
            merchantPayable: data.amount,
            status: data.status,
            reconciledAt: data.verifiedAt,
            metadata: { payoutId: data.id },
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            transactions: [],
          });
        })
        .catch(() => toast.error('فشل تحميل تفاصيل التسوية اليدوية'))
        .finally(() => setLoading(false));
      return;
    }
    adminApi.getSettlementBatchDetail(Number(batchId))
      .then(setDetail)
      .catch(() => toast.error('فشل تحميل تفاصيل التسوية'))
      .finally(() => setLoading(false));
  }, [batchId, manualMode]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!detail || manualMode) return;
    const payoutId = detail.metadata?.payoutId as number | undefined;
    if (!payoutId) return;
    setPayoutLoading(true);
    adminApi.getPayout(payoutId)
      .then(setPayout)
      .catch(() => { /* payout may not exist yet */ })
      .finally(() => setPayoutLoading(false));
    // Keyed to `detail` only on purpose: `load` already depends on
    // `manualMode`, so any manualMode change refreshes `detail` and
    // re-runs this effect through it. Adding `manualMode` here would
    // double-fetch the payout (once with the stale detail, once with the new).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  const performAction = async (action: string, fn: () => Promise<unknown>) => {
    setActionLoading((prev) => ({ ...prev, [action]: true }));
    try {
      await fn();
      toast.success('تمت العملية بنجاح');
      const payoutId = (detail?.metadata?.payoutId as number | undefined) ?? payout?.id;
      if (payoutId) {
        const updated = await adminApi.getPayout(payoutId);
        setPayout(updated);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشلت العملية');
    } finally {
      setActionLoading((prev) => ({ ...prev, [action]: false }));
    }
  };

  const handleReject = () => {
    if (!payout || !rejectReason.trim()) return;
    performAction('reject', () => adminApi.rejectPayout(payout.id, rejectReason));
    setRejectModalOpen(false);
    setRejectReason('');
  };

  const handleUploadProof = () => {
    if (!payout) return;
    performAction('uploadProof', () => adminApi.uploadProof(payout.id, proofForm));
    setProofModalOpen(false);
    resetProofForm();
  };

  const handleProofFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setProofUploading(true);
    try {
      const uploaded = await adminApi.uploadFile(file);
      setProofForm((current) => ({ ...current, proofFileKey: uploaded.key }));
      setProofFileName(file.name);
      toast.success('تم رفع ملف الإثبات');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل رفع ملف الإثبات');
    } finally {
      setProofUploading(false);
    }
  };

  const handleCancel = () => {
    if (!payout || !cancelReason.trim()) return;
    performAction('cancel', () => adminApi.cancelPayout(payout.id, cancelReason));
    setCancelModalOpen(false);
    setCancelReason('');
  };

  const handleReverse = () => {
    if (!payout || !reverseReason.trim()) return;
    performAction('reverse', () => adminApi.reversePayout(payout.id, reverseReason));
    setReverseModalOpen(false);
    setReverseReason('');
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">تفاصيل دفعة التسوية</h2>
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-full bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">تفاصيل دفعة التسوية</h2>
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-sm text-gray-500">لم يتم العثور على التسوية</p>
          <Link to="/payments" className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block">
            العودة للمدفوعات
          </Link>
        </div>
      </div>
    );
  }

  const settlementRef = `SET-${String(detail.id).padStart(6, '0')}`;
  const totalFees = Number(detail.gatewayFees) + Number(detail.platformFees);

  const storeGroups = detail.transactions.reduce<Record<number, { storeId: number; count: number; totalMerchantPayable: number }>>((acc, tx) => {
    if (!acc[tx.storeId]) {
      acc[tx.storeId] = { storeId: tx.storeId, count: 0, totalMerchantPayable: 0 };
    }
    acc[tx.storeId].count += 1;
    acc[tx.storeId].totalMerchantPayable += Number(tx.merchantPayable);
    return acc;
  }, {});

  const renderActionButtons = () => {
    if (!payout) {
      if (payoutLoading) {
        return (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-400 animate-pulse">جاري تحميل بيانات الدفعة اليدوية...</p>
          </div>
        );
      }
      return null;
    }

    const s = payout.status;
    const canReview = hasAdminPermission('wallet.payout.review');
    const canApprove = hasAdminPermission('wallet.payout.approve');
    const canReject = hasAdminPermission('wallet.payout.reject');
    const canMarkTransferred = hasAdminPermission('wallet.payout.mark_transferred');
    const canUploadProof = hasAdminPermission('wallet.payout.upload_proof');
    const canVerify = hasAdminPermission('wallet.payout.verify_transfer');
    const canCancel = hasAdminPermission('wallet.payout.cancel');
    const canReverse = hasAdminPermission('wallet.payout.reverse');

    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-bold mb-4">إجراءات الدفعة اليدوية</h3>
        <p className="text-xs text-gray-500 mb-3">
          حالة الدفعة اليدوية: {payout.status}
        </p>
        <div className="flex flex-wrap gap-2">
          {s === 'requested' && canReview && (
            <button
              onClick={() => performAction('review', () => adminApi.reviewPayout(payout.id))}
              disabled={actionLoading['review']}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading['review'] ? 'جاري...' : 'بدء المراجعة'}
            </button>
          )}
          {s === 'under_review' && (
            <>
              {canApprove && (
                <button
                  onClick={() => performAction('approve', () => adminApi.approvePayout(payout.id))}
                  disabled={actionLoading['approve']}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading['approve'] ? 'جاري...' : 'اعتماد'}
                </button>
              )}
              {canReject && (
                <button
                  onClick={() => setRejectModalOpen(true)}
                  disabled={actionLoading['reject']}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  رفض
                </button>
              )}
            </>
          )}
          {s === 'approved' && canMarkTransferred && (
            <button
              onClick={() => performAction('markTransferPending', () => adminApi.markTransferPending(payout.id))}
              disabled={actionLoading['markTransferPending']}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading['markTransferPending'] ? 'جاري...' : 'تأكيد بدء التحويل'}
            </button>
          )}
          {s === 'transfer_pending' && canMarkTransferred && (
            <button
              onClick={() => performAction('markTransferred', () => adminApi.markTransferred(payout.id))}
              disabled={actionLoading['markTransferred']}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading['markTransferred'] ? 'جاري...' : 'تسجيل التحويل'}
            </button>
          )}
          {s === 'transferred' && canUploadProof && (
            <button
              onClick={() => setProofModalOpen(true)}
              disabled={actionLoading['uploadProof']}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              رفع إثبات التحويل
            </button>
          )}
          {s === 'proof_uploaded' && canVerify && (
            <button
              onClick={() => performAction('verifyTransfer', () => adminApi.verifyTransfer(payout.id))}
              disabled={actionLoading['verifyTransfer']}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {actionLoading['verifyTransfer'] ? 'جاري...' : 'التحقق'}
            </button>
          )}
          {!['transfer_verified', 'rejected', 'cancelled'].includes(s) && canCancel && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
            >
              إلغاء
            </button>
          )}
          {s === 'transfer_verified' && canReverse && (
            <button
              onClick={() => setReverseModalOpen(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
            >
              عكس الدفعة
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    const events = payout?.events;
    if (!events || events.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-bold mb-4">الجدول الزمني</h3>
          <p className="text-sm text-gray-400">لا توجد أحداث بعد</p>
        </div>
      );
    }

    const sorted = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-bold mb-4">الجدول الزمني</h3>
        <div className="space-y-0">
          {sorted.map((ev, idx) => (
            <div key={ev.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-600 mt-1.5" />
                {idx < sorted.length - 1 && <div className="w-0.5 flex-1 bg-blue-200" />}
              </div>
              <div className="pb-4 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {eventTypeIcons[ev.eventType] || '📌'} {eventTypeLabels[ev.eventType] || ev.eventType}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(ev.createdAt).toLocaleString('ar-SA')}
                </p>
                {ev.reason && (
                  <p className="text-xs text-gray-600 mt-1">{ev.reason}</p>
                )}
                {ev.actorRole && (
                  <p className="text-xs text-gray-400 mt-0.5">بواسطة: {ev.actorRole}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link to="/payments" className="text-sm text-blue-600 hover:text-blue-800">← العودة للمدفوعات</Link>
        <h2 className="text-2xl font-bold">تفاصيل دفعة التسوية</h2>
        <span className="font-mono text-sm text-gray-500">{settlementRef}</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${settlementStatusColors[detail.status] || 'bg-gray-100 text-gray-700'}`}>
          {settlementStatusLabels[detail.status] || detail.status}
        </span>
      </div>

      {/* A. Summary Section */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">رقم الدفعة</p>
          <p className="text-lg font-bold mt-1 font-mono">{settlementRef}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">تاريخ الدورة</p>
          <p className="text-lg font-bold mt-1">{formatDate(detail.createdAt)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">الحالة</p>
          <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${settlementStatusColors[detail.status] || 'bg-gray-100 text-gray-700'}`}>
            {settlementStatusLabels[detail.status] || detail.status}
          </span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">إجمالي المبلغ</p>
          <p className="text-lg font-bold mt-1">{formatCurrency(detail.grossAmount)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">إجمالي الرسوم</p>
          <p className="text-lg font-bold text-red-600 mt-1">{formatCurrency(totalFees)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">صافي الدفعة</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{formatCurrency(detail.merchantPayable)}</p>
        </div>
      </div>

      {/* D. Action Buttons Section */}
      {renderActionButtons()}

      {payout && (
        <div className="grid gap-4 md:grid-cols-3 mt-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-bold mb-3">بيانات التسوية اليدوية</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-gray-500">رقم التسوية</span><span className="font-mono font-semibold">{payout.reference}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">المتجر</span><span>#{payout.storeId}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">المبلغ</span><span className="font-semibold text-emerald-600">{formatCurrency(payout.amount)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">الحالة</span><span>{eventTypeLabels[`payout_${payout.status}`] ?? payout.status}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-bold mb-3">سجل المراجعة</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-gray-500">أنشأ الطلب</span><span>{payout.requestedByUserId ? `#${payout.requestedByUserId}` : '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">راجع</span><span>{payout.reviewedByUserId ? `#${payout.reviewedByUserId}` : '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">اعتمد</span><span>{payout.approvedByUserId ? `#${payout.approvedByUserId}` : '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">حوّل</span><span>{payout.transferredByUserId ? `#${payout.transferredByUserId}` : '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">تحقق</span><span>{payout.verifiedByUserId ? `#${payout.verifiedByUserId}` : '-'}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-bold mb-3">إثبات التحويل</h3>
            {payout.proofs.length > 0 ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><span className="text-gray-500">المرجع البنكي</span><span className="font-mono">{payout.proofs[0].bankReference}</span></div>
                <div className="flex justify-between gap-3"><span className="text-gray-500">البنك</span><span>{payout.proofs[0].bankName}</span></div>
                <div className="flex justify-between gap-3"><span className="text-gray-500">المستفيد</span><span>{payout.proofs[0].beneficiaryName}</span></div>
                <div className="flex justify-between gap-3"><span className="text-gray-500">IBAN masked</span><span>{payout.proofs[0].beneficiaryIbanMasked}</span></div>
                <div className="flex justify-between gap-3"><span className="text-gray-500">حالة الإثبات</span><span>{payout.proofs[0].verificationStatus}</span></div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">لم يتم رفع إثبات تحويل بعد</p>
            )}
          </div>
        </div>
      )}

      {/* B. Stores Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold">ملخص المتاجر</h3>
          <p className="text-sm text-gray-500 mt-0.5">{Object.keys(storeGroups).length} متجر</p>
        </div>
        {Object.keys(storeGroups).length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">لا توجد متاجر في هذه الدفعة</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-500">المتجر</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">عدد الطلبات</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">صافي المستحق</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">حالة التسوية</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(storeGroups).map((g) => (
                <tr key={g.storeId} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">#{g.storeId}</td>
                  <td className="px-4 py-3 text-gray-500">{g.count}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 tabular-nums">
                    {formatCurrency(g.totalMerchantPayable)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${settlementStatusColors[detail.status] || 'bg-gray-100 text-gray-700'}`}>
                      {settlementStatusLabels[detail.status] || detail.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* C. Orders Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold">الطلبات المشمولة في التسوية</h3>
          <p className="text-sm text-gray-500 mt-0.5">{detail.transactions.length} عملية</p>
        </div>
        {detail.transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">لا توجد معاملات في هذه التسوية</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-500">رقم الطلب</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">المتجر</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">إجمالي الطلب</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">رسوم البوابة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">عمولة المنصة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">صافي المستحق</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">حالة المطابقة</th>
              </tr>
            </thead>
            <tbody>
              {detail.transactions.map((tx) => (
                <tr key={tx.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/orders?storeId=${tx.storeId}&orderId=${tx.orderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {tx.orderNumber ?? `#${tx.orderId}`}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500">#{tx.storeId}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">{formatCurrency(tx.amount)}</td>
                  <td className="px-4 py-3 text-red-600 tabular-nums">{formatCurrency(tx.gatewayFees)}</td>
                  <td className="px-4 py-3 text-orange-600 tabular-nums">{formatCurrency(tx.platformFees)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 tabular-nums">{formatCurrency(tx.merchantPayable)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${reconciliationColors[tx.reconciliationStatus] || 'bg-gray-100 text-gray-700'}`}>
                      {tx.reconciliationStatus === 'matched' ? 'مطابق' :
                       tx.reconciliationStatus === 'pending' ? 'قيد المراجعة' :
                       tx.reconciliationStatus === 'failed' ? 'غير مطابق' :
                       'غير مطابق'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* F. Timeline Section */}
      <div className="mt-6">
        {renderTimeline()}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-lg mb-4">رفض الدفعة</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="سبب الرفض (مطلوب)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[100px]"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => { setRejectModalOpen(false); setRejectReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                إلغاء
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Proof Modal */}
      {proofModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="font-bold text-lg mb-4">رفع إثبات التحويل</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">المرجع البنكي *</label>
                <input
                  type="text"
                  value={proofForm.bankReference}
                  onChange={(e) => setProofForm({ ...proofForm, bankReference: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="رقم المرجع من البنك"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">اسم البنك *</label>
                <input
                  type="text"
                  value={proofForm.bankName}
                  onChange={(e) => setProofForm({ ...proofForm, bankName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="اسم البنك المحول منه"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">تاريخ التحويل *</label>
                <input
                  type="date"
                  value={proofForm.transferredAt}
                  onChange={(e) => setProofForm({ ...proofForm, transferredAt: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">اسم المستفيد *</label>
                <input
                  type="text"
                  value={proofForm.beneficiaryName}
                  onChange={(e) => setProofForm({ ...proofForm, beneficiaryName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="اسم صاحب الحساب المستلم"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">IBAN (آخر 4 أرقام) *</label>
                <input
                  type="text"
                  value={proofForm.beneficiaryIbanMasked}
                  onChange={(e) => setProofForm({ ...proofForm, beneficiaryIbanMasked: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="أدخل آخر 4 أرقام من IBAN فقط"
                  maxLength={4}
                />
                <p className="text-xs text-amber-600 mt-1">أدخل آخر 4 أرقام من IBAN فقط</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ملف الإثبات (اختياري)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleProofFileUpload(e.target.files?.[0])}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  disabled={proofUploading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {proofUploading ? 'جاري رفع الملف...' : proofFileName || 'يمكن حفظ الإثبات بدون ملف إذا توفر المرجع البنكي.'}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={proofForm.notes}
                  onChange={(e) => setProofForm({ ...proofForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                  placeholder="ملاحظات إضافية"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => { setProofModalOpen(false); resetProofForm(); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                إلغاء
              </button>
              <button
                onClick={handleUploadProof}
                disabled={proofUploading || !proofForm.bankReference || !proofForm.bankName || !proofForm.transferredAt || !proofForm.beneficiaryName || !proofForm.beneficiaryIbanMasked}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-lg mb-4">إلغاء الدفعة</h3>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="سبب الإلغاء (مطلوب)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[100px]"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => { setCancelModalOpen(false); setCancelReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                رجوع
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {reverseModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-lg mb-4">عكس الدفعة</h3>
            <textarea
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="سبب العكس (مطلوب)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[100px]"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => { setReverseModalOpen(false); setReverseReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                رجوع
              </button>
              <button
                onClick={handleReverse}
                disabled={!reverseReason.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
              >
                تأكيد العكس
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
