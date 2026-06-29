import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { StoreContainer, StoreCard, StoreInput, StoreButton } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { useSEO } from '@/hooks/useSEO';
import { saveTrackPhone } from '@/lib/order-track-storage';

export default function TrackOrder() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useSEO({ title: t('pageTitle.trackOrder', 'تتبع الطلب'), noIndex: true });
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');

  const handleTrack = () => {
    const normalizedOrderNumber = orderNumber.trim();
    const normalizedPhone = phone.trim();
    if (!normalizedOrderNumber || !normalizedPhone || !slug) return;
    saveTrackPhone(normalizedOrderNumber, normalizedPhone);
    navigate(`/s/${slug}/track/${encodeURIComponent(normalizedOrderNumber)}`);
  };

  return (
    <div id="storefront-scope" data-theme-scope="storefront" className="animate-fade-in overflow-x-hidden">
      <section className="bg-gradient-to-bl from-primary-50 via-white to-primary-50/30 py-12 sm:py-16">
        <StoreContainer className="text-center">
          <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-3">
            <Icon name="Truck" size="xs" className="text-primary-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">{t('track.title','تتبع الطلب')}</h1>
          <p className="text-lg text-text-secondary max-w-md mx-auto">{t('track.description','أدخل رقم الطلب ورقم الجوال لعرض حالة طلبك.')}</p>
        </StoreContainer>
      </section>

      <StoreContainer className="py-8 sm:py-10">
        <div className="max-w-md mx-auto">
          <StoreCard className="p-6">
            <div className="space-y-4">
              <StoreInput
                label={t('track.orderNumber','رقم الطلب')}
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-XXXXXXXX"
                dir="ltr"
                className="text-start"
              />
              <StoreInput
                label={t('track.phone','رقم الجوال')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="text-start"
              />
              <StoreButton
                onClick={handleTrack}
                disabled={!orderNumber.trim() || !phone.trim()}
                className="w-full"
                size="lg"
                icon={<Icon name="Package" size="xs" />}
              >
                {t('track.track','تتبع الطلب')}
              </StoreButton>
            </div>
          </StoreCard>

          <div className="text-center mt-6">
            <Link to={slug ? `/s/${slug}` : '/'} className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
              <Icon name="ArrowLeft" size="xs" />
              {t('order.backToStore','العودة للمتجر')}
            </Link>
          </div>
        </div>
      </StoreContainer>
    </div>
  );
}
