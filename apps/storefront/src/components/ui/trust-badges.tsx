import { type ThemeConfig } from '@haa/storefront-themes';

export type LogoCategory = 'CARD_NETWORK' | 'LOCAL_PAYMENT_METHOD' | 'DIGITAL_WALLET' | 'BNPL_PROVIDER' | 'GOVERNMENT_TRUST';

export interface PaymentLogo {
  id: string;
  name: string;
  assetPath: string;
  alt: string;
  category: LogoCategory;
  enabled: boolean;
  featureKey?: string;
  requiresAuthorization?: boolean;
  sourceUrl?: string;
  authorizationNote?: string;
}

export interface EligibleBadge {
  id: 'businessPlatform' | 'commercialRegistration' | 'unifiedQr' | 'maroof' | 'saudiMade' | 'vat';
  label: string;
  description: string;
  iconType: 'text' | 'image' | 'qr';
  imageUrl?: string;
  qrUrl?: string;
  verificationUrl?: string;
  legacy?: boolean;
}

export function getEligibleTrustBadges(config: ThemeConfig | null | undefined): EligibleBadge[] {
  const tb = config?.trustBadges;
  if (!tb) return [];

  const badges: EligibleBadge[] = [];

  if (tb.businessPlatform.enabled && tb.businessPlatform.acceptedTerms && (tb.businessPlatform.verificationNumber || tb.businessPlatform.verificationUrl)) {
    badges.push({
      id: 'businessPlatform',
      label: 'موثق في منصة الأعمال',
      description: tb.businessPlatform.verificationNumber || '',
      iconType: 'image',
      imageUrl: '/assets/payment-logos/saudi-business-center.svg',
      verificationUrl: tb.businessPlatform.verificationUrl,
    });
  }

  if (tb.commercialRegistration.enabled && tb.commercialRegistration.acceptedTerms && tb.commercialRegistration.crNumber) {
    badges.push({
      id: 'commercialRegistration',
      label: 'سجل تجاري موثق',
      description: tb.commercialRegistration.crNumber,
      iconType: 'image',
      imageUrl: '/assets/payment-logos/ministry-of-commerce.svg',
      verificationUrl: tb.commercialRegistration.verificationUrl,
    });
  }

  if (tb.unifiedQr.enabled && tb.unifiedQr.acceptedTerms && tb.unifiedQr.qrImageUrl) {
    badges.push({
      id: 'unifiedQr',
      label: 'الرمز الإلكتروني الموحد',
      description: '',
      iconType: 'qr',
      qrUrl: tb.unifiedQr.qrImageUrl,
    });
  }

  if (tb.maroof.enabled && tb.maroof.acceptedTerms && (tb.maroof.maroofNumber || tb.maroof.verificationUrl)) {
    badges.push({
      id: 'maroof',
      label: 'معروف',
      description: tb.maroof.maroofNumber || '',
      iconType: 'image',
      imageUrl: '/assets/payment-logos/maroof.svg',
      verificationUrl: tb.maroof.verificationUrl,
      legacy: true,
    });
  }

  if (tb.saudiMade.enabled && tb.saudiMade.acceptedTerms && tb.saudiMade.memberConfirmed && (tb.saudiMade.membershipNumber || tb.saudiMade.verificationUrl || tb.saudiMade.officialAssetUrl)) {
    badges.push({
      id: 'saudiMade',
      label: 'صنع في السعودية',
      description: tb.saudiMade.membershipNumber || '',
      iconType: 'image',
      imageUrl: tb.saudiMade.officialAssetUrl || '/assets/payment-logos/saudi-made.svg',
      verificationUrl: tb.saudiMade.verificationUrl,
    });
  }

  if (tb.vat.enabled && tb.vat.acceptedTerms && tb.vat.vatNumber) {
    badges.push({
      id: 'vat',
      label: 'رقم ضريبي موثق',
      description: tb.vat.vatNumber,
      iconType: 'image',
      imageUrl: '/assets/payment-logos/zatca.svg',
      verificationUrl: tb.vat.verificationUrl,
    });
  }

  return badges;
}

