import { useState, type FormEvent } from 'react';
import { normalizeStoreSlug, isSaudiPhone } from '@/lib/validation';
import { merchantDashboardUrl } from '@/lib/merchant';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Nav } from '@/landing/sections/Nav';

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (score > 4) score = 4;
  if (score === 0) return { score: 0, label: '', color: 'text-text-muted' };
  if (score === 1) return { score: 1, label: 'ضعيفة', color: 'text-danger' };
  if (score === 2) return { score: 2, label: 'متوسطة', color: 'text-warning' };
  if (score === 3) return { score: 3, label: 'جيدة', color: 'text-primary-500' };
  return { score: 4, label: 'قوية', color: 'text-success' };
}


import { StoreButton, StoreContainer, StoreInput } from '@/components/ui';
import { Icon, type IconName } from '@/components/ui/icon';
import { useSEO } from '@/hooks/useSEO';
import { authApi } from '@/lib/auth';
import { ApiClientError as ApiError } from '@/lib/api';

/* ─── Merchant avatar stack (decorative) ─── */
const AVATAR_COLORS = [
  'from-primary-400 to-primary-600',
  'from-primary-200 to-primary-400',
  'from-primary-600 to-primary-800',
  'from-primary-300 to-primary-500',
  'from-primary-500 to-primary-700',
];
const AVATAR_INITIALS = ['م', 'س', 'ف', 'ن', 'خ'];

function AvatarStack() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2 rtl:space-x-reverse">
        {AVATAR_COLORS.map((gradient, i) => (
          <div
            key={i}
            className={`relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xs font-bold text-white ring-2 ring-white`}
            aria-hidden="true"
          >
            {AVATAR_INITIALS[i]}
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Icon key={i} name="Star" size="2xs" className="fill-amber-400 text-amber-400" aria-hidden="true" />
          ))}
        </div>
        <p className="text-xs text-text-tertiary">+١٢٠٠ تاجر نشط</p>
      </div>
    </div>
  );
}

/* ─── Stat card ─── */
function StatCard({ name, value, label }: { name: IconName; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-white px-4 py-3 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon name={name} size="xs" />
      </div>
      <div>
        <p className="text-base font-extrabold leading-none text-text-primary">{value}</p>
        <p className="mt-0.5 text-xs text-text-tertiary">{label}</p>
      </div>
    </div>
  );
}

