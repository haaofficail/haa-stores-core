import { Link } from 'react-router-dom';
import { ArrowLeft, LifeBuoy, Mail } from 'lucide-react';

const SUPPORT_EMAIL = 'support@haastores.com';

export default function ForgotPassword() {
  const subject = encodeURIComponent('طلب استعادة كلمة المرور — لوحة التاجر');
  const body = encodeURIComponent(
    'مرحباً فريق متاجر هاء،\n\nنسيت كلمة مرور لوحة التاجر. أرجو مساعدتي في استعادتها.\n\nالبريد الإلكتروني للحساب: \n',
  );

  return (
    <div
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-50/80 via-white to-primary-50/40 p-4 sm:p-6"
    >
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center">
        <div className="relative w-full">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-2xl shadow-primary-500/10 backdrop-blur-2xl">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-500/30">
              <LifeBuoy className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">استعادة كلمة المرور</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              لا توجد حاليًا طريقة لاستعادة كلمة المرور ذاتيًا من لوحة التاجر. تواصل مع
              فريق الدعم وسنُساعدك خلال يوم عمل واحد.
            </p>

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 text-sm font-bold text-white shadow-lg shadow-primary-500/25 transition-all hover:from-primary-600 hover:to-primary-700"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              راسل الدعم
            </a>

            <p className="mt-4 text-center text-xs text-neutral-500">
              أو راسلنا مباشرة: <a className="font-mono text-primary-600" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>

            <div className="mt-6 border-t border-neutral-100 pt-5 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-primary-700"
              >
                <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
                العودة لتسجيل الدخول
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
