/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages still normalize API errors locally. */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icon } from '../components/ui/icon';
import { adminApi, type AdminTotpEnrollment } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

export default function Security() {
  const queryClient = useQueryClient();
  const [enrollment, setEnrollment] = useState<AdminTotpEnrollment | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const { data: status, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.adminSecurity,
    queryFn: () => adminApi.getAdminTotpStatus(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.adminSecurity });

  const startMutation = useMutation({
    mutationFn: () => adminApi.startAdminTotpEnrollment(),
    onSuccess: (data) => {
      setEnrollment(data);
      setConfirmCode('');
      toast.success('تم إنشاء مفتاح التحقق الثنائي');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'تعذر بدء تفعيل التحقق الثنائي'),
  });

  const confirmMutation = useMutation({
    mutationFn: () => adminApi.confirmAdminTotpEnrollment(confirmCode),
    onSuccess: () => {
      setEnrollment(null);
      setConfirmCode('');
      toast.success('تم تفعيل التحقق الثنائي');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'رمز التحقق غير صحيح'),
  });

  const disableMutation = useMutation({
    mutationFn: () => adminApi.disableAdminTotp(disableCode),
    onSuccess: () => {
      setDisableCode('');
      toast.success('تم تعطيل التحقق الثنائي');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'تعذر تعطيل التحقق الثنائي'),
  });

  const copySecret = async () => {
    if (!enrollment?.secret) return;
    await navigator.clipboard.writeText(enrollment.secret);
    toast.success('تم نسخ المفتاح');
  };

  if (isPending) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-title2 font-bold text-gray-900 tracking-tight">أمان الحساب</h1>
          <p className="text-sm text-gray-500 mt-1">التحقق الثنائي لحساب لوحة الإدارة</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
          status?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
        }`}>
          <Icon name="ShieldCheck" size="xs" />
          <span>{status?.enabled ? 'مفعّل' : 'غير مفعّل'}</span>
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
          <div className="flex items-start justify-between gap-3">
            <span>تعذر تحميل حالة الأمان.</span>
            <button onClick={() => refetch()} className="font-semibold text-red-800 hover:text-red-900">
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      <section className="bg-white rounded-xl border p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
            <Icon name="ShieldCheck" size="sm" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">تفعيل TOTP</h2>
            <p className="text-sm text-gray-500 mt-1">استخدم تطبيق المصادقة لإضافة المفتاح ثم أدخل الرمز.</p>
          </div>
        </div>

        {!status?.enabled && !enrollment && (
          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="ShieldCheck" size="xs" />
            <span>{startMutation.isPending ? 'جاري الإنشاء...' : 'بدء التفعيل'}</span>
          </button>
        )}

        {enrollment && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">المفتاح</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-white border px-3 py-2 text-sm text-gray-900 break-all" dir="ltr">
                    {enrollment.secret}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white"
                  >
                    نسخ
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">رابط TOTP</div>
                <a className="text-sm text-primary-700 break-all" href={enrollment.otpauthUrl}>
                  {enrollment.otpauthUrl}
                </a>
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                confirmMutation.mutate();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={confirmCode}
                onChange={event => setConfirmCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full sm:w-48 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="000000"
                required
                dir="ltr"
              />
              <button
                type="submit"
                disabled={confirmMutation.isPending || confirmCode.length !== 6}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="CheckSquare" size="xs" />
                <span>{confirmMutation.isPending ? 'جاري التحقق...' : 'تأكيد التفعيل'}</span>
              </button>
            </form>
          </div>
        )}
      </section>

      {status?.enabled && (
        <section className="bg-white rounded-xl border p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">تعطيل التحقق الثنائي</h2>
            <p className="text-sm text-gray-500 mt-1">يتطلب التعطيل رمزاً صالحاً من تطبيق المصادقة.</p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              disableMutation.mutate();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={disableCode}
              onChange={event => setDisableCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full sm:w-48 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="000000"
              required
              dir="ltr"
            />
            <button
              type="submit"
              disabled={disableMutation.isPending || disableCode.length !== 6}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="AlertTriangle" size="xs" />
              <span>{disableMutation.isPending ? 'جاري التعطيل...' : 'تعطيل'}</span>
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
