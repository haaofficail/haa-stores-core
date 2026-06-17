import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, Link } from 'react-router-dom';
import { ApiClientError } from '@/lib/api';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import OperationFeed from '@/components/OperationFeed';

export default function Login() {
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

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
      className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50/30 p-6"
    >
      <div className={`mx-auto flex min-h-screen max-w-7xl items-center justify-center transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="grid w-full items-stretch gap-8 lg:grid-cols-5 lg:gap-12">

          {/* Right Side — Brand + Form stacked */}
          <div className="flex flex-col justify-center gap-6 lg:col-span-2">
            <div className="flex flex-col items-center gap-0">
              <div className="flex items-center gap-2.5">
                <img src="/haa-logo.png" alt="Haa" className="h-20 w-auto" />
                <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">متاجر هاء</h1>
              </div>
              <p className="-mt-1 text-xs leading-relaxed text-neutral-500">منصة التجارة الإلكترونية الأسهل للمتاجر السعودية</p>
            </div>
            <div className="mx-auto w-full max-w-xs rounded-2xl border border-neutral-100 bg-white p-6 shadow-lg">
              <div className="w-full">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-neutral-900">مرحبًا بعودتك</h2>
                  <p className="mt-1 text-xs text-neutral-400">سجل دخولك للوحة التحكم</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-neutral-900">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 text-sm rounded-xl border border-neutral-200 bg-neutral-50/50 transition-all focus:shadow-md focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-neutral-900">كلمة المرور</Label>
                    <Input
                      id="password"
                      type="password"
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 text-sm rounded-xl border border-neutral-200 bg-neutral-50/50 transition-all focus:shadow-md focus:bg-white"
                    />
                  </div>
                  <Button type="submit" className="h-10 text-sm px-4 w-full rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold transition-all hover:from-primary-600 hover:to-primary-700 hover:shadow-lg" disabled={loading}>
                    {loading ? 'جاري الدخول...' : 'دخول'}
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  <p className="text-xs text-neutral-400 mb-2.5">ليس لديك حساب؟</p>
                  <Link
                    to={`${import.meta.env.VITE_STORE_URL || 'https://haa.store'}/signup`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-6 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:scale-[1.02] hover:shadow-xl"
                  >
                    سجّل كتاجر جديد
                  </Link>
                </div>

                <div className="flex items-center justify-center gap-2 mt-8 text-xs text-neutral-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>مدعوم بالذكاء الاصطناعي</span>
                </div>
              </div>
            </div>
          </div>

          {/* Left Side — Operations (3/5) */}
          <div className="flex flex-col lg:col-span-3">
            <div className="w-full pt-[120px]">
              <OperationFeed />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
