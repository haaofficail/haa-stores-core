import { useTranslation } from 'react-i18next';
import { useStore } from '@/hooks/useStore';
import { useSEO } from '@/hooks/useSEO';
import { StoreContainer, StoreCard } from '@/components/ui';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';

export default function Contact() {
  const { t } = useTranslation();
  const { store, loading } = useStore();

  useSEO({
    title: `${t('contact.title', 'اتصل بنا')} - ${store?.name || ''}`,
    description: store?.description || undefined,
  });

  if (loading || !store) {
    return (
      <div id="main-content" className="container-store py-8 space-y-8">
        <div className="text-center space-y-4">
          <div className="h-10 w-48 bg-surface-2 rounded animate-pulse mx-auto" />
          <div className="h-5 w-64 bg-surface-2 rounded animate-pulse mx-auto" />
        </div>
        <div className="max-w-2xl mx-auto grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 bg-surface-1 rounded-card shadow-sm space-y-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-2 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-16 bg-surface-2 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-surface-2 rounded animate-pulse" />
                </div>
              </div>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">{t('contact.title')}</h1>
          <p className="text-lg text-text-secondary">{t('contact.description')}</p>
        </StoreContainer>
      </section>

      <StoreContainer className="py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {store.email && (
              <StoreCard className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary-50 shrink-0">
                    <Mail className="h-4 w-4 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">{t('contact.email')}</p>
                    <a href={`mailto:${store.email}`} className="font-semibold text-text-primary hover:text-primary-600 transition-colors" dir="ltr">
                      {store.email}
                    </a>
                  </div>
                </div>
              </StoreCard>
            )}
            {store.phone && (
              <StoreCard className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-success-soft shrink-0">
                    <Phone className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">{t('contact.phone')}</p>
                    <a href={`tel:${store.phone}`} className="font-semibold text-text-primary hover:text-primary-600 transition-colors" dir="ltr">
                      {store.phone}
                    </a>
                  </div>
                </div>
              </StoreCard>
            )}
            <StoreCard className="p-6">
              <div className="flex items-start gap-4">
<div className="p-3 rounded-xl bg-warning-soft shrink-0">
                    <Clock className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">{t('contact.workingHours', 'ساعات العمل')}</p>
                  <p className="font-semibold text-text-primary">{t('contact.workingDays', 'السبت - الخميس')}</p>
                  <p className="text-xs text-text-secondary">{t('contact.workingHoursValue', '9 صباحًا - 9 مساءً')}</p>
                </div>
              </div>
            </StoreCard>
            <StoreCard className="p-6">
              <div className="flex items-start gap-4">
<div className="p-3 rounded-xl bg-info-soft shrink-0">
                    <MapPin className="h-4 w-4 text-info" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">{t('contact.location', 'الموقع')}</p>
                  <p className="font-semibold text-text-primary">{t('contact.country', 'المملكة العربية السعودية')}</p>
                  <p className="text-xs text-text-secondary">{t('contact.shippingCoverage', 'شحن لجميع المدن')}</p>
                </div>
              </div>
            </StoreCard>
          </div>

          <StoreCard className="p-6 bg-primary-50/50 border-primary-100">
            <div className="text-center">
              <MessageCircle className="h-4 w-4 text-primary-500 mx-auto mb-3" />
              <h3 className="font-semibold text-text-primary mb-2">{t('contact.helpTitle', 'نحتاج مساعدتك؟')}</h3>
              <p className="text-sm text-text-secondary">
                {t('contact.helpText', 'فريق الدعم جاهز للإجابة على استفساراتك. لا تتردد في التواصل معنا عبر البريد الإلكتروني أو الجوال.')}
              </p>
            </div>
          </StoreCard>
        </div>
      </StoreContainer>
    </div>
  );
}