export function SignupPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const plan = params.get('plan') === 'pro' ? 'pro' : 'free';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useSEO({
    title: t('auth.signup.metaTitle', 'سجّل كتاجر — Haa'),
    description: t('auth.signup.metaDescription', 'أطلق متجرك مجانًا.'),
  });

  const onStoreNameChange = (value: string) => {
    setStoreName(value);
    if (!slugTouched) {
      setStoreSlug(normalizeStoreSlug(value));
    }
  };

  const phoneValid = isSaudiPhone(phone);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phoneValid) {
      setError(t('auth.signup.errors.invalidPhone', 'أدخل رقم جوال سعودي صحيح بصيغة 05XXXXXXXX.'));
      return;
    }
    setSubmitting(true);
    try {
      await authApi.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        storeName: storeName.trim(),
        storeSlug: storeSlug.trim().toLowerCase(),
      });
      // بعد التسجيل ينتقل التاجر للوحة التاجر (تطبيق منفصل على merchant.<host>).
      // لا يوجد مسار /admin في الـ storefront — كان يهبط على StoreNotFound.
      window.location.href = merchantDashboardUrl('/');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'CONFLICT') {
          setError(t('auth.signup.errors.conflict', 'البريد أو اسم المتجر مستخدم. جرّب غيره.'));
        } else if (err.code === 'INVALID_INPUT' || err.code === 'VALIDATION_ERROR') {
          setError(err.message || t('auth.signup.errors.invalidInput', 'تأكد من البيانات وحاول مرة ثانية.'));
        } else {
          setError(err.message || t('auth.signup.errors.generic', 'تعذّر إنشاء الحساب. حاول مرة ثانية.'));
        }
      } else {
        setError(t('auth.signup.errors.generic', 'تعذّر إنشاء الحساب. حاول مرة ثانية.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 xl:gap-28">

        {/* ── Left aside ── */}
        <div className="flex flex-col justify-center">
          {/* Badge */}
          <span className="aurora-pill w-fit">
            <Icon name="Shield" size="xs" aria-hidden="true" />
            {t('auth.signup.badge', 'ابدأ مجانًا — بدون بطاقة')}
          </span>

          {/* Headline */}
          <h1 className="mt-6 text-3xl font-extrabold leading-[1.1] tracking-tight text-text-primary sm:text-4xl lg:text-[2.75rem]">
            {t('auth.signup.title', 'أطلق متجرك')}
            <span className="block text-primary">{t('auth.signup.titleHighlight', 'خلال دقيقة واحدة')}</span>
          </h1>

          <p className="mt-4 max-w-sm text-base leading-relaxed text-text-secondary sm:text-lg">
            {t('auth.signup.subtitle', 'ثيمات جاهزة، دفع سعودي، شحن مدمج — كل شيء في مكان واحد.')}
          </p>

          {/* Plan notice */}
          {plan === 'pro' && (
            <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl border border-primary/20 bg-primary-soft px-3.5 py-2 text-xs font-semibold text-primary">
              <Icon name="Sparkles" size="xs" aria-hidden="true" />
              <span>{t('auth.signup.planProNotice', 'باقة احترافي — تجربة ١٤ يوم مجانًا')}</span>
            </div>
          )}

          {/* Stat cards */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <StatCard name="TrendingUp" value="+١٢٠٠" label="تاجر نشط" />
            <StatCard name="Clock" value="< ١ دقيقة" label="للإطلاق" />
            <StatCard name="Star" value="٤.٩ / ٥" label="رضا التجار" />
          </div>

          {/* Avatar stack */}
          <div className="mt-6">
            <AvatarStack />
          </div>

          {/* Trust list */}
          <ul className="mt-8 space-y-2.5">
            {[
              t('auth.signup.trust1', 'إلغاء في أي وقت بضغطة واحدة'),
              t('auth.signup.trust2', 'دعم بالعربي ٢٤/٧'),
              t('auth.signup.trust3', 'بيانات محمية ومشفرة'),
            ].map((text) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-text-secondary">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15" aria-hidden="true">
                  <Icon name="Check" size="2xs" className="text-success" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Form card ── */}
        <div className="relative">
          {/* Top accent glow */}
          <div
            className="pointer-events-none absolute -top-px inset-x-4 h-px rounded-full motion-reduce:hidden"
            style={{ background: 'linear-gradient(90deg, transparent, var(--brand-primary), transparent)' }}
            aria-hidden="true"
          />

          <div className="rounded-3xl border border-border-subtle bg-white p-6 shadow-2xl shadow-primary-500/10 sm:p-8">

            {/* Form header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-text-primary">
                {t('auth.signup.formTitle', 'أنشئ حسابك')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t('auth.signup.formSubtitle', 'بيانات متجرك في دقيقة')}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4" aria-label={t('auth.signup.title', 'سجّل كتاجر')}>

              {/* Personal info section */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary"> {/* small-text-allowed:badge */}
                  {t('auth.signup.sectionPersonal', 'معلوماتك الشخصية')}
                </p>
                <StoreInput
                  label={t('auth.signup.nameLabel', 'الاسم الكامل')}
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.signup.namePlaceholder', 'محمد العتيبي')}
                  iconStart={<Icon name="User" size="xs" />}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <StoreInput
                    label={t('auth.signup.emailLabel', 'البريد الإلكتروني')}
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    iconStart={<Icon name="Mail" size="xs" />}
                  />
                  <StoreInput
                    label={t('auth.signup.phoneLabel', 'رقم الجوال')}
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    iconStart={<Icon name="Phone" size="xs" />}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border-subtle" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary"> {/* small-text-allowed:badge */}
                    {t('auth.signup.sectionStore', 'معلومات متجرك')}
                  </span>
                </div>
              </div>

              {/* Store info section */}
              <div className="space-y-3">
                <StoreInput
                  label={t('auth.signup.storeNameLabel', 'اسم المتجر')}
                  required
                  value={storeName}
                  onChange={(e) => onStoreNameChange(e.target.value)}
                  placeholder={t('auth.signup.storeNamePlaceholder', 'متجر الأناقة')}
                  iconStart={<Icon name="Store" size="xs" />}
                />
                <StoreInput
                  label={t('auth.signup.storeSlugLabel', 'رابط المتجر')}
                  required
                  value={storeSlug}
                  onChange={(e) => { setSlugTouched(true); setStoreSlug(normalizeStoreSlug(e.target.value)); }}
                  placeholder="elegance-store"
                  pattern="[a-z0-9-]+"
                  minLength={3}
                  maxLength={50}
                  iconStart={<span className="text-xs font-medium text-text-muted">/s/</span>}
                />
              </div>

              {/* Password */}
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border-subtle" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary"> {/* small-text-allowed:badge */}
                    {t('auth.signup.sectionSecurity', 'الأمان')}
                  </span>
                </div>
              </div>

              <StoreInput
                label={t('auth.signup.passwordLabel', 'كلمة المرور')}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.signup.passwordPlaceholder', '٨ أحرف على الأقل')}
                iconStart={<Icon name="Lock" size="xs" />}
              />

              {/* Password strength meter */}
              {password.length > 0 && (() => {
                const strength = passwordStrength(password);
                return (
                  <div className="space-y-1" aria-live="polite">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            i <= strength.score
                              ? strength.score >= 3
                                ? 'bg-success'
                                : strength.score === 2
                                  ? 'bg-warning'
                                  : 'bg-danger'
                              : 'bg-border-subtle'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${strength.color}`}>
                      {t('auth.signup.passwordStrength', 'قوة كلمة المرور')}: {strength.label}
                    </p>
                  </div>
                );
              })()}

              {/* Error */}
              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger">
                  <span className="mt-0.5 shrink-0" aria-hidden="true">⚠</span>
                  {error}
                </div>
              )}

              {/* Terms */}
              <p className="text-center text-xs text-text-muted">
                {t('auth.signup.terms', 'بالمتابعة، توافق على')}{' '}
                <a href="/legal/terms" className="text-primary underline-offset-2 hover:underline">
                  {t('auth.signup.termsLink', 'الشروط والأحكام')}
                </a>
              </p>

              {/* Submit */}
              <StoreButton
                type="submit"
                variant="primary"
                size="lg"
                className="aurora-btn-primary w-full !rounded-md !text-base !font-bold"
                iconStart={submitting ? <Icon name="Loader2" size="xs" className="animate-spin" /> : <Icon name="ArrowLeft" size="xs" />}
                disabled={submitting}
              >
                {submitting ? t('auth.signup.submitting', 'جاري الإنشاء...') : t('auth.signup.submit', 'أنشئ متجري مجانًا')}
              </StoreButton>

              {/* Login link */}
              <p className="text-center text-sm text-text-secondary">
                {t('auth.signup.hasAccount', 'لديك حساب؟')}{' '}
                <a href={merchantDashboardUrl('/login')} className="font-semibold text-primary underline-offset-2 hover:underline">
                  {t('auth.signup.loginLink', 'سجّل دخولك')}
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

export function WaitlistPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useSEO({
    title: t('auth.waitlist.title', 'انضم لقائمة الانتظار — Haa'),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStatus('success');
  };

  return (
    <AuthShell>
      <StoreContainer className="max-w-md">
        <div className="rounded-3xl border border-border-subtle bg-white p-8 text-center shadow-2xl shadow-primary-500/10 sm:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm">
            <Icon name="Bell" size="lg" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            {t('auth.waitlist.title', 'انضم لقائمة الانتظار')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary sm:text-base">
            {t('auth.waitlist.subtitle', 'سنبلغك أول ما نفتح التسجيل. بدون سبام، وعد.')}
          </p>

          {status === 'success' ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success-soft p-4 text-sm text-success">
              <Icon name="Check" size="xs" aria-hidden="true" />
              <span>{t('auth.waitlist.success', 'تم! راح نبلّغك أول ما نطلق.')}</span>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-3 text-start">
              <StoreInput
                label={t('auth.waitlist.emailLabel', 'البريد الإلكتروني')}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                iconStart={<Icon name="Mail" size="xs" />}
              />
              <StoreButton
                type="submit"
                variant="primary"
                size="lg"
                className="aurora-btn-primary w-full !rounded-md !font-bold"
                iconStart={<Icon name="ArrowLeft" size="xs" />}
                disabled={status === 'submitting'}
              >
                {t('auth.waitlist.submit', 'انضم للقائمة')}
              </StoreButton>
            </form>
          )}

          <Link to="/" className="mt-6 inline-block text-sm text-text-muted hover:text-text-primary">
            ← {t('landing.nav.features', 'العودة للرئيسية')}
          </Link>
        </div>
      </StoreContainer>
    </AuthShell>
  );
}

/* Pure white background — no blobs, no tint. Per owner directive the auth
   pages must be solid white. */
function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ background: 'var(--surface-1, #fff)' }}
    />
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  const { t: i18nT } = useTranslation();
  const t = (key: string, fallback?: string): string =>
    i18nT(key, fallback ?? key) as string;

  return (
    <div id="auth-scope" data-theme-scope="auth" dir="rtl" className="relative min-h-screen overflow-x-hidden text-text-primary auth-scope">

      <AuroraBackground />

      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        تخطّى إلى المحتوى
      </a>

      {/* نفس مكوّن Nav الحقيقي من الصفحة الرئيسية */}
      <Nav t={(key, fallback) => t(key, fallback ?? key)} authMode />

      <main id="main" className="py-10 sm:py-14 lg:py-20">
        <StoreContainer>{children}</StoreContainer>
      </main>
    </div>
  );
}
