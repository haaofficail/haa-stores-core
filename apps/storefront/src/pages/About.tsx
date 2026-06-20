import { useTranslation } from 'react-i18next';
import { useStore } from '@/hooks/useStore';
import { useSEO } from '@/hooks/useSEO';
import { StoreContainer } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- P1-#5: lucide icons as <Icon> definitions
import { ShieldCheck, Award, Users, Heart } from 'lucide-react';

export default function About() {
  const { t } = useTranslation();
  const { store, loading } = useStore();

  const pageTitle = t('about.title', 'عن المتجر');
  const defaultDescription = t('about.description', 'تعرف أكثر على المتجر وقيمه وتجربة التسوق فيه.');

  useSEO({
    title: store?.name ? `${pageTitle} - ${store.name}` : pageTitle,
    description: store?.description || defaultDescription,
  });

  const features = [
    { icon: ShieldCheck, bg: 'bg-primary-50', color: 'text-primary-500', title: t('about.secureShopping', 'تسوق آمن'), description: t('about.secureShoppingDesc', 'جميع المعاملات محمية ومشفرة') },
    { icon: Award, bg: 'bg-success-soft', color: 'text-success', title: t('about.quality', 'جودة مضمونة'), description: t('about.qualityDesc', 'منتجات مختارة بعناية') },
    { icon: Users, bg: 'bg-warning-soft', color: 'text-warning', title: t('about.support', 'دعم متواصل'), description: t('about.supportDesc', 'فريقنا جاهز لمساعدتك') },
    { icon: Heart, bg: 'bg-primary-50', color: 'text-primary-500', title: t('about.satisfaction', 'رضا العملاء'), description: t('about.satisfactionDesc', 'نسعى دائماً لإرضائك') },
  ];

  if (loading || !store) {
    return (
      <div id="storefront-scope" data-theme-scope="storefront" className="animate-fade-in overflow-x-hidden">
        <StoreContainer className="py-8 space-y-8">
          <div className="text-center space-y-4">
            <div className="h-10 w-48 bg-surface-2 rounded animate-pulse mx-auto" />
            <div className="h-5 w-72 max-w-full bg-surface-2 rounded animate-pulse mx-auto" />
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
        </StoreContainer>
      </div>
    );
  }

  return (
    <div id="storefront-scope" data-theme-scope="storefront" className="animate-fade-in overflow-x-hidden">
      <section className="bg-gradient-to-bl from-primary-50 via-white to-primary-50/30 py-12 sm:py-16">
        <StoreContainer className="text-center">
          <p className="mb-2 text-sm font-bold text-primary-500">{store.name}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">{pageTitle}</h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {store.description || defaultDescription}
          </p>
        </StoreContainer>
      </section>

      <StoreContainer className="py-8 sm:py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature) => (
            <div key={feature.title} className="text-center p-6 bg-surface-1 rounded-card shadow-sm">
              <div className={`w-8 h-8 rounded-xl ${feature.bg} flex items-center justify-center mx-auto mb-2`}>
                <Icon icon={feature.icon} size="xs" className={feature.color} />
              </div>
              <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto bg-surface-2 rounded-card p-6 sm:p-8">
          <h2 className="mb-3 text-center text-base font-bold text-text-primary">
            {t('about.storyTitle', 'قصة المتجر')}
          </h2>
          <p className="text-text-secondary leading-relaxed text-center">
            {store.description || defaultDescription}
          </p>
        </div>
      </StoreContainer>
    </div>
  );
}
