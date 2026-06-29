// Fake3DSChallengePage — DEV-ONLY page that simulates a SAMA 3-D Secure
// challenge flow when the FakePaymentProvider is used with the
// `fake_3ds_challenge` payment method.
//
// The real flow:
//   1. Storefront checkout calls /confirm → FakePaymentProvider returns
//      redirectUrl = `/fake-3ds-challenge?paymentId=X` (from packages/payment-providers/src/fake.ts)
//   2. Storefront redirects the customer here
//   3. Customer sees "succeed" / "fail" buttons
//   4. On click, we call the API's 3DS callback endpoint to mark the
//      payment as 'paid' (or 'failed')
//   5. Customer is redirected to the order success page
//
// This page is ONLY for dev/staging environments. In production, the
// redirectUrl points to Moyasar's/Geidea's hosted challenge page.

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Icon } from '@/components/ui/icon';
import { checkoutApi } from '@/lib/api';
import { toast } from 'sonner';

const DEV_NOTICE = 'DEV ONLY — Fake 3-D Secure Challenge (SAMA sandbox simulation)';

export default function Fake3DSChallengePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = Number(searchParams.get('paymentId') ?? '0');
  const slug = searchParams.get('slug') ?? 'haa-demo';

  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Auto-elapsed timer to make the page feel like a real bank challenge
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (success: boolean) => {
    if (!paymentId) {
      toast.error('Missing paymentId in URL');
      return;
    }
    setSubmitting(true);
    try {
      // Call the 3DS callback endpoint we added in Session #4
      await checkoutApi.complete3DSChallenge(slug, paymentId, success);
      if (success) {
        toast.success('3DS verification succeeded');
        // Redirect to order success — we don't know the order number here
        // so we redirect to the order tracking page which shows the latest
        navigate(`/s/${slug}/track`);
      } else {
        toast.error('3DS verification failed — payment cancelled');
        navigate(`/s/${slug}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '3DS verification error');
      setSubmitting(false);
    }
  };

  return (
    <div id="storefront-scope" data-theme-scope="storefront" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-x-hidden" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div
          data-testid="fake-3ds-dev-badge"
          role="status"
          aria-label="DEV only fake 3DS challenge"
          className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-amber-950"
        >
          <span dir="ltr">DEV TEST</span>
          <span>محاكاة محلية فقط — ليست تحدي بنك أو دفع حقيقي</span>
        </div>
        {/* Bank-style header */}
        <div className="bg-gradient-to-r from-primary-700 to-primary-900 text-white p-6 text-center">
          <Icon name="ShieldCheck" size="xl" className="mx-auto mb-3 text-primary-200" />
          <h1 className="text-xl font-bold mb-1">3-D Secure Verification</h1>
          <p className="text-xs text-primary-200 font-mono uppercase tracking-wider">{DEV_NOTICE}</p>
        </div>

        {/* Challenge body */}
        <div className="p-6 space-y-5">
          {/* Transaction summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">رقم العملية / Transaction ID</span>
              <span className="font-mono font-semibold">#{paymentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">المتجر / Merchant</span>
              <span className="font-semibold">{slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الوقت / Elapsed</span>
              <span className="font-mono font-semibold">{elapsed}s</span>
            </div>
          </div>

          {/* OTP input (purely visual — dev only) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              رمز التحقق / Verification Code
            </label>
            <input
              type="text"
              placeholder="••••"
              maxLength={6}
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
              disabled={submitting}
              readOnly
              value="123456"
              aria-label="Fake OTP (dev only)"
            />
            <p className="text-xs text-slate-400 mt-1.5 text-center">
              Pre-filled for dev. Real 3DS would SMS this code to the cardholder.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-success hover:bg-success disabled:bg-slate-300 text-white font-bold py-4 rounded-xl transition-colors"
              data-testid="fake-3ds-succeed"
            >
              {submitting ? (
                <>
                  <Icon name="Loader2" size="md" className="animate-spin" />
                  جاري التأكيد… / Confirming…
                </>
              ) : (
                <>
                  <Icon name="CheckCircle2" size="md" />
                  نجاح — إتمام الدفع / Succeed — Complete Payment
                </>
              )}
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-danger-soft disabled:bg-slate-100 text-danger font-semibold py-3 rounded-xl border-2 border-danger hover:border-danger transition-colors"
              data-testid="fake-3ds-fail"
            >
              <Icon name="XCircle" size="md" />
              إلغاء — فشل التحقق / Cancel — Verification Failed
            </button>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-slate-400 pt-3 border-t border-slate-100 space-y-1">
            <p>تأمين SAMA 3-D Secure — يحمي بياناتك ضد الاحتيال</p>
            <p>SAMA-compliant 3DS protection against fraud</p>
            <Link to="/" className="text-primary-600 hover:underline">
              العودة للمتجر / Back to store
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
