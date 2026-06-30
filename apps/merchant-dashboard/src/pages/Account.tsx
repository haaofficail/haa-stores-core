// Account ("حسابي") — IA W5 part 4.
//
// Audit (2026-06-25): the merchant's personal account fields (name,
// email, phone, password, sessions) were buried inside the store
// Settings page — conflated with store-level configuration. Apple-
// grade IA separates the merchant's identity from their store's
// configuration, so this page is the canonical home for "things
// about ME" while `/settings` stays "things about my store".
//
// The page now owns the merchant's account-security actions that are
// supported by the current backend: password rotation and session
// revocation. 2FA is shown as an explicit future capability, not as an
// actionable control, until merchant-owned TOTP endpoints exist.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon, type MerchantIconName } from '@/components/ui/icon';
import { authApi, getAuthPersistenceMode } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { messageFromError } from '@/lib/error-mapper';

interface MeData {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  tenantId: number;
  activeStoreId: number;
  roles: string[];
}

function Field({
  iconName,
  label,
  value,
  dir,
}: {
  iconName: MerchantIconName;
  label: string;
  value: string | null | undefined;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-neutral-100">
      <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600 shrink-0">
        <Icon name={iconName} size="xs" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-neutral-900 truncate" dir={dir}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

function SecurityRow({
  iconName,
  iconClass,
  title,
  description,
  badge,
}: {
  iconName: MerchantIconName;
  iconClass: string;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-white p-4">
      <div className={`p-2.5 rounded-xl shrink-0 ${iconClass}`}>
        <Icon name={iconName} size="xs" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 shrink-0">
        {badge}
      </span>
    </div>
  );
}

export default function Account() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [logoutAllConfirm, setLogoutAllConfirm] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [sessionMode] = useState(() => getAuthPersistenceMode());

  useEffect(() => {
    let cancelled = false;
    authApi.me()
      .then((data) => {
        if (!cancelled) setMe(data as MeData);
      })
      .catch((err) => {
        if (!cancelled) toast.error(messageFromError(err, t));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [t]);

  const passwordError = useMemo(() => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      return t('account.security.password.errors.required', 'أكمل جميع حقول كلمة المرور');
    }
    if (passwordForm.newPassword.length < 8) {
      return t('account.security.password.errors.short', 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف');
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return t('account.security.password.errors.mismatch', 'تأكيد كلمة المرور غير مطابق');
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      return t('account.security.password.errors.same', 'اختر كلمة مرور جديدة مختلفة عن الحالية');
    }
    return null;
  }, [passwordForm, t]);

  const sessionLabel = sessionMode === 'local'
    ? t('account.security.session.remembered', 'تذكّرني مفعل')
    : t('account.security.session.browserOnly', 'جلسة المتصفح فقط');

  const updatePasswordField = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success(t('account.security.password.success', 'تم تغيير كلمة المرور. سجّل الدخول مرة أخرى.'));
      logout();
    } catch (err) {
      toast.error(messageFromError(err, t));
    } finally {
      setSavingPassword(false);
    }
  };

  const logoutAllSessions = async () => {
    if (!logoutAllConfirm) {
      setLogoutAllConfirm(true);
      toast.message(t('account.security.sessions.confirmToast', 'اضغط مرة أخرى لتأكيد إنهاء كل الجلسات'));
      return;
    }
    setLogoutAllLoading(true);
    try {
      await authApi.logoutAll();
      toast.success(t('account.security.sessions.success', 'تم إنهاء كل الجلسات. سجّل الدخول مرة أخرى.'));
      logout();
    } catch (err) {
      toast.error(messageFromError(err, t));
      setLogoutAllConfirm(false);
    } finally {
      setLogoutAllLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
        <Skeleton className="h-10 w-48 rounded-2xl" />
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!me) return null;

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/25">
          <Icon name="User" size="default" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {t('account.title', 'حسابي')}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {t('account.description', 'بيانات هويتك على المنصة — منفصلة عن إعدادات المتجر')}
          </p>
        </div>
      </div>

      {/* Identity */}
      <section>
        <h2 className="text-sm font-bold text-neutral-700 mb-3 px-1">
          {t('account.identity.heading', 'الهوية')}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            iconName="User"
            label={t('account.identity.name', 'الاسم')}
            value={me.name}
          />
          <Field
            iconName="Mail"
            label={t('account.identity.email', 'البريد الإلكتروني')}
            value={me.email}
            dir="ltr"
          />
          <Field
            iconName="Phone"
            label={t('account.identity.phone', 'رقم الجوال')}
            value={me.phone}
            dir="ltr"
          />
          <Field
            iconName="Shield"
            label={t('account.identity.role', 'الدور')}
            value={me.roles?.join(', ') || '—'}
          />
        </div>
      </section>

      {/* Security */}
      <section>
        <h2 className="text-sm font-bold text-neutral-700 mb-3 px-1">
          {t('account.security.heading', 'الأمان')}
        </h2>
        <div className="grid gap-3">
          <SecurityRow
            iconName="Shield"
            iconClass="bg-emerald-50 text-emerald-600"
            title={t('account.security.session.title', 'حالة الجلسة الحالية')}
            description={t(
              'account.security.session.description',
              'لا تظهر رموز الدخول أو الكوكيز في الواجهة. يمكنك إنهاء الجلسات من هذا القسم.',
            )}
            badge={sessionLabel}
          />

          <form
            onSubmit={changePassword}
            className="rounded-2xl border border-neutral-100 bg-white p-4 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <Icon name="Lock" size="xs" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900">
                  {t('account.security.password.title', 'تغيير كلمة المرور')}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                  {t(
                    'account.security.password.description',
                    'أدخل كلمة المرور الحالية. بعد النجاح سيتم إنهاء كل الجلسات وتسجيل الدخول من جديد.',
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                {t('account.security.password.current', 'كلمة المرور الحالية')}
                <input
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                {t('account.security.password.next', 'كلمة المرور الجديدة')}
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                {t('account.security.password.confirm', 'تأكيد كلمة المرور')}
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </label>
            </div>

            {passwordError && (
              <p className="text-xs font-medium text-amber-700">
                {passwordError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-neutral-500">
                {t('account.security.password.notice', 'لا يتم عرض أو تسجيل كلمة المرور. يتم حفظ hash جديد فقط.')}
              </p>
              <button
                type="submit"
                disabled={savingPassword || Boolean(passwordError)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                <Icon name="Lock" size="xs" />
                {savingPassword
                  ? t('account.security.password.saving', 'جار التغيير...')
                  : t('account.security.password.cta', 'تغيير كلمة المرور')}
              </button>
            </div>
          </form>

          <SecurityRow
            iconName="Shield"
            iconClass="bg-neutral-100 text-neutral-600"
            title={t('account.security.twofa.title', 'التحقق بخطوتين')}
            description={t(
              'account.security.twofa.description',
              'غير متاح لحسابات التاجر بعد. لا يتم تقديمه كحماية مفعّلة حتى تكتمل endpoints الخاصة به.',
            )}
            badge={t('account.security.twofa.unavailable', 'غير متاح بعد')}
          />

          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-white text-rose-600 shrink-0">
                  <Icon name="LogOut" size="xs" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-rose-950">
                    {t('account.security.sessions.title', 'إنهاء كل الجلسات')}
                  </p>
                  <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                    {t(
                      'account.security.sessions.description',
                      'يرفع هذا الإجراء إصدار الجلسة ويلغي كل رموز الدخول القديمة لهذا الحساب.',
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={logoutAllSessions}
                disabled={logoutAllLoading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="LogOut" size="xs" />
                {logoutAllLoading
                  ? t('account.security.sessions.loading', 'جار الإنهاء...')
                  : logoutAllConfirm
                    ? t('account.security.sessions.confirm', 'تأكيد الإنهاء')
                    : t('account.security.sessions.cta', 'إنهاء الجلسات')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-links to store-level settings */}
      <section>
        <h2 className="text-sm font-bold text-neutral-700 mb-3 px-1">
          {t('account.elsewhere.heading', 'إعدادات المتجر')}
        </h2>
        <div className="rounded-2xl border border-neutral-100 bg-white p-4 text-sm text-neutral-600 leading-relaxed">
          {t(
            'account.elsewhere.description',
            'إعدادات المتجر (الاسم، الشعار، الدفع، الشحن) منفصلة عن حسابك الشخصي.',
          )}
          {' '}
          <Link to="/settings" className="text-primary-600 font-semibold hover:text-primary-700">
            {t('account.elsewhere.cta', 'افتح إعدادات المتجر')}
          </Link>
        </div>
      </section>

      {/* Logout */}
      <section>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
        >
          <Icon name="LogOut" size="xs" />
          {t('account.logout', 'تسجيل الخروج')}
        </button>
      </section>
    </div>
  );
}
