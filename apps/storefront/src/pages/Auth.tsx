import { useState, type FormEvent } from 'react';
import { merchantDashboardUrl } from '@/lib/merchant';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- TODO: P1-#5 migration; lucide icons as plain JSX
import { Mail, Lock, User, Phone, Store as StoreIcon, Sparkles, ArrowLeft, Loader2, Check, Shield, Bell, Star, TrendingUp, Clock } from 'lucide-react';
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

function normalizeStoreSlug(value: string){ return value.trim().toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,50); }

import { StoreButton, StoreContainer, StoreInput } from '@/components/ui';
import { useSEO } from '@/hooks/useSEO';
import { authApi } from '@/lib/auth';
import { ApiClientError as ApiError } from '@/lib/api';

/* ─── Merchant avatar stack (decorative) ─── */
const AVATAR_COLORS = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600',
  'from-orange-400 to-orange-600',
  'from-rose-400 to-rose-600',
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
            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
          ))}
        </div>
        <p className="text-xs text-text-tertiary">+١٢٠٠ تاجر نشط</p>
      </div>
    </div>
  );
}

/* ─── Stat card ─── */
function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-md">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
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

  const isSaudiPhone = /^05\d{8}$/.test(phone.trim());

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isSaudiPhone) {
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
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            {t('auth.signup.badge', 'ابدأ مجانًا — بدون بطاقة')}
          </span>

          {/* Headline */}
          <h1 className="mt-6 text-3xl font-extrabold leading-[1.1] tracking-tight text-text-primary sm:text-4xl lg:text-[2.75rem]">
            {t('auth.signup.title', 'أطلق متجرك')}
            <span className="aurora-text-gradient block">{t('auth.signup.titleHighlight', 'خلال دقيقة واحدة')}</span>
          </h1>

          <p className="mt-4 max-w-sm text-base leading-relaxed text-text-secondary sm:text-lg">
            {t('auth.signup.subtitle', 'ثيمات جاهزة، دفع سعودي، شحن مدمج — كل شيء في مكان واحد.')}
          </p>

          {/* Plan notice */}
          {plan === 'pro' && (
            <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl border border-primary/20 bg-primary-soft px-3.5 py-2 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('auth.signup.planProNotice', 'باقة احترافي — تجربة ١٤ يوم مجانًا')}</span>
            </div>
          )}

          {/* Stat cards */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <StatCard icon={TrendingUp} value="+١٢٠٠" label="تاجر نشط" />
            <StatCard icon={Clock} value="< ١ دقيقة" label="للإطلاق" />
            <StatCard icon={Star} value="٤.٩ / ٥" label="رضا التجار" />
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
                  <Check className="h-3 w-3 text-success" />
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

          <div className="rounded-3xl border border-white/50 bg-white/70 p-6 shadow-2xl shadow-primary-500/10 backdrop-blur-2xl sm:p-8">

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
                  iconStart={<User className="h-4 w-4" />}
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
                    iconStart={<Mail className="h-4 w-4" />}
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
                    iconStart={<Phone className="h-4 w-4" />}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border-subtle" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white/70 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary backdrop-blur-sm"> {/* small-text-allowed:badge */}
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
                  iconStart={<StoreIcon className="h-4 w-4" />}
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
                  <span className="bg-white/70 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary backdrop-blur-sm"> {/* small-text-allowed:badge */}
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
                iconStart={<Lock className="h-4 w-4" />}
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
                className="aurora-btn-primary w-full !rounded-2xl !text-base !font-bold"
                iconStart={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
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
        <div className="rounded-3xl border border-white/50 bg-white/70 p-8 text-center shadow-2xl shadow-primary-500/10 backdrop-blur-2xl sm:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm">
            <Bell className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            {t('auth.waitlist.title', 'انضم لقائمة الانتظار')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary sm:text-base">
            {t('auth.waitlist.subtitle', 'سنبلغك أول ما نفتح التسجيل. بدون سبام، وعد.')}
          </p>

          {status === 'success' ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success-soft p-4 text-sm text-success">
              <Check className="h-4 w-4" aria-hidden="true" />
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
                iconStart={<Mail className="h-4 w-4" />}
              />
              <StoreButton
                type="submit"
                variant="primary"
                size="lg"
                className="aurora-btn-primary w-full !rounded-2xl !font-bold"
                iconStart={<ArrowLeft className="h-4 w-4" />}
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

/* نفس مكوّن الخلفية في الصفحة الرئيسية تمامًا */
function AuroraBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-white" />
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
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