export function TrustBadgesSection({ config, variant = 'footer' }: { config: ThemeConfig | null | undefined; variant?: 'footer' | 'product' | 'home' }) {
  const badges = getEligibleTrustBadges(config);
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-nowrap items-stretch justify-center gap-1 overflow-x-auto">
      {badges.map((badge) => (
        <BadgeCard key={badge.id} badge={badge} variant={variant} />
      ))}
    </div>
  );
}

function BadgeCard({ badge, variant = 'footer' }: { badge: EligibleBadge; variant?: 'footer' | 'product' | 'home' }) {
  const isProduct = variant === 'product';
  const content = (
    <>
      {badge.iconType === 'qr' && badge.qrUrl ? (
        <div className={`${isProduct ? 'h-12' : 'h-24'} flex items-center justify-center`}>
          <img src={badge.qrUrl} alt={badge.label} className={`${isProduct ? 'h-10' : 'h-14'} w-auto object-contain`} />
        </div>
      ) : badge.iconType === 'image' && badge.imageUrl ? (
        <div className={`${isProduct ? 'h-12' : 'h-24'} flex items-center justify-center`}>
          <img src={badge.imageUrl} alt={badge.label} className={`${isProduct ? (badge.id === 'businessPlatform' ? 'h-10' : 'h-5') : (badge.id === 'businessPlatform' ? 'h-24' : badge.id === 'commercialRegistration' ? 'h-6' : 'h-16')} w-auto object-contain`} />
        </div>
      ) : (
        <div className={`${isProduct ? 'h-12' : 'h-24'} flex items-center justify-center`}>
          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-success/10 text-success shrink-0">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
      )}

    </>
  );

  const baseClass = isProduct
    ? 'flex flex-col items-center justify-center gap-0 px-1 py-1 rounded-lg bg-surface-1'
    : 'flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg bg-surface-1';

  if (badge.verificationUrl) {
    return (
      <a href={badge.verificationUrl} target="_blank" rel="noopener noreferrer" className={`${baseClass} hover:border-primary-300 transition-colors cursor-pointer`}>
        {content}
      </a>
    );
  }
  return <div className={baseClass}>{content}</div>;
}

