import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, Link } from 'react-router-dom';
import { ApiClientError } from '@/lib/api';
import { toast } from 'sonner';
import { Sparkles, ArrowLeft, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import OperationFeed from '@/components/OperationFeed';

export default function Login() {
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('haa-remember-email') ?? '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('haa-remember-email') !== null;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    const onboardingDone = localStorage.getItem('onboarding_done');
    navigate(onboardingDone ? '/dashboard' : '/onboarding', { replace: true });
  }, [navigate, user]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Persist email only — never the password — when "remember me" is on.
      try {
        if (rememberMe) localStorage.setItem('haa-remember-email', email);
        else localStorage.removeItem('haa-remember-email');
      } catch {
        // localStorage may throw in privacy modes; the login still works.
      }
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiClientError) {
        switch (err.code) {
          case 'RATE_LIMITED':
            toast.error(t('auth.rateLimited'));
            break;
          case 'INVALID_CREDENTIALS':
            toast.error(t('auth.invalidCredentials'));
            break;
          case 'NETWORK_ERROR':
            toast.error(t('auth.networkError'));
            break;
          case 'SERVER_ERROR':
            toast.error(t('auth.serverError'));
            break;
          default:
            toast.error(err.message || t('common.error'));
        }
      } else {
        toast.error(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-50/80 via-white to-primary-50/40 p-4 sm:p-6"
    >
      {/* Aurora background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -start-24 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-primary-200/50 via-primary-100/30 to-transparent blur-3xl motion-reduce:hidden" />
        <div className="absolute bottom-0 end-0 h-72 w-72 rounded-full bg-primary-100/40 blur-3xl motion-reduce:hidden" />
        <div className="absolute top-1/3 start-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-100/20 blur-3xl motion-reduce:hidden" />
      </div>

      <div
        className={`mx-auto flex min-h-screen max-w-7xl items-center justify-center transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <div className="grid w-full items-stretch gap-8 lg:grid-cols-5 lg:gap-12">

          {/* ── Login panel (2/5) ── */}
          <div className="flex flex-col items-center justify-center gap-8 lg:col-span-2">

            {/* Logo + brand */}
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/30">
                <img
                  src="/haa-logo.png"
                  alt="هاء"
                  className="h-10 w-auto"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
                  }}
                />
                <Sparkles className="hidden h-8 w-8 text-white" aria-hidden="true" />
              </div>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-neutral-900">متاجر هاء</h1>
              <p className="mt-1 text-xs text-neutral-500">منصة التجارة الإلكترونية للمتاجر السعودية</p>
            </div>

            {/* Glass form card */}
            <div className="relative w-full max-w-sm">
              {/* Top accent line */}
              <div
                className="pointer-events-none absolute -top-px inset-x-8 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, var(--haa-primary-500), transparent)' }}
                aria-hidden="true"
              />

              <div className="rounded-3xl border border-white/60 bg-white/75 p-7 shadow-2xl shadow-primary-500/10 backdrop-blur-2xl">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-neutral-900">مرحبًا بعودتك</h2>
                  <p className="mt-1 text-sm text-neutral-500">سجّل دخولك للوحة التحكم</p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  method="post"
                  className="space-y-4"
                  aria-label="تسجيل الدخول"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium text-neutral-800">
                      البريد الإلكتروني
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                      <Input
                        id="email"
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 rounded-xl border-neutral-200 bg-white/80 ps-10 text-sm transition-all focus:border-primary-400 focus:bg-white focus:shadow-md focus:shadow-primary-500/10 focus:ring-1 focus:ring-primary-400"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium text-neutral-800">
                        كلمة المرور
                      </Label>
                      <Link
                        to="/forgot-password"
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        نسيت كلمة المرور؟
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        dir="ltr"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 rounded-xl border-neutral-200 bg-white/80 pe-10 ps-10 text-sm transition-all focus:border-primary-400 focus:bg-white focus:shadow-md focus:shadow-primary-500/10 focus:ring-1 focus:ring-primary-400"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        aria-pressed={showPassword}
                        className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-400"
                    />
                    تذكّر بريدي
                  </label>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-sm font-bold text-white shadow-lg shadow-primary-500/25 transition-all hover:from-primary-600 hover:to-primary-700 hover:shadow-xl hover:shadow-primary-500/30 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {loading ? 'جاري الدخول...' : 'دخول'}
                  </Button>
                </form>

                <div className="mt-5 border-t border-neutral-100 pt-5 text-center">
                  <p className="text-xs text-neutral-400">ليس لديك حساب؟</p>
                  <Link
                    to={`${import.meta.env.VITE_STORE_URL || 'https://haa.store'}/signup`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex h-11 items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-6 text-sm font-semibold text-primary-700 transition-all hover:bg-primary-100 hover:shadow-sm"
                  >
                    <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
                    سجّل كتاجر جديد
                  </Link>
                </div>

                <div className="mt-5 flex items-center justify-center gap-2 text-xs text-neutral-400">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>مدعوم بالذكاء الاصطناعي</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Operations feed (3/5) ── */}
          <div className="hidden flex-col lg:col-span-3 lg:flex">
            <div className="w-full pt-[80px]">
              <OperationFeed />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
