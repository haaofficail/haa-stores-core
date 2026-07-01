import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi, newIdempotencyKey, hasAdminPermission, type UploadProofData } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { UnauthorizedState } from '../components/ui/UnauthorizedState';

const ALLOWED_RECEIPT_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024; // 5MB — same limit as the backend.

const STATUS_LABELS: Record<string, string> = {
  requested: 'مطلوبة', under_review: 'قيد المراجعة', approved: 'معتمدة',
  transfer_pending: 'قيد التحويل', transferred: 'تم التحويل', proof_uploaded: 'تم رفع الإيصال',
  transfer_verified: 'مكتملة', manual_review: 'مراجعة يدوية', awaiting_second_approval: 'بانتظار اعتماد ثانٍ', failed: 'فاشلة',
  cancelled: 'ملغاة', rejected: 'مرفوضة', reversed: 'معكوسة',
};

export default function AccountantSettlementDetail() {
  const { payoutId: payoutIdParam } = useParams();
  const payoutId = Number(payoutIdParam);
  const queryClient = useQueryClient();

  // IBAN reveal — held only transiently, never persisted/logged/exported.
  const [revealedIban, setRevealedIban] = useState<string | null>(null);

  // Upload form state.
  const [file, setFile] = useState<File | null>(null);
  const [bankReference, setBankReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [transferredAmount, setTransferredAmount] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [note, setNote] = useState('');
  const [mismatch, setMismatch] = useState<string | null>(null);

  const {
    data: detail,
    isPending: loading,
    isError: error,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.accountantSettlementDetail, payoutId],
    queryFn: () => adminApi.getAccountantDetail(payoutId),
    enabled: !!payoutIdParam,
  });

  // A payout action changes this payout's detail AND the accountant inbox queue
  // and finance reports, so invalidate all three — otherwise navigating back can
  // show pre-action status/counts until the 30s stale window expires.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.accountantSettlementDetail, payoutId] });
    queryClient.invalidateQueries({ queryKey: queryKeys.accountantInbox });
    queryClient.invalidateQueries({ queryKey: queryKeys.financeReports });
  };

  // A FORBIDDEN load error renders the unauthorized state rather than the generic error one.
  const unauthorized = error && /FORBIDDEN|صلاحية/i.test(loadError instanceof Error ? loadError.message : '');

  // Seed the upload form defaults from the loaded detail (was previously done inside `load`).
  useEffect(() => {
    if (!detail) return;
    setBankName((prev) => prev || detail.bankAccount?.bankName || '');
    setTransferredAmount((prev) => prev || detail.amount);
    setCurrency(detail.currency);
  }, [detail]);

  // Surface a load failure toast (kept from the previous catch behavior).
  useEffect(() => {
    if (error && !unauthorized) toast.error('تعذّر تحميل تفاصيل التسوية');
  }, [error, unauthorized]);

  // Clear a revealed IBAN automatically so it isn't held in memory longer than needed.
  useEffect(() => {
    if (!revealedIban) return;
    const t = setTimeout(() => setRevealedIban(null), 20000);
    return () => clearTimeout(t);
  }, [revealedIban]);

  const reveal = useCallback(async (action: 'view' | 'copy') => {
    try {
      // Destructure so the full value lives only in this scope, never on detail.
      const { iban } = await adminApi.revealIban(payoutId, action);
      if (action === 'copy') {
        await navigator.clipboard?.writeText(iban);
        toast.success('تم نسخ IBAN');
      } else {
        setRevealedIban(iban);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذّر كشف IBAN');
    }
  }, [payoutId]);

  const transferMutation = useMutation({
    mutationFn: async (status: string) => {
      const key = newIdempotencyKey(); // stable per attempt → double-click safe
      if (status === 'approved') await adminApi.markTransferPending(payoutId, key);
      else if (status === 'transfer_pending') await adminApi.markTransferred(payoutId, key);
    },
    onSuccess: () => {
      toast.success('تم تحديث حالة التحويل');
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'تعذّر بدء التحويل'),
  });

  const startTransfer = useCallback(() => {
    if (!detail || transferMutation.isPending) return;
    transferMutation.mutate(detail.status);
  }, [detail, transferMutation]);

  // The file upload runs INSIDE the mutation so `isPending` (and thus the
  // disabled Save button + the re-entrancy guard) covers the whole upload →
  // uploadProof flow. Otherwise a slow upload leaves Save enabled and a
  // double-click starts two uploads + two uploadProof calls.
  const receiptMutation = useMutation({
    mutationFn: async (vars: { file: File; base: Omit<UploadProofData, 'proofFileKey' | 'fileMimeType' | 'sha256' | 'uploadIntegritySignature'> }) => {
      const uploaded = await adminApi.uploadFile(vars.file);
      const payload: UploadProofData = {
        proofFileKey: uploaded.key,
        fileMimeType: vars.file.type,
        sha256: uploaded.sha256,
        uploadIntegritySignature: uploaded.uploadIntegritySignature,
        ...vars.base,
      };
      return adminApi.uploadProof(payoutId, payload, newIdempotencyKey());
    },
    onSuccess: () => {
      toast.success('تم حفظ الإيصال بنجاح');
      invalidate();
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : 'تعذّر رفع الإيصال';
      if (/MISMATCH/i.test(msg)) {
        // The backend parks mismatches in manual_review — surface clearly, do
        // NOT try to work around the difference from the UI.
        setMismatch(/CURRENCY/i.test(msg) ? 'العملة لا تطابق عملة التسوية' : 'المبلغ المحوّل لا يطابق صافي التسوية');
      }
      toast.error(msg);
    },
  });

  const submitReceipt = useCallback(() => {
    if (!detail || receiptMutation.isPending) return;
    setMismatch(null);
    if (!file) { toast.error('ملف الإيصال مطلوب'); return; }
    if (!ALLOWED_RECEIPT_TYPES.has(file.type)) { toast.error('نوع غير مسموح — PDF أو PNG أو JPG فقط'); return; }
    if (file.size > MAX_RECEIPT_SIZE) { toast.error('حجم الملف يتجاوز 5MB'); return; }
    if (!bankReference.trim()) { toast.error('مرجع العملية البنكية مطلوب'); return; }
    if (!transferDate) { toast.error('تاريخ التحويل مطلوب'); return; }

    receiptMutation.mutate({
      file,
      base: {
        bankReference: bankReference.trim(),
        bankName: bankName.trim() || detail.bankAccount?.bankName || '',
        transferredAt: transferDate,
        transferredAmount,
        currency,
        beneficiaryName: detail.bankAccount?.accountHolderName || detail.merchantName,
        beneficiaryIbanMasked: detail.bankAccount?.maskedIban || `****${detail.bankAccount?.ibanLast4 ?? ''}`,
        notes: note.trim() || undefined,
      },
    });
  }, [detail, receiptMutation, file, bankReference, bankName, transferDate, transferredAmount, currency, note]);

  const secondApproveMutation = useMutation({
    mutationFn: () => adminApi.secondApprovePayout(payoutId, newIdempotencyKey()),
    onSuccess: () => {
      toast.success('تم الاعتماد الثاني');
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'تعذّر الاعتماد الثاني'),
  });

  const secondApprove = useCallback(() => {
    if (!detail || secondApproveMutation.isPending) return;
    secondApproveMutation.mutate();
  }, [detail, secondApproveMutation]);

  const saving = transferMutation.isPending || receiptMutation.isPending || secondApproveMutation.isPending;
  const canMarkTransferred = hasAdminPermission('wallet.payout.mark_transferred');
  const canUploadProof = hasAdminPermission('wallet.payout.upload_proof');

  const startLabel = useMemo(() => {
    if (detail?.status === 'approved') return 'بدء التحويل';
    if (detail?.status === 'transfer_pending') return 'تسجيل التحويل البنكي';
    return null;
  }, [detail?.status]);
  const secondApprovalBlockedCopy = hasAdminPermission('wallet.payout.second_approve')
    ? 'لا يمكن لنفس المنفذ اعتماد التسوية'
    : 'يتطلب اعتمادًا من مستخدم آخر مخوّل';
  const transferPermissionCopy = 'يتطلب تنفيذ التحويل صلاحية wallet.payout.mark_transferred';
  const uploadProofPermissionCopy = 'يتطلب رفع إيصال التحويل صلاحية wallet.payout.upload_proof';

  if (loading) return <AdminTableSkeleton columns={['w-32', 'w-24', 'w-20', 'w-16']} />;
  if (unauthorized) return <UnauthorizedState permission="wallet.payout.view_all" />;
  if (error) return <ErrorState message="تعذّر تحميل تفاصيل التسوية" onRetry={() => refetch()} />;
  if (!detail) return <div className="p-12 text-center text-gray-400">التسوية غير موجودة</div>;

  const bank = detail.bankAccount;
  const proof = detail.transferProof;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-title2 font-bold text-gray-900">تفاصيل التسوية</h2>
        <Link to="/finance/settlement-inbox" className="text-sm text-primary-600 hover:underline">← صندوق التسويات</Link>
      </div>

      <section className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div><span className="text-gray-500">رقم التسوية</span><div className="font-mono">{detail.reference}</div></div>
        <div><span className="text-gray-500">التاجر</span><div>{detail.merchantName}</div></div>
        <div><span className="text-gray-500">المبلغ</span><div className="font-medium tabular-nums">{detail.amount} {detail.currency}</div></div>
        <div><span className="text-gray-500">الحالة</span><div>{STATUS_LABELS[detail.status] ?? detail.status}</div></div>
        <div><span className="text-gray-500">الفترة</span><div>{detail.period ?? '—'}</div></div>
        <div><span className="text-gray-500">عدد الطلبات</span><div className="tabular-nums">{detail.ordersCount ?? '—'}</div></div>
        <div><span className="text-gray-500">الاستحقاق</span><div>{detail.dueDate ?? '—'}</div></div>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <h3 className="font-medium text-gray-900">الحساب البنكي</h3>
        {bank ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">البنك</span><div>{bank.bankName}</div></div>
            <div><span className="text-gray-500">صاحب الحساب</span><div>{bank.accountHolderName}</div></div>
            <div><span className="text-gray-500">IBAN</span><div className="font-mono">{revealedIban ?? bank.maskedIban ?? `****${bank.ibanLast4 ?? ''}`}</div></div>
            <div><span className="text-gray-500">التوثيق</span><div>{bank.verificationStatus}</div></div>
          </div>
        ) : <p className="text-gray-400 text-sm">لا يوجد حساب بنكي موثّق</p>}
        {bank && detail.canRevealIban && (
          <div className="flex gap-2">
            <button onClick={() => reveal('view')} className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">عرض IBAN</button>
            <button onClick={() => reveal('copy')} className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">نسخ IBAN</button>
          </div>
        )}
      </section>

      {detail.awaitingSecondApproval && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
          <div className="font-medium text-amber-800">بانتظار اعتماد ثانٍ</div>
          {detail.canSecondApprove ? (
            <button onClick={secondApprove} disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40">
              {saving ? 'جارٍ الحفظ…' : 'اعتماد ثانٍ'}
            </button>
          ) : (
            <p className="text-sm text-amber-700">{secondApprovalBlockedCopy}</p>
          )}
        </section>
      )}

      {startLabel && (
        <section className="bg-white rounded-xl shadow-sm p-5">
          {canMarkTransferred ? (
            <button onClick={startTransfer} disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40">
              {saving ? 'جارٍ الحفظ…' : startLabel}
            </button>
          ) : (
            <p className="text-sm text-amber-700">{transferPermissionCopy}</p>
          )}
        </section>
      )}

      {detail.status === 'transferred' && (
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-3">
          <h3 className="font-medium text-gray-900">رفع إيصال التحويل</h3>
          {canUploadProof ? (
            <>
              {mismatch && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{mismatch}</div>}
              <input type="file" accept="application/pdf,image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input value={bankReference} onChange={(e) => setBankReference(e.target.value)} placeholder="مرجع العملية البنكية" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="اسم البنك" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input value={transferredAmount} onChange={(e) => setTransferredAmount(e.target.value)} placeholder="المبلغ المحوّل" className="rounded-lg border border-gray-300 px-3 py-2 text-sm tabular-nums" />
                <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="العملة" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <button onClick={submitReceipt} disabled={saving || !file}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40">
                {saving ? 'جارٍ الحفظ…' : 'حفظ الإيصال'}
              </button>
            </>
          ) : (
            <p className="text-sm text-amber-700">{uploadProofPermissionCopy}</p>
          )}
        </section>
      )}

      {proof && (
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-2 text-sm">
          <h3 className="font-medium text-gray-900">بيانات الإيصال</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><span className="text-gray-500">المعرّف</span><div>#{proof.receiptId}</div></div>
            <div><span className="text-gray-500">sha256</span><div className="font-mono">{(proof.sha256 ?? '').slice(0, 12)}…</div></div>
            <div><span className="text-gray-500">النوع</span><div>{proof.fileMimeType}</div></div>
            <div><span className="text-gray-500">المرجع</span><div>{proof.bankReference}</div></div>
            <div><span className="text-gray-500">البنك</span><div>{proof.bankName}</div></div>
            <div><span className="text-gray-500">التاريخ</span><div>{String(proof.transferDate).slice(0, 10)}</div></div>
            <div><span className="text-gray-500">المبلغ</span><div className="tabular-nums">{proof.transferredAmount} {proof.currency}</div></div>
          </div>
        </section>
      )}

      <section className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-medium text-gray-900 mb-3">سجل الأحداث</h3>
        <ul className="space-y-2 text-sm">
          {detail.events.map((ev) => (
            <li key={`${ev.createdAt}-${ev.eventType}-${ev.fromStatus ?? 'none'}-${ev.toStatus ?? 'none'}-${ev.actorRole ?? 'none'}`} className="flex items-center justify-between border-b last:border-0 py-1">
              <span>{ev.eventType}</span>
              <span className="text-gray-500">{ev.toStatus ?? ''} · {ev.actorRole ?? ''} · {String(ev.createdAt).slice(0, 19).replace('T', ' ')}</span>
            </li>
          ))}
          {detail.events.length === 0 && <li className="text-gray-400">لا توجد أحداث</li>}
        </ul>
      </section>
    </div>
  );
}