export const paymentLogos: PaymentLogo[] = [
  {
    id: 'mada',
    name: 'mada',
    assetPath: '/assets/payment-logos/mada.svg',
    alt: 'mada',
    category: 'LOCAL_PAYMENT_METHOD',
    enabled: true,
    sourceUrl: 'https://www.mada.com.sa',
  },
  {
    id: 'visa',
    name: 'Visa',
    assetPath: '/assets/payment-logos/visa.svg',
    alt: 'Visa',
    category: 'CARD_NETWORK',
    enabled: true,
    sourceUrl: 'https://www.visa.com.sa',
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    assetPath: '/assets/payment-logos/mastercard.svg',
    alt: 'Mastercard',
    category: 'CARD_NETWORK',
    enabled: true,
    sourceUrl: 'https://www.mastercard.com',
  },
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    assetPath: '/assets/payment-logos/apple-pay.svg',
    alt: 'Apple Pay',
    category: 'DIGITAL_WALLET',
    enabled: true,
    sourceUrl: 'https://www.apple.com/apple-pay',
  },
  {
    id: 'stc-pay',
    name: 'STC Pay',
    assetPath: '/assets/payment-logos/stc-pay.svg',
    alt: 'STC Pay',
    category: 'DIGITAL_WALLET',
    enabled: true,
    sourceUrl: 'https://stcpay.com.sa',
  },
  {
    id: 'tamara',
    name: 'Tamara',
    assetPath: '/assets/payment-logos/tamara.svg',
    alt: 'Tamara',
    category: 'BNPL_PROVIDER',
    enabled: true,
    sourceUrl: 'https://www.tamara.co',
  },
  {
    id: 'tabby',
    name: 'Tabby',
    assetPath: '/assets/payment-logos/tabby.svg',
    alt: 'Tabby',
    category: 'BNPL_PROVIDER',
    enabled: true,
    sourceUrl: 'https://tabby.ai',
  },
  {
    id: 'cash-on-delivery',
    name: 'Cash on Delivery',
    assetPath: '/assets/payment-logos/cash-on-delivery.svg',
    alt: 'الدفع عند الاستلام',
    category: 'LOCAL_PAYMENT_METHOD',
    enabled: true,
  },
  {
    id: 'maroof',
    name: 'Maroof',
    assetPath: '/assets/payment-logos/maroof.svg',
    alt: 'Maroof',
    category: 'GOVERNMENT_TRUST',
    enabled: false,
    featureKey: 'badgeMaroof',
    requiresAuthorization: true,
    sourceUrl: 'https://maroof.sa',
    authorizationNote: 'Store must be registered on Maroof platform and badge must be approved by MCIT.',
  },
  {
    id: 'saudi-business-center',
    name: 'Saudi Business Center',
    assetPath: '/assets/payment-logos/saudi-business-center.svg',
    alt: 'Saudi Business Center',
    category: 'GOVERNMENT_TRUST',
    enabled: false,
    featureKey: 'badgeSaudiBusinessCenter',
    requiresAuthorization: true,
    sourceUrl: 'https://business.sa',
    authorizationNote: 'Store must hold a valid commercial registration via the Saudi Business Center portal.',
  },
  {
    id: 'saudi-made',
    name: 'Saudi Made',
    assetPath: '/assets/payment-logos/saudi-made.svg',
    alt: 'Saudi Made',
    category: 'GOVERNMENT_TRUST',
    enabled: false,
    featureKey: 'badgeSaudiMade',
    requiresAuthorization: true,
    sourceUrl: 'https://saudimade.sa',
    authorizationNote: 'Products must be certified as "Made in Saudi" under the Saudi Made program.',
  },
  {
    id: 'ministry-of-commerce',
    name: 'Ministry of Commerce',
    assetPath: '/assets/payment-logos/ministry-of-commerce.svg',
    alt: 'Ministry of Commerce',
    category: 'GOVERNMENT_TRUST',
    enabled: false,
    featureKey: 'badgeMinistryOfCommerce',
    requiresAuthorization: true,
    sourceUrl: 'https://mc.gov.sa',
    authorizationNote: 'Store must hold a valid e-commerce license registered with the Ministry of Commerce.',
  },
  {
    id: 'zatca',
    name: 'ZATCA',
    assetPath: '/assets/payment-logos/zatca.svg',
    alt: 'Zakat, Tax and Customs Authority',
    category: 'GOVERNMENT_TRUST',
    enabled: false,
    featureKey: 'badgeZatca',
    requiresAuthorization: true,
    sourceUrl: 'https://zatca.gov.sa',
    authorizationNote: 'Store must be registered for VAT/e-invoicing with ZATCA.',
  },
];

export function PaymentLogoImg({ logo, size = 'h-4' }: { logo: PaymentLogo; size?: string }) {
  return (
    <div className="inline-flex items-center justify-center">
      <img src={logo.assetPath} alt={logo.alt} className={`${size} w-auto object-contain`} />
    </div>
  );
}

export function MinistryCommerceIcon({ className = '' }: { className?: string }) {
  const logo = paymentLogos.find(l => l.id === 'ministry-of-commerce')!;
  return <PaymentLogoImg logo={logo} size={className || 'h-6'} />;
}

export function ZakatIcon({ className = '' }: { className?: string }) {
  const logo = paymentLogos.find(l => l.id === 'zatca')!;
  return <PaymentLogoImg logo={logo} size={className || 'h-6'} />;
}

export function getEnabledTrustBadges(features: Record<string, boolean>): PaymentLogo[] {
  return paymentLogos.filter((logo) => {
    if (logo.category !== 'GOVERNMENT_TRUST' || !logo.featureKey) return false
    return logo.enabled && features[logo.featureKey] === true
  })
}

export function getPaymentLogosByCategory(category: LogoCategory): PaymentLogo[] {
  return paymentLogos.filter(l => l.category === category && l.enabled)
}
