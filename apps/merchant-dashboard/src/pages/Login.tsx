import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ApiClientError } from '@/lib/api';
import { toast } from 'sonner';
import { Sparkles, Store } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50/30 p-4">
      <div className={`transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-200 mb-4 transition-transform duration-500 hover:scale-105">
            <Store className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-1">{t('auth.welcomeBrand')}</h1>
          <p className="text-neutral-400">{t('auth.welcomeSubtitle')}</p>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-neutral-900">{t('auth.welcomeBack')}</CardTitle>
            <CardDescription className="text-neutral-400">{t('auth.loginToDashboard')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-neutral-900">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-9 text-sm rounded-xl border border-neutral-200 transition-shadow focus:shadow-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-neutral-900">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9 text-sm rounded-xl border border-neutral-200 transition-shadow focus:shadow-md"
                />
              </div>
              <Button type="submit" className="h-9 text-sm px-4 w-full transition-all hover:shadow-lg" disabled={loading}>
                {loading ? t('auth.loggingIn') : t('auth.loginButton')}
              </Button>
            </form>
            <div className="flex items-center justify-center gap-2 mt-6 text-xs text-neutral-400">
              <Sparkles className="h-3 w-3" />
              <span>{t('auth.aiPowered')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
