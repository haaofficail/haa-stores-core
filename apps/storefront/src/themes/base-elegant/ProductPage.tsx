import { useState, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { StoreBadge, StoreButton, StoreIconButton } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import CountdownTimer from '@/components/CountdownTimer';
import ThemedProductCard from '@/components/ThemedProductCard';
import {
  paymentLogos, PaymentLogoImg, TrustBadgesSection, type PaymentLogo,
} from '@/components/ui/trust-badges';
import type { IconName } from '@/components/ui/icon';
import { formatCurrency } from '@/lib/utils';
import { SarIcon } from '@/components/ui/SarIcon';
import { productJSONLD } from '@/lib/jsonld';
import type { ProductPageProps } from '@haa/storefront-themes';

function formatWeight(grams: number, t: (k: string, options?: Record<string, unknown>) => string): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} ${t('product.kg')}`;
  return `${grams} ${t('product.gram')}`;
}

function useEscapeKey(handler: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handler(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); };
  }, [handler]);
}

function ProductGallery({ images, name, features }: { images: string[]; name: string; features?: Record<string, boolean> | null }) {
  const { t } = useTranslation();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEscapeKey(() => { if (lightboxOpen) setLightboxOpen(false); });

  const hasImages = images && images.length > 0;
  const selectedImage = hasImages ? images[selectedIdx] : null;
  const enableLightbox = features?.imageLightbox !== false;

  return (
    <><div className="[&>*+*]:mt-[var(--space-2)] lg:sticky lg:top-[var(--space-6)]">
      <button type="button" onClick={() => hasImages && !imgError && enableLightbox && setLightboxOpen(true)}
        className={`aspect-square lg:aspect-[4/3] max-h-[460px] bg-surface-1 overflow-hidden relative group w-full ${enableLightbox ? 'cursor-zoom-in' : ''}`}
        style={{ borderRadius: '8px' }}
        aria-label={t('product.viewGallery', 'عرض المعرض')}>
        {selectedImage && !imgError ? (
          <img width={400} height={400} src={selectedImage} alt={name} fetchPriority="high" className="w-full h-full object-contain scale-105 transition-transform duration-300 group-hover:scale-110" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Icon name="ShoppingBag" size="lg" className="text-text-disabled" /></div>
        )}
        {hasImages && enableLightbox && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full shadow-lg" style={{ padding: 'var(--space-2)' }}><Icon name="Search" size="xs" className="text-text-secondary" /></div>
          </div>
        )}
      </button>
      {hasImages && images.length > 1 && (
        <div className="flex overflow-x-auto" style={{ gap: 'var(--space-2)', paddingBlockEnd: 'var(--space-1)' }}>
          {images.map((img, idx) => (
            <button key={idx} onClick={() => { setSelectedIdx(idx); setImgError(false); }}
              className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 overflow-hidden border-2 transition-all ${idx === selectedIdx ? 'border-primary-500 shadow-sm' : 'border-border hover:border-border-hover'}`}
              style={{ borderRadius: '8px' }}
              aria-label={`${name} ${idx + 1}`}>
              <img width={400} height={400} src={img} alt={`${name} ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>

    {lightboxOpen && selectedImage && (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fade-in" style={{ padding: 'var(--space-4)' }} onClick={() => setLightboxOpen(false)} role="dialog" aria-modal="true" aria-label={t('product.imageGallery', 'معرض الصور')}>
        <StoreIconButton type="button" onClick={() => setLightboxOpen(false)} className="absolute bg-white/10 text-white hover:bg-white/20" style={{ insetBlockStart: 'var(--space-4)', insetInlineStart: 'var(--space-4)' }} aria-label={t('common.close', 'إغلاق')}><Icon name="X" size="sm" /></StoreIconButton>
        <div className="flex absolute start-1/2 -translate-x-1/2" style={{ gap: 'var(--space-2)', insetBlockEnd: 'var(--space-4)' }}>
          {images.map((_, idx) => (
            <button key={idx} onClick={(e) => { e.stopPropagation(); setSelectedIdx(idx); }}
              className={`w-2 h-2 rounded-full transition-all ${idx === selectedIdx ? 'bg-surface-1 w-6' : 'bg-white/40 hover:bg-white/60'}`}
              aria-label={`${t('product.imageNumber', 'صورة')} ${idx + 1}`} />
          ))}
        </div>
        <StoreIconButton type="button" onClick={(e) => { e.stopPropagation(); setSelectedIdx((selectedIdx - 1 + images.length) % images.length); }}
          className="absolute top-1/2 -translate-y-1/2 bg-white/10 text-white hover:bg-white/20" style={{ insetInlineStart: 'var(--space-4)' }} aria-label={t('product.prevImage', 'السابقة')}>
          <Icon name="ChevronLeft" size="sm" />
        </StoreIconButton>
        <StoreIconButton type="button" onClick={(e) => { e.stopPropagation(); setSelectedIdx((selectedIdx + 1) % images.length); }}
          className="absolute top-1/2 -translate-y-1/2 bg-white/10 text-white hover:bg-white/20" style={{ insetInlineEnd: 'var(--space-4)' }} aria-label={t('product.nextImage', 'التالية')}>
          <Icon name="ChevronRight" size="sm" />
        </StoreIconButton>
        <img width={400} height={400} src={selectedImage} alt={name} className="max-h-[85vh] max-w-full object-contain select-none" style={{ borderRadius: 'var(--radius-2xl, 16px)' }} onClick={(e) => e.stopPropagation()} />
      </div>
    )}</>
  );
}

function QuantitySelector({ value, onChange, min, max, disabled }: {
  value: number; onChange: (v: number) => void; min: number; max: number; disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center" style={{ gap: 'var(--space-1)' }}>
      <StoreIconButton type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={disabled || value <= min}
        variant="soft"
        aria-label={t('product.decreaseQuantity', 'إنقاص الكمية')}><Icon name="Minus" size="xs" /></StoreIconButton>
      <input type="number" value={value}
        onChange={(e) => { const v = parseInt(e.target.value) || min; onChange(Math.min(max, Math.max(min, v))); }}
        min={min} max={max} disabled={disabled}
        className="min-w-[44px] min-h-[44px] text-center bg-surface-2 font-medium text-sm outline-none focus:bg-surface-3 focus-visible:ring-2 focus-visible:ring-primary-300 disabled:opacity-40 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        style={{ borderRadius: 'var(--radius-lg, 12px)' }}
        aria-label={t('product.quantity', 'الكمية')} />
      <StoreIconButton type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max}
        variant="soft"
        aria-label={t('product.increaseQuantity', 'زيادة الكمية')}><Icon name="Plus" size="xs" /></StoreIconButton>
    </div>
  );
}

function StockBar({ current, max }: { current: number; max: number }) {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = pct <= 30;
  return (
    <div className="[&>*+*]:mt-[var(--space-1)]" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={max} aria-label={t('product.stockLabel', 'الكمية المتوفرة')}>
      <div className="flex items-center justify-between text-xs" style={{ gap: 'var(--space-3)' }}>
        <span className={isLow ? 'text-warning font-medium' : 'text-success font-medium'}>
          {isLow ? t('product.lowStockUrgent', 'باقي') : t('product.availableNow', 'متوفر الآن')}
        </span>
        <span className="text-text-tertiary">
          {t('product.remainingStock', 'باقي')} {current} {t('product.stockAvailable', 'قطعة')}
        </span>
      </div>
      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-warning' : 'bg-success'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const paymentLogoByProvider: Record<string, string> = {
  mada: 'mada',
  visa: 'visa',
  mastercard: 'mastercard',
  apple_pay: 'apple-pay',
  stc_pay: 'stc-pay',
  cash_on_delivery: 'cash-on-delivery',
  cod: 'cash-on-delivery',
  tamara: 'tamara',
  tamara_installments: 'tamara',
  tabby: 'tabby',
  tabby_installments: 'tabby',
};

type PaymentMethodLike = { provider: string; available?: boolean };

function getPaymentLogosForMethods(methods: PaymentMethodLike[], categories?: Set<string>, availableOnly = true) {
  const logoIds = new Set(
    (Array.isArray(methods) ? methods : [])
      .filter((method: PaymentMethodLike) => !availableOnly || method.available)
      .map((method: PaymentMethodLike) => paymentLogoByProvider[method.provider])
      .filter(Boolean)
  );

  return paymentLogos.filter((logo: PaymentLogo) =>
    logo.enabled &&
    logo.assetPath &&
    logoIds.has(logo.id) &&
    (!categories || categories.has(logo.category))
  );
}

function InstallmentPromo({ price, paymentMethods }: { price: string | number; paymentMethods: PaymentMethodLike[] }) {
  const { t } = useTranslation();
  const bnplLogosFromApi = getPaymentLogosForMethods(paymentMethods, new Set(['BNPL_PROVIDER']), false);
  const bnplLogos = bnplLogosFromApi.length > 0
    ? bnplLogosFromApi
    : paymentLogos.filter((logo: PaymentLogo) => logo.enabled && logo.category === 'BNPL_PROVIDER');
  if (bnplLogos.length === 0) return null;

  const perPayment = Number(price) / 4;
  return (
    <div
      className="bg-success-soft"
      style={{ borderRadius: '8px', paddingInline: 'var(--space-4)', paddingBlock: 'var(--space-3)', gap: 'var(--space-3)' }}
    >
      <div className="flex items-center justify-between" style={{ gap: 'var(--space-3)' }}>
        <div className="min-w-0">
          <p className="text-xs font-medium text-success leading-none">{t('payment.installmentsTitle', 'قسّطها بدون فوائد')}</p>
          <div className="flex items-baseline whitespace-nowrap" style={{ gap: 'var(--space-1)', marginBlockStart: 'var(--space-1)' }}>
            <span className="text-lg font-bold text-text-primary tabular-nums">{formatCurrency(perPayment)}</span>
            <SarIcon size="md" className="text-text-primary" />
            <span className="text-xs text-text-secondary">{t('payment.fourPayments', 'على 4 دفعات')}</span>
          </div>
          <p className="text-[var(--badge-font-size)] text-text-tertiary" style={{ marginBlockStart: 'var(--space-1)' }}>
            {t('payment.chooseAtCheckout', 'اخترها عند الدفع')}
          </p>
        </div>
        <div className="flex shrink-0 items-center" style={{ gap: 'var(--space-1)' }}>
          {bnplLogos.map((logo: PaymentLogo) => (
            <span key={logo.id} className="inline-flex h-7 items-center justify-center" style={{ paddingInline: 'var(--space-1)' }}>
              <PaymentLogoImg logo={logo} size="h-4" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PaymentMarketingStrip({ methods }: { methods: PaymentMethodLike[] }) {
  const { t } = useTranslation();
  const storefrontPaymentLogos = paymentLogos.filter(
    (logo: PaymentLogo) =>
      logo.enabled &&
      logo.assetPath &&
      ['LOCAL_PAYMENT_METHOD', 'CARD_NETWORK', 'DIGITAL_WALLET'].includes(logo.category),
  );
  const apiLogos = getPaymentLogosForMethods(methods, new Set(['CARD_NETWORK', 'LOCAL_PAYMENT_METHOD', 'DIGITAL_WALLET']), false);
  const logos = apiLogos.length > 0 ? [
    ...apiLogos,
    ...storefrontPaymentLogos.filter((logo: PaymentLogo) => !apiLogos.some((apiLogo: PaymentLogo) => apiLogo.id === logo.id)),
  ] : storefrontPaymentLogos;
  if (logos.length === 0) return null;

  return (
    <div
      className="bg-white"
      style={{ borderRadius: '8px', paddingInline: 'var(--space-4)', paddingBlock: 'var(--space-3)' }}
      aria-label={t('common.acceptedPayment', 'طرق الدفع')}
    >
      <div className="flex items-center justify-between overflow-hidden" style={{ gap: 'var(--space-3)' }}>
        <div className="min-w-[150px] shrink-0">
          <p className="text-xs font-medium text-text-primary leading-none">{t('payment.marketingTitle', 'ادفع بالطريقة التي تناسبك')}</p>
          <p className="text-[var(--badge-font-size)] text-text-tertiary" style={{ marginBlockStart: 'var(--space-1)' }}>
            {t('payment.marketingSubtitle', 'خيارات دفع موثوقة وآمنة')}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end overflow-x-auto" style={{ gap: 'var(--space-1)' }}>
          {logos.map((logo: PaymentLogo) => (
            <span
              key={logo.id}
              className="inline-flex h-6 shrink-0 items-center justify-center"
              style={{ paddingInline: 'var(--space-1)' }}
              title={logo.name}
            >
              <PaymentLogoImg logo={logo} size="h-3.5" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrustBadges() {
  const { t } = useTranslation();
  const badges: Array<{ iconName: IconName; color: string; label: string }> = [
    { iconName: 'ShieldCheck', color: 'text-primary-500', label: t('product.trustSecure', 'الدفع آمن') },
    { iconName: 'BadgeCheck', color: 'text-success', label: t('product.trustOriginal', 'منتج أصلي 100%') },
    { iconName: 'RefreshCw', color: 'text-info', label: t('product.trustReturns', 'إرجاع مجاني') },
    { iconName: 'Truck', color: 'text-success', label: t('product.trustWarranty', 'ضمان المصنع') },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-4)' }}>
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="min-w-0 flex items-center bg-white text-text-secondary text-xs"
          style={{ gap: 'var(--space-3)', minHeight: '48px', borderRadius: '8px', paddingInline: 'var(--space-4)', paddingBlock: 'var(--space-4)' }}
        >
          <Icon name={badge.iconName} size="2xs" className={`${badge.color} shrink-0`} />
          <span className="truncate">{badge.label}</span>
        </div>
      ))}
    </div>
  );
}

function CommerceComplianceBadges({ hasElectronicPayment }: { hasElectronicPayment: boolean }) {
  const { t } = useTranslation();
  const badges: Array<{ iconName: IconName; variant: 'info' | 'stock' | 'neutral'; label: string }> = [
    {
      iconName: 'RefreshCw',
      variant: 'info' as const,
      label: t('product.exchangeReturnPolicy', 'سياسة الاستبدال والاسترجاع'),
    },
    {
      iconName: 'ShieldCheck',
      variant: 'stock' as const,
      label: hasElectronicPayment
        ? t('product.trustedElectronicPayment', 'دفع إلكتروني موثوق')
        : t('product.paymentPolicyAvailable', 'سياسة الدفع موضحة'),
    },
    {
      iconName: 'BadgeCheck',
      variant: 'neutral' as const,
      label: t('product.warrantyByPolicy', 'الضمان حسب سياسة المنتج'),
    },
    {
      iconName: 'Truck',
      variant: 'neutral' as const,
      label: t('product.shippingDeliveryPolicy', 'سياسة الشحن والتوصيل'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-4)' }}>
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="min-w-0 flex items-center bg-white text-text-secondary text-xs"
          style={{ gap: 'var(--space-3)', minHeight: '48px', borderRadius: '8px', paddingInline: 'var(--space-4)', paddingBlock: 'var(--space-4)' }}
        >
          <Icon name={badge.iconName} size="2xs" className="text-text-tertiary shrink-0" />
          <span className="truncate">{badge.label}</span>
        </div>
      ))}
    </div>
  );
}

function TrustAndPolicyBlock({ hasElectronicPayment }: { hasElectronicPayment: boolean }) {
  const { t } = useTranslation();
  return (
    <Surface>
      <details className="group">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-sm font-medium text-text-primary">
          <span className="inline-flex min-w-0 items-center" style={{ gap: 'var(--space-2)' }}>
            <Icon name="ShieldCheck" size="xs" className="text-primary-500" />
            <span>{t('product.trustAndPolicies', 'الثقة والسياسات')}</span>
          </span>
          <Icon name="ChevronDown" size="2xs" className="transition-transform group-open:rotate-180" />
        </summary>
        <div style={{ marginBlockStart: 'var(--space-4)' }}>
          <CommerceComplianceBadges hasElectronicPayment={hasElectronicPayment} />
          <div style={{ marginBlockStart: 'var(--space-5)' }}>
            <TrustBadges />
          </div>
        </div>
      </details>
    </Surface>
  );
}

function ProductSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ paddingBlockStart: 'var(--space-12)' }}>
      <h2 className="text-lg sm:text-xl font-bold text-text-primary" style={{ marginBlockEnd: 'var(--space-6)' }}>{title}</h2>
      <ProductGrid>{children}</ProductGrid>
    </section>
  );
}

function ProductGrid({ children, dense = false }: { children: ReactNode; dense?: boolean }) {
  return (
    <div
      className={dense ? 'grid grid-cols-3 sm:grid-cols-6 items-stretch' : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 items-stretch'}
      style={{ gap: dense ? 'var(--space-4)' : 'var(--space-6)' }}
    >
      {children}
    </div>
  );
}

function Surface({ children, tone = 'default', className = '' }: { children: ReactNode; tone?: 'default' | 'muted'; className?: string }) {
  return (
    <div
      className={`bg-white ${tone === 'muted' ? '' : 'shadow-sm'} ${className}`}
      style={{ borderRadius: '8px', padding: 'var(--space-6)' }}
    >
      {children}
    </div>
  );
}

function CheckboxPill({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label
      className={`inline-flex min-h-[40px] items-center transition-colors cursor-pointer ${checked ? 'bg-primary-50 text-primary-700' : 'bg-white text-text-secondary hover:bg-surface-2 hover:text-text-primary'}`}
      style={{ gap: 'var(--space-2)', paddingInline: 'var(--space-3)', borderRadius: 'var(--radius-lg, 12px)' }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${checked ? 'bg-primary-500 text-white' : 'bg-surface-2 text-text-disabled'}`}
        aria-hidden="true"
      >
        {checked && <Icon name="Check" size="2xs" />}
      </span>
      {children}
    </label>
  );
}

