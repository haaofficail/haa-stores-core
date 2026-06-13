import { useTranslation } from 'react-i18next';
import { useStore } from '@/hooks/useStore';
import { useSEO } from '@/hooks/useSEO';
import { StoreContainer } from '@/components/ui';
import { ShieldCheck, Award, Users, Heart } from 'lucide-react';

export default function About() {
  const { t } = useTranslation();
  const { store, loading } = useStore();

  useSEO({
    title: `${t('about.title', 'عن المتجر')} - ${store?.name || ''}`,
    description: store?.description || undefined,
  });

  if (loading || !store) {
    return (
      <div id="main-content" className="container-store py-8 space-y-8">
        <div className="text-center space-y-4">
          <div className="h-10 w-48 bg-surface-2 rounded animate-pulse mx-auto" />
          <div className="h-5 w-72 bg-surface-2 rounded animate-pulse mx-auto" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 bg-surface-1 rounded-card shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-surface-2 animate-pulse mx-auto" />
              <div className="h-4 w-20 bg-surface-2 rounded animate-pulse mx-auto" />
              <div className="h-3 w-32 bg-surface-2 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-to-bl from-primary-50 via-white to-primary-50/30 py-12 sm:py-16">
        <StoreContainer className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">{t('about.title')}</h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {store.description || t('about.description')}
          </p>
        </StoreContainer>
      </section>

      <StoreContainer className="py-8 sm:py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="text-center p-6 bg-surface-1 rounded-card shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="h-4 w-4 text-primary-500" />
            </div>
            <h3 className="font-semibold text-sm mb-1">{t('about.secureShopping', 'تسوق آمن')}</h3>
            <p className="text-xs text-text-secondary">{t('about.secureShoppingDesc', 'جميع المعاملات محمية ومشفرة')}</p>
          </div>
          <div className="text-center p-6 bg-surface-1 rounded-card shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-success-soft flex items-center justify-center mx-auto mb-2">
              <Award className="h-4 w-4 text-success" />
            </div>
            <h3 className="font-semibold text-sm mb-1">{t('about.quality', 'جودة مضمونة')}</h3>
            <p className="text-xs text-text-secondary">{t('about.qualityDesc', 'منتجات مختارة بعناية')}</p>
          </div>
          <div className="text-center p-6 bg-surface-1 rounded-card shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-warning-soft flex items-center justify-center mx-auto mb-2">
              <Users className="h-4 w-4 text-warning" />
            </div>
            <h3 className="font-semibold text-sm mb-1">{t('about.support', 'دعم متواصل')}</h3>
            <p className="text-xs text-text-secondary">{t('about.supportDesc', 'فريقنا جاهز لمساعدتك')}</p>
          </div>
          <div className="text-center p-6 bg-surface-1 rounded-card shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-2">
              <Heart className="h-4 w-4 text-primary-500" />
            </div>
            <h3 className="font-semibold text-sm mb-1">{t('about.satisfaction', 'رضا العملاء')}</h3>
            <p className="text-xs text-text-secondary">{t('about.satisfactionDesc', 'نسعى دائماً لإرضائك')}</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto bg-surface-2 rounded-card p-6 sm:p-8">
          <p className="text-text-secondary leading-relaxed text-center">
            {store.description || t('about.description')}
          </p>
        </div>
      </StoreContainer>
    </div>
  );
}
