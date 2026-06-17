import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Phone, Store as StoreIcon, Sparkles, ArrowLeft, Loader2, Check, Eye, EyeOff, Shield, Bell } from 'lucide-react';
import { StoreButton, StoreContainer, StoreInput } from '@/components/ui';
import { useSEO } from '@/hooks/useSEO';
import { usePlatformBrand } from '@/hooks/usePlatformBrand';
import { authApi } from '@/lib/auth';
import { ApiClientError as ApiError } from '@/lib/api';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: t('auth.login.metaTitle', 'تسجيل الدخول — Haa'),
    description: t('auth.login.metaDescription', 'ادخل على لوحة تحكم متجرك.'),
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const session = await authApi.login(email.trim().toLowerCase(), password);
      // Redirect to merchant dashboard on success.
      const target = session.store?.slug
        ? `/admin?store=${encodeURIComponent(session.store.slug)}`
        : '/admin';
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          setError(t('auth.login.errors.invalidCredentials', 'البريد أو كلمة المرور غير صحيحة'));
        } else if (err.code === 'FORBIDDEN') {
          setError(t('auth.login.errors.noTenant', 'هذا الحساب غير مرتبط بمتجر. تواصل مع الدعم.'));
        } else {
          setError(err.message || t('auth.login.errors.generic', 'تعذّر تسجيل الدخول. حاول مرة ثانية.'));
        }
      } else {
        setError(t('auth.login.errors.generic', 'تعذّر تسجيل الدخول. حاول مرة ثانية.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <AuthAside
          badge={t('auth.login.badge', 'نرجع لك')}
          title={t('auth.login.title', 'أهلًا فيك من جديد')}
          subtitle={t('auth.login.subtitle', 'سجّل دخولك على لوحة التحكم.')}
        />

        <div className="rounded-modal border border-border-subtle bg-surface p-6 shadow-card sm:p-8">
          <form
            onSubmit={onSubmit}
            className="space-y-4"
            aria-label={t('auth.login.title', 'تسجيل الدخول')}
          >
            <StoreInput
              label={t('auth.login.emailLabel', 'البريد الإلكتروني')}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.login.emailPlaceholder', 'you@example.com')}
              iconStart={<Mail className="h-4 w-4" />}
            />

            <div>
              <StoreInput
                label={t('auth.login.passwordLabel', 'كلمة المرور')}
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.login.passwordPlaceholder', '••••••••')}
                iconStart={<Lock className="h-4 w-4" />}
              />
              <div className="mt-2 flex items-center justify-between text-sm">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-text-secondary">
                  <input type="checkbox" className="h-4 w-4 rounded border-border-subtle accent-primary" />
                  <span>{t('auth.login.rememberMe', 'تذكّرني')}</span>
                </label>
                <a href="#forgot" className="min-h-[44px] inline-flex items-center text-primary hover:underline">
                  {t('auth.login.forgotPassword', 'نسيت كلمة المرور؟')}
                </a>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
                {error}
              </div>
            )}

            <StoreButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              iconStart={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
              disabled={submitting}
            >
              {submitting ? t('auth.login.submitting', 'جاري الدخول...') : t('auth.login.submit', 'تسجيل الدخول')}
            </StoreButton>

            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border-subtle" />
              <span className="text-xs text-text-muted">{t('auth.login.divider', 'أو')}</span>
              <div className="h-px flex-1 bg-border-subtle" />
            </div>

            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-5 text-center">
              <p className="text-sm font-medium text-text-secondary">
                {t('auth.login.signupCta', 'ما عندك حساب؟')}
              </p>
              <Link
                to="/signup"
                className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
              >
                {t('auth.login.signupLink', 'سجّل كتاجر جديد')}
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}

export function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  useSEO({
    title: t('auth.signup.metaTitle', 'سجّل كتاجر — Haa'),
    description: t('auth.signup.metaDescription', 'أطلق متجرك مجانًا.'),
  });

  // Auto-derive slug from store name (kebab-case, ASCII fallback).
  // User can override manually.
  const onStoreNameChange = (value: string) => {
    setStoreName(value);
    if (!storeSlug) {
      const derived = value
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setStoreSlug(derived);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const session = await authApi.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        storeName: storeName.trim(),
        storeSlug: storeSlug.trim().toLowerCase(),
      });
      // Redirect to merchant dashboard on success.
      const target = session.store?.slug
        ? `/admin?store=${encodeURIComponent(session.store.slug)}`
        : '/admin';
      navigate(target, { replace: true });
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
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <AuthAside
          badge={t('auth.signup.badge', 'ابدأ مجانًا')}
          title={t('auth.signup.title', 'أطلق متجرك خلال دقيقة')}
          subtitle={t('auth.signup.subtitle', 'سجّل كتاجر وابدأ تجربة المنصة.')}
          planNotice={plan === 'pro' ? t('auth.signup.planProNotice', 'أنت على باقة احترافي (تجربة 14 يوم)') : t('auth.signup.planFreeNotice', 'أنت على الباقة المجانية')}
        />

        <div className="rounded-modal border border-border-subtle bg-surface p-6 shadow-card sm:p-8">
          <form onSubmit={onSubmit} className="space-y-4" aria-label={t('auth.signup.title', 'سجّل كتاجر')}>
            <StoreInput
              label={t('auth.signup.nameLabel', 'الاسم الكامل')}
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.signup.namePlaceholder', 'محمد العتيبي')}
              iconStart={<User className="h-4 w-4" />}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <StoreInput
                label={t('auth.signup.emailLabel', 'البريد الإلكتروني')}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.signup.emailPlaceholder', 'you@example.com')}
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
                placeholder={t('auth.signup.phonePlaceholder', '05XXXXXXXX')}
                iconStart={<Phone className="h-4 w-4" />}
              />
            </div>

            <StoreInput
              label={t('auth.signup.storeNameLabel', 'اسم المتجر')}
              required
              value={storeName}
              onChange={(e) => onStoreNameChange(e.target.value)}
              placeholder={t('auth.signup.storeNamePlaceholder', 'متجر الأناقة')}
              iconStart={<StoreIcon className="h-4 w-4" />}
            />

            <StoreInput
              label={t('auth.signup.storeSlugLabel', 'رابط المتجر (slug)')}
              required
              value={storeSlug}
              onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={t('auth.signup.storeSlugPlaceholder', 'elegance-store')}
              pattern="[a-z0-9-]+"
              minLength={3}
              maxLength={50}
              iconStart={<span className="text-xs text-text-muted">/s/</span>}
            />

            <StoreInput
              label={t('auth.signup.passwordLabel', 'كلمة المرور')}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.signup.passwordPlaceholder', '8 أحرف على الأقل')}
              iconStart={<Lock className="h-4 w-4" />}
            />

            {error && (
              <div className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>
            )}

            <p className="text-center text-xs text-text-muted">
              {t('auth.signup.terms', 'بالمتابعة، توافق على')}{' '}
              <a href="/legal/terms" className="text-primary hover:underline">
                {t('auth.signup.termsLink', 'الشروط')}
              </a>
              {' ' + t('auth.signup.privacyLink', 'والخصوصية').replace(/^وال/, 'وال')}
            </p>

            <StoreButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              iconStart={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
              disabled={submitting}
            >
              {submitting ? t('auth.signup.submitting', 'جاري الإنشاء...') : t('auth.signup.submit', 'أنشئ متجري')}
            </StoreButton>

            <p className="text-center text-sm text-text-secondary">
              {t('auth.signup.loginCta', 'عندك حساب؟')}{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                {t('auth.signup.loginLink', 'سجّل دخول')}
              </Link>
            </p>
          </form>
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
        <div className="rounded-modal border border-border-subtle bg-surface p-8 text-center shadow-card sm:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Bell className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            {t('auth.waitlist.title', 'انضم لقائمة الانتظار')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary sm:text-base">
            {t('auth.waitlist.subtitle', 'سنبلغك أول ما نفتح التسجيل. بدون سبام، وعد.')}
          </p>

          {status === 'success' ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-md border border-success/30 bg-success-soft p-4 text-sm text-success">
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>{t('auth.waitlist.success', 'تم! راح نبلّغك أول ما نطلق.')}</span>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-3 text-start">
              <StoreInput
                label={t('auth.waitlist.emailLabel', 'البريد الإلكتروني')}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.waitlist.emailPlaceholder', 'you@example.com')}
                iconStart={<Mail className="h-4 w-4" />}
              />
              <StoreButton
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                iconStart={<ArrowLeft className="h-4 w-4" />}
                disabled={status === 'submitting'}
              >
                {t('auth.waitlist.submit', 'انضم للقائمة')}
              </StoreButton>
            </form>
          )}

          <Link to="/" className="mt-6 inline-block text-sm text-text-muted hover:text-text-primary">
            {t('landing.nav.features', '← العودة للرئيسية')}
          </Link>
        </div>
      </StoreContainer>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  const [logoError, setLogoError] = useState(false);
  const { platformLogoUrl } = usePlatformBrand();
  const showLogo = !!platformLogoUrl && !logoError;

  return (
    <div dir="rtl" className="min-h-screen bg-surface-2 text-text-primary">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        تخطّى إلى المحتوى
      </a>

      <header className="border-b border-border-subtle bg-surface">
        <StoreContainer className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Haa">
            {showLogo ? (
              <img key={platformLogoUrl} src={platformLogoUrl!} alt="Haa" className="platform-logo h-9 w-auto" onError={() => setLogoError(true)} />
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-card bg-primary text-primary-foreground" aria-hidden="true">
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="text-lg font-bold tracking-tight text-text-primary">Haa</span>
              </>
            )}
          </Link>
          <Link to="/" className="text-sm text-text-secondary hover:text-text-primary">
            {t_back('العودة للرئيسية')}
          </Link>
        </StoreContainer>
      </header>

      <main id="main" className="py-12 sm:py-16 lg:py-20">
        <StoreContainer>{children}</StoreContainer>
      </main>
    </div>
  );
}

function t_back(fallback: string): string {
  return fallback;
}

function AuthAside({ badge, title, subtitle, planNotice }: { badge: string; title: string; subtitle: string; planNotice?: string }) {
  return (
    <div className="flex flex-col justify-center">
      <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary shadow-xs">
        <Shield className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span>{badge}</span>
      </span>

      <h1 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-text-secondary sm:text-lg">{subtitle}</p>

      {planNotice && (
        <div className="mt-6 inline-flex w-fit items-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{planNotice}</span>
        </div>
      )}

      <ul className="mt-8 space-y-3 text-sm text-text-secondary">
        <Bullet icon={<Check className="h-4 w-4 text-success" />} text="بدون بطاقة بنكية" />
        <Bullet icon={<Check className="h-4 w-4 text-success" />} text="إلغاء في أي وقت" />
        <Bullet icon={<Check className="h-4 w-4 text-success" />} text="دعم بالعربي 24/7" />
      </ul>

      <div className="mt-8">
        <Link
          to="/signup"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-7 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
        >
          سجّل كتاجر جديد
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function Bullet({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