function RatingStars({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
      <div className="flex items-center" aria-label={`${rating} من 5 نجوم`} role="img">
        {[1, 2, 3, 4, 5].map((i) => (
          <Icon key={i} name="Star" className={`${i <= full ? 'text-amber-400 fill-amber-400' : i === full + 1 && half ? 'text-amber-400 fill-amber-400/50' : 'text-text-disabled fill-text-disabled'}`} size="2xs" />
        ))}
      </div>
      <span className="text-xs text-text-secondary">({count.toLocaleString()})</span>
    </div>
  );
}

function BoughtBadge({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center text-xs text-success font-medium" style={{ gap: 'var(--space-2)' }}>
      <Icon name="TrendingUp" size="2xs" />
      <span>{t('product.boughtCount', 'اشتراه أكثر من')} {count.toLocaleString()} {t('product.person', 'شخص')}</span>
    </div>
  );
}

function DeliveryEstimate() {
  const { t } = useTranslation();
  const today = new Date();
  const minDate = new Date(today); minDate.setDate(minDate.getDate() + 2);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 5);
  const fmt = (d: Date) => d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' });
  return (
    <div className="flex items-center text-xs text-text-secondary bg-surface-2" style={{ gap: 'var(--space-2)', borderRadius: 'var(--radius-lg, 12px)', padding: 'var(--space-3)' }}>
      <Icon name="Truck" size="xs" className="text-text-tertiary shrink-0" />
      <span>{t('product.deliveryEstimate', 'التوصيل المتوقع')}: <strong className="text-text-primary">{fmt(minDate)}</strong> – <strong className="text-text-primary">{fmt(maxDate)}</strong></span>
    </div>
  );
}

