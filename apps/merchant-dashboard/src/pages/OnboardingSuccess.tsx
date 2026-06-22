import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { settingsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles, Store, ArrowLeft, BarChart3, ShoppingBag, Palette } from 'lucide-react';
import { toast } from 'sonner';

function Confetti() {
  // Confetti palette = Haa primary scale only (no indigo/violet drift).
  // Tokens resolved from `apps/merchant-dashboard/src/index.css` so the
  // celebration animation respects brand tokens and stays in lockstep
  // with any future palette tweak. See
  // `docs/agent/audit/MD_PAGES_AUDIT_PART_1_AUTH.md` Finding #1.
  const colors = [
    'var(--haa-primary-200)',
    'var(--haa-primary-300)',
    'var(--haa-primary-400)',
    'var(--haa-primary-500)',
    'var(--haa-primary-600)',
    'var(--haa-primary-700)',
    'var(--haa-primary-800)',
  ];

  return (
    // `motion-reduce:hidden` — users with `prefers-reduced-motion: reduce`
    // skip the animation entirely (WCAG 2.3.3, vestibular safety). See
    // `docs/agent/audit/MD_PAGES_AUDIT_PART_1_AUTH.md` Finding #3.
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-50 motion-reduce:hidden"
    >
      {Array.from({ length: 60 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20}%`,
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            backgroundColor: colors[i % colors.length],
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDuration: `${2 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: 0.8 + Math.random() * 0.2,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}

export default function OnboardingSuccess() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { storeId } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    settingsApi.get(storeId).then((s) => {
      setStoreName(s.name || '');
    }).catch(() => toast.error(t('common.error', 'فشل تحميل بيانات المتجر'))).finally(() => setLoading(false));

    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable from useTranslation; effect intentionally runs on [storeId] only
  }, [storeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50/30 to-white">
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-2xl mx-auto" />
          <Skeleton className="h-8 w-56 mx-auto" />
          <Skeleton className="h-4 w-72 mx-auto" />
        </div>
      </div>
    );
  }

  const suggestions = [
    { icon: ShoppingBag, label: t('onboarding.suggestProducts'), href: '/products' },
    { icon: Palette, label: t('onboarding.suggestTheme'), href: '/settings' },
    { icon: BarChart3, label: t('onboarding.suggestReports'), href: '/reports' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/30 to-white flex items-center justify-center p-4">
      {showConfetti && <Confetti />}

      <div className="max-w-lg w-full text-center animate-in fade-in zoom-in-95 duration-700">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-6 shadow-lg shadow-green-100">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          {t('onboarding.successTitle')}
        </h1>
        <p className="text-neutral-400 mb-2">
          {t('onboarding.successDesc', { name: storeName || t('onboarding.yourStore') })}
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-8">
          <Sparkles className="h-3.5 w-3.5" />
          {t('onboarding.successBadge')}
        </div>

        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden mb-8 text-start">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-sm text-neutral-900">{t('onboarding.nextSteps')}</h3>
            <div className="grid gap-3">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => navigate(s.href)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-card overflow-hidden hover:bg-neutral-50 transition-all text-start"
                >
                  <div className="inline-flex p-3 rounded-2xl bg-neutral-100 text-neutral-400">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-neutral-900">{s.label}</span>
                  <ArrowLeft className="h-4 w-4 mr-auto text-neutral-300" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button className="h-9 text-sm px-4 gap-2" onClick={() => navigate('/dashboard')}>
            <Store className="h-4 w-4" /> {t('onboarding.goToDashboard')}
          </Button>
          <Button variant="outline" className="h-9 text-sm gap-2" onClick={() => navigate('/products')}>
            <ShoppingBag className="h-4 w-4" /> {t('onboarding.manageProducts')}
          </Button>
        </div>
      </div>
    </div>
  );
}
