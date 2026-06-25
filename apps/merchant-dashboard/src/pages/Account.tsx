// Account ("حسابي") — IA W5 part 4.
//
// Audit (2026-06-25): the merchant's personal account fields (name,
// email, phone, password, sessions) were buried inside the store
// Settings page — conflated with store-level configuration. Apple-
// grade IA separates the merchant's identity from their store's
// configuration, so this page is the canonical home for "things
// about ME" while `/settings` stays "things about my store".
//
// This first version is intentionally a READ-ONLY surface. The
// underlying mutations (change password, manage 2FA, revoke session)
// will land in follow-up PRs as the backend endpoints mature — the
// page is the canonical destination now so the sidebar entry and the
// Topbar user-menu link land somewhere sensible from day one.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon, type MerchantIconName } from '@/components/ui/icon';
import { authApi } from '@/lib/api';
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

function ActionLink({
  iconName,
  iconClass,
  title,
  description,
  cta,
  onClick,
}: {
  iconName: MerchantIconName;
  iconClass: string;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-start gap-3 p-4 rounded-2xl border border-neutral-100 bg-white hover:bg-neutral-50 hover:border-primary-200 transition-all text-start"
    >
      <div className={`p-2.5 rounded-xl shrink-0 ${iconClass}`}>
        <Icon name={iconName} size="xs" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <span className="text-xs font-medium text-primary-600 shrink-0 mt-2 flex items-center gap-1">
        {cta}
        <Icon name="ArrowLeft" size="2xs" />
      </span>
    </button>
  );
}

export default function Account() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const comingSoon = () => toast.message(t('account.comingSoon', 'هذه الميزة قيد التطوير'));

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
          <ActionLink
            iconName="Lock"
            iconClass="bg-amber-50 text-amber-600"
            title={t('account.security.password.title', 'تغيير كلمة المرور')}
            description={t(
              'account.security.password.description',
              'استخدم كلمة مرور قوية. سيُطلب منك إدخال الحالية أولاً.',
            )}
            cta={t('account.security.password.cta', 'تغيير')}
            onClick={comingSoon}
          />
          <ActionLink
            iconName="Shield"
            iconClass="bg-emerald-50 text-emerald-600"
            title={t('account.security.twofa.title', 'التحقق بخطوتين')}
            description={t(
              'account.security.twofa.description',
              'طبقة إضافية من الأمان عند تسجيل الدخول من جهاز جديد.',
            )}
            cta={t('account.security.twofa.cta', 'إعداد')}
            onClick={comingSoon}
          />
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