type SizeGuideLike = { name?: string; unit?: string; rows: Array<Record<string, string>> };

function SizeGuideModal({ guide, onClose }: { guide: SizeGuideLike; onClose: () => void }) {
  const { t } = useTranslation();
  useEscapeKey(onClose);
  const columns = Array.from(new Set(guide.rows.flatMap((row: Record<string, string>) => Object.keys(row))));
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" style={{ padding: 'var(--space-4)' }} onClick={onClose}>
      <div className="bg-surface-1 shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto" style={{ borderRadius: 'var(--radius-2xl, 16px)', padding: 'var(--space-6)' }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('product.sizeGuide', 'دليل المقاسات')}>
        <div className="flex items-center justify-between" style={{ marginBlockEnd: 'var(--space-4)' }}>
          <h3 className="font-bold text-lg">{guide.name || t('product.sizeGuide', 'دليل المقاسات')}</h3>
          <StoreIconButton type="button" onClick={onClose} aria-label={t('common.close')} autoFocus><Icon name="X" size="xs" /></StoreIconButton>
        </div>
        <p className="text-xs text-text-secondary" style={{ marginBlockEnd: 'var(--space-4)' }}>
          {t('product.sizeGuideDesc', 'القياسات')} {guide.unit}
        </p>
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="border-b text-text-secondary text-xs">
              {columns.map((column: string) => <th key={String(column)} className="text-end" style={{ paddingBlock: 'var(--space-2)' }}>{String(column)}</th>)}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((row: Record<string, string>, idx: number) => (
              <tr key={idx} className="border-b border-border">
                {columns.map((column: string, cidx: number) => (
                  <td key={String(column)} className={cidx === 0 ? 'font-medium' : 'text-text-secondary'} style={{ paddingBlock: 'var(--space-2)' }}>
                    {row[column] ?? '–'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Breadcrumb({ slug, product }: { slug: string; product: { name: string; categoryName?: string | null; categorySlug?: string | null } }) {
  const { t } = useTranslation();
  return (
    <nav className="flex items-center text-sm text-text-secondary overflow-x-auto whitespace-nowrap" style={{ gap: 'var(--space-2)', marginBlockEnd: 'var(--space-4)' }} aria-label={t('product.breadcrumb', 'مسار التنقل')}>
      <Link to={`/s/${slug}`} className="hover:text-primary-600 transition-colors shrink-0">{t('store.home')}</Link>
      <Icon name="ChevronLeft" size="2xs" className="text-text-disabled shrink-0" />
      {product.categoryName && product.categorySlug && (
        <><Link to={`/s/${slug}/c/${product.categorySlug}`} className="hover:text-primary-600 transition-colors shrink-0">{product.categoryName}</Link><Icon name="ChevronLeft" size="2xs" className="text-text-disabled shrink-0" /></>
      )}
      <span className="text-text-primary font-medium truncate">{product.name}</span>
    </nav>
  );
}

type ProductOptionLike = { id: number | string; name: string; values: Array<{ id: number | string; value: string }> };

function ProductOptions({ options, selected, onChange }: {
  options: ProductOptionLike[];
  selected: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <Surface>
      <div className="[&>*+*]:mt-[var(--space-4)]">
      {options.map((opt: ProductOptionLike) => (
        <div key={opt.id}>
          <p className="text-sm font-medium text-text-primary" style={{ marginBlockEnd: 'var(--space-2)' }}>{opt.name}</p>
          <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
            {opt.values.map((v: { id: number | string; value: string }) => {
              const isSelected = selected[opt.name] === v.value;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onChange(opt.name, v.value)}
                  className={`min-h-[40px] text-sm border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold shadow-sm'
                      : 'border-border bg-surface-1 text-text-secondary hover:border-border-hover hover:text-text-primary'
                  }`}
                  style={{ paddingInline: 'var(--space-4)', borderRadius: 'var(--radius-lg, 12px)' }}
                >
                  {v.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      </div>
    </Surface>
  );
}

function RecentlyViewed({ slug, currentProductId }: { slug: string; currentProductId: number }) {
  const { t } = useTranslation();
  try {
    const key = `recent_${slug}`;
    const recent: Array<{ id: number; name: string; slug: string; image: string }> = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = recent.filter(r => r.id !== currentProductId).slice(0, 6);
    if (filtered.length < 1) return null;
    return (
      <section style={{ paddingBlockStart: 'var(--space-12)' }}>
        <h2 className="text-lg sm:text-xl font-bold text-text-primary" style={{ marginBlockEnd: 'var(--space-6)' }}>{t('product.recentlyViewed', 'مشاهدات سابقة')}</h2>
        <ProductGrid dense>
          {filtered.map((r) => (
            <Link key={r.id} to={`/s/${slug}/p/${r.slug}`} className="group text-center">
              <div className="aspect-square bg-surface-2 overflow-hidden" style={{ borderRadius: 'var(--radius-lg, 12px)', marginBlockEnd: 'var(--space-2)' }}>
                {r.image ? <img width={400} height={400} src={r.image} alt={r.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Icon name="ShoppingBag" size="xs" className="text-text-disabled" /></div>}
              </div>
              <p className="text-[var(--badge-font-size)] text-text-secondary line-clamp-2 leading-tight">{r.name}</p>
            </Link>
          ))}
        </ProductGrid>
      </section>
    );
  } catch { return null; }
}

export default function BaseElegantProductPage(props: ProductPageProps) {
  const { t } = useTranslation();

  return (
    <div className="animate-fade-in pb-8" id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJSONLD(props.product, props.store?.name || '', `${window.location.origin}/s/${props.slug}`) }} />
      <div className="container-store" style={{ paddingBlock: 'var(--space-4)' }}>
        <Breadcrumb slug={props.slug} product={props.product} />

        <div className="grid lg:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)] items-start" style={{ gap: 'var(--space-8)' }}>
          <ProductGallery images={props.product.images} name={props.product.name} features={props.features} />

            <div className="[&>*+*]:mt-[var(--space-8)] min-w-0">
            <div>
              {props.product.categoryName && (
                <Link to={`/s/${props.slug}/c/${props.product.categorySlug}`} className="text-sm font-medium text-primary-600 hover:text-primary-700 inline-block" style={{ marginBlockEnd: 'var(--space-1)' }}>{props.product.categoryName}</Link>
              )}
                  <div className="flex items-start justify-between" style={{ gap: 'var(--space-4)' }}>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight">{props.product.name}</h1>
                  <div className="flex items-center flex-wrap" style={{ gap: 'var(--space-2)', marginBlockStart: 'var(--space-2)' }}>
                    {(props.features?.reviews !== false) && props.product.rating != null && props.product.reviewCount != null && (
                      <RatingStars rating={props.product.rating} count={props.product.reviewCount} />
                    )}
                    {(props.features?.reviews !== false) && props.product.salesCount != null && <BoughtBadge count={props.product.salesCount} />}
                  </div>
                </div>
                {(props.features?.shareButton !== false) && (
                  <StoreIconButton type="button" onClick={props.onShare} className="shrink-0" aria-label={t('product.share', 'مشاركة')}>
                    <Icon name="Share2" size="xs" className="text-text-tertiary" />
                  </StoreIconButton>
                )}
              </div>
            </div>

            <Surface className="shadow-none [&>*+*]:mt-[var(--space-5)]">
              <div className="flex items-baseline flex-wrap" style={{ gap: 'var(--space-2)' }}>
                <span className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums">{formatCurrency(props.effectivePrice)} <SarIcon size="md" /></span>
                {props.hasDiscount && (
                  <><span className="relative text-lg text-text-tertiary tabular-nums">{formatCurrency(props.effectiveCompareAtPrice!)} <SarIcon size="md" /><span className="absolute inset-x-0 top-[60%] h-px bg-border" aria-hidden="true" /></span>
                    <StoreBadge variant="discount" size="md">{t('ui.discount', 'خصم')} {props.discountPercent}%</StoreBadge></>
               )}
             </div>
                   {props.hasDiscount && (
                     <div className="flex items-center flex-wrap text-sm" style={{ gap: 'var(--space-2)' }}>
                        <StoreBadge variant="stock">{t('product.save')} {formatCurrency(Number(props.effectiveCompareAtPrice) - Number(props.effectivePrice))} <SarIcon size="md" /></StoreBadge>
                        {props.isFreeShipping && <StoreBadge variant="stock"><Icon name="Truck" size="2xs" />{t('product.freeShipping', 'الشحن مجاني')}</StoreBadge>}
                     </div>
                   )}
              {props.hasDiscount && props.countdownEnd > 0 && (
                <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                  <span className="text-[var(--badge-font-size)] text-text-secondary">{t('product.discountEndsIn', 'ينتهي خلال')}</span>
                  <CountdownTimer endTime={props.countdownEnd} size="md" />
                </div>
              )}
               {!props.hasDiscount && props.isFreeShipping && (
                 <div className="flex items-center flex-wrap text-sm" style={{ gap: 'var(--space-2)' }}>
                   <StoreBadge variant="stock"><Icon name="Truck" size="2xs" />{t('product.freeShipping', 'الشحن مجاني')}</StoreBadge>
                 </div>
              )}

              <InstallmentPromo price={props.effectivePrice} paymentMethods={props.paymentMethods} />
              <PaymentMarketingStrip methods={props.paymentMethods} />
            </Surface>

            {props.hasOptions && (
              <ProductOptions
                options={props.product.options}
                selected={props.selectedOptions}
                onChange={props.onOptionChange}
              />
            )}

            <Surface className="shadow-none [&>*+*]:mt-[var(--space-5)]">
              <div className="flex items-center flex-wrap" style={{ gap: 'var(--space-4)' }}>
                <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                  <span className="text-sm text-text-secondary">{t('product.quantity')}:</span>
                  <QuantitySelector value={props.quantity} onChange={props.onQuantityChange} min={1} max={props.maxQuantity} disabled={props.isOutOfStock} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto]" style={{ gap: 'var(--space-4)' }}>
                <StoreButton onClick={props.onAddToCart} disabled={props.isOutOfStock || props.adding || props.cartReady === false} loading={props.adding}
                  data-testid="pdp-add-to-cart"
                  iconStart={props.added ? <Icon name="Check" size="sm" /> : <Icon name="ShoppingCart" size="sm" />}
                  className={`w-full ${props.added ? 'bg-success text-success-text hover:bg-success' : props.isOutOfStock ? 'bg-surface-2 text-text-tertiary cursor-not-allowed' : ''}`}>
                  {props.added ? t('product.addedSuccessfully') : props.isOutOfStock ? t('product.outOfStock') : t('product.addToCart')}
                </StoreButton>
                {!props.isOutOfStock && (
                  <StoreButton onClick={props.onBuyNow} disabled={props.buying} loading={props.buying}
                    iconStart={<Icon name="ShoppingBag" size="sm" />}
                    className="w-full sm:w-auto sm:min-w-[136px] bg-success text-white hover:bg-success/90">
                    {t('product.buyNow', 'اشتري الآن')}
                  </StoreButton>
                )}
              </div>

              {props.product.requiresShipping && (props.features?.deliveryEstimate !== false) && <DeliveryEstimate />}

              <div className="flex flex-wrap items-center text-xs" style={{ columnGap: 'var(--space-4)', rowGap: 'var(--space-3)' }}>
                {(props.features?.giftWrap !== false) && props.product?.giftWrapAvailable && (
                  <CheckboxPill checked={props.giftWrap} onChange={props.onGiftWrapChange}>
                    <Icon name="Gift" size="2xs" />{t('product.giftWrap', 'تغليف هدية')}
                    {props.giftWrapPriceDisplay !== null && <span className="text-text-tertiary">(+{formatCurrency(props.giftWrapPriceDisplay!)} <SarIcon size="sm" />)</span>}
                  </CheckboxPill>
                )}
                {(props.features?.sendAsGift !== false) && (
                  <CheckboxPill checked={props.sendAsGift} onChange={props.onSendAsGiftChange}>
                    <Icon name="Gift" size="2xs" />{t('product.sendAsGift', 'إرسال كهدية')}
                  </CheckboxPill>
                )}
                {props.sendAsGift && (
                  <input type="text" value={props.giftMessage} onChange={(e) => props.onGiftMessageChange(e.target.value)}
                    placeholder={t('product.giftMessagePlaceholder', 'رسالة الهدية (اختياري)')}
                    maxLength={props.storeGiftOptions?.giftMessageMaxLength ?? 500}
                    className="w-full border border-border text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-200"
                    style={{ marginBlockStart: 'var(--space-1)', paddingInline: 'var(--space-3)', paddingBlock: 'var(--space-2)', borderRadius: 'var(--radius-lg, 12px)' }} />
                )}
                {props.showSizeGuide && (
                  <button
                    type="button"
                    onClick={() => props.onSizeGuideOpenChange(true)}
                    className="inline-flex min-h-[40px] items-center bg-white text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                    style={{ gap: 'var(--space-2)', paddingInline: 'var(--space-3)', borderRadius: 'var(--radius-lg, 12px)' }}
                  >
                    <Icon name="Ruler" size="2xs" />{t('product.sizeGuide', 'دليل المقاسات')}
                  </button>
                )}
              </div>
            </Surface>

            <Surface tone="muted" className="shadow-none [&>*+*]:mt-[var(--space-5)]">
              <div className="flex items-center flex-wrap" style={{ columnGap: 'var(--space-4)', rowGap: 'var(--space-3)' }} role="status" aria-live="polite">
                 {props.isOutOfStock ? (
                    <StoreBadge variant="danger"><Icon name="AlertTriangle" size="2xs" />{t('product.outOfStock')}</StoreBadge>
                  ) : props.isLowStock ? (
                    <StoreBadge variant="warning"><Icon name="AlertTriangle" size="2xs" />{t('product.lowStock')} — {props.effectiveStockQuantity} {t('product.stockAvailable')}</StoreBadge>
                  ) : (
                    <StoreBadge variant="stock"><Icon name="Check" size="2xs" />{t('product.inStock')}</StoreBadge>
                  )}
                {props.product.sku && <span className="text-xs text-text-tertiary font-mono">SKU: {props.product.sku}</span>}
                 {(props.features?.liveViewers !== false) && props.watcherCount != null && !props.isOutOfStock && (
                    <span className="inline-flex items-center text-xs text-primary-600" style={{ gap: 'var(--space-1)' }}><Icon name="Eye" size="2xs" />{props.watcherCount} {t('product.watching', 'شخص يشاهده الآن')}</span>
                  )}
              </div>

              <div className="flex items-center text-xs text-text-secondary" style={{ gap: 'var(--space-3)' }}>
                <Icon name="BadgeCheck" size="2xs" className="text-primary-500" />
                <span>{props.product.type === 'digital' ? t('product.typeDigital', 'منتج رقمي — تسليم فوري') : props.product.type === 'service' ? t('product.typeService', 'خدمة — بعد الشراء') : t('product.typePhysical', 'منتج مادي — يتطلب شحن')}</span>
              </div>
            </Surface>

            {(props.features?.stockBar !== false) && props.product.trackInventory && !props.isOutOfStock && (
              <StockBar current={props.effectiveStockQuantity} max={Math.max(props.effectiveStockQuantity, 50)} />
            )}

            <TrustAndPolicyBlock hasElectronicPayment={props.hasElectronicPayment} />

            {(props.features?.trustBadges !== false) && (
              <div style={{ marginBlockStart: 'var(--space-4)' }}>
                <TrustBadgesSection config={props.theme} variant="product" />
              </div>
            )}

            {props.product.description && (
              <div style={{ marginBlockStart: 'var(--space-10)' }}>
                <Surface tone="muted" className="shadow-none">
                  <div className="flex items-center justify-between" style={{ gap: 'var(--space-3)', marginBlockEnd: 'var(--space-4)' }}>
                    <h3 className="font-semibold text-sm text-text-primary">{t('product.description')}</h3>
                    {props.product.description.length > 180 && (
                      <span className="text-[var(--badge-font-size)] text-text-tertiary">
                        {props.showFullDesc ? t('product.fullDescription', 'الوصف الكامل') : t('product.summary', 'ملخص')}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <p className={`text-sm text-text-secondary leading-7 whitespace-pre-wrap ${!props.showFullDesc ? 'line-clamp-4' : ''}`}>
                      {props.product.description}
                    </p>
                    {!props.showFullDesc && props.product.description.length > 180 && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" aria-hidden="true" />
                    )}
                  </div>

                  {props.product.description.length > 180 && (
                    <button
                      type="button"
                      onClick={() => props.onShowFullDescChange(!props.showFullDesc)}
                      className="inline-flex min-h-[36px] items-center text-xs text-primary-600 font-medium hover:text-primary-700 transition-colors"
                      style={{ gap: 'var(--space-2)', marginBlockStart: 'var(--space-3)' }}
                    >
                      <Icon name="ChevronDown" className={`transition-transform ${props.showFullDesc ? 'rotate-180' : ''}`} size="2xs" />
                      {props.showFullDesc ? t('product.showLess') : t('product.readMore')}
                    </button>
                  )}
                </Surface>
              </div>
            )}

            {(props.hasWeight || props.hasDimensions || props.product.isFragile || props.product.requiresShipping) && (
              <Surface tone="muted" className="shadow-none">
                <button
                  type="button"
                  onClick={() => props.onDetailsOpenChange(!props.detailsOpen)}
                  className="flex min-h-[44px] w-full items-center justify-between text-sm font-medium text-text-primary hover:text-primary-600 transition-colors"
                >
                  <span className="inline-flex items-center" style={{ gap: 'var(--space-2)' }}>
                    <Icon name="Truck" size="xs" className="text-text-tertiary" />
                    {t('product.shippingAndSpecs', 'الشحن والمواصفات')}
                  </span>
                  <Icon name="ChevronDown" className={`transition-transform ${props.detailsOpen ? 'rotate-180' : ''}`} size="2xs" />
                </button>

                {props.detailsOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 animate-fade-in" style={{ gap: 'var(--space-3)', marginBlockStart: 'var(--space-3)' }}>
                    {props.hasWeight && <div className="flex items-center text-sm text-text-secondary" style={{ gap: 'var(--space-2)' }}><Icon name="Weight" size="xs" className="text-text-tertiary" /><span>{t('product.weight')}: {formatWeight(props.product.weightGrams!, t)}</span></div>}
                    {props.hasDimensions && <div className="flex items-center text-sm text-text-secondary" style={{ gap: 'var(--space-2)' }}><Icon name="Ruler" size="xs" className="text-text-tertiary" /><span>{t('product.dimensions')}: {props.product.lengthCm || '–'} × {props.product.widthCm || '–'} × {props.product.heightCm || '–'} {t('product.cm')}</span></div>}
                    {props.product.isFragile && <div className="flex items-center text-sm text-warning" style={{ gap: 'var(--space-2)' }}><Icon name="Box" size="xs" /><span>{t('product.fragile')}</span></div>}
                    {props.product.requiresShipping && <div className="flex items-center text-sm text-text-secondary" style={{ gap: 'var(--space-2)' }}><Icon name="Truck" size="xs" className="text-text-tertiary" /><span>{t('product.requiresShipping')}</span></div>}
                  </div>
                )}
              </Surface>
            )}
          </div>
        </div>

        <div style={{ paddingBlockStart: 'var(--space-12)' }}>
          <ProductSection title={t('product.relatedProducts')}>
            {props.product.categoryId && props.relatedProducts.map((p: { id: number; name: string; slug: string; price: number | string }) => <ThemedProductCard key={p.id} product={p} slug={props.slug} />)}
          </ProductSection>
        </div>

        {(props.features?.alsoBought !== false) && props.alsoBought.length > 0 && (
          <ProductSection title={t('product.alsoBought', 'اشترى العملاء أيضاً')}>
            {props.alsoBought.map((p: { id: number; name: string; slug: string; price: number | string }) => <ThemedProductCard key={p.id} product={p} slug={props.slug} />)}
          </ProductSection>
        )}

        {(props.features?.recentlyViewed !== false) && <RecentlyViewed slug={props.slug} currentProductId={props.product.id} />}

        {(props.features?.alsoBought !== false) && props.crossSellProducts.length > 0 && (
          <section style={{ paddingBlockStart: 'var(--space-12)' }}>
            <h2 className="text-lg sm:text-xl font-bold text-text-primary" style={{ marginBlockEnd: 'var(--space-6)' }}>{t('product.youMayAlsoLike')}</h2>
            <ProductGrid>
              {props.crossSellProducts.map((p: { id: number; name: string; slug: string; price: number | string }) => <ThemedProductCard key={p.id} product={p} slug={props.slug} />)}
            </ProductGrid>
          </section>
        )}
      </div>

      {props.showSizeGuide && props.sizeGuide && props.sizeGuideOpen && <SizeGuideModal guide={props.sizeGuide} onClose={() => props.onSizeGuideOpenChange(false)} />}

    </div>
  );
}
