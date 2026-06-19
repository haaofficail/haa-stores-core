import type { CSSProperties } from 'react';

type LogoSize = 'sm' | 'md' | 'lg';

const PAYMENT_LOGOS: { src: string; alt: string; hScale?: number }[] = [
  { src: '/assets/payment-logos/mada.svg', alt: 'مدى' },
  { src: '/assets/payment-logos/apple-pay.svg', alt: 'Apple Pay' },
  { src: '/assets/payment-logos/visa.svg', alt: 'Visa', hScale: 0.67 },
  { src: '/assets/payment-logos/mastercard.svg', alt: 'Mastercard' },
  { src: '/assets/payment-logos/stc-pay.svg', alt: 'STC Pay' },
  { src: '/assets/payment-logos/tabby.svg', alt: 'تابي' },
  { src: '/assets/payment-logos/tamara.svg', alt: 'تمارا' },
];

const SHIPPING_LOGOS: { src: string; alt: string; hScale?: number }[] = [
  { src: '/assets/shipping-logos/saudi-post.svg', alt: 'سبل', hScale: 1.1 },
  { src: '/assets/shipping-logos/aramex.svg', alt: 'Aramex' },
  { src: '/assets/shipping-logos/naqel.svg', alt: 'ناقل', hScale: 1.1 },
  { src: '/assets/shipping-logos/dhl.svg', alt: 'DHL', hScale: 0.8 },
  { src: '/assets/shipping-logos/redbox.svg', alt: 'ريد بوكس', hScale: 1.2 },
];

function computeHeight(baseHeightPx: number, scale = 1): CSSProperties {
  return { height: `${Math.round(baseHeightPx * scale)}px` };
}

export function PaymentLogos({ size = 'md' }: { size?: LogoSize }) {
  const basePx = size === 'lg' ? 24 : size === 'md' ? 20 : 16;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {PAYMENT_LOGOS.map(({ src, alt, hScale }) => (
        <img
          key={alt}
          src={src}
          alt={alt}
          style={computeHeight(basePx, hScale)}
          className="w-auto transition-all motion-reduce:transition-none duration-300"
          loading="lazy"
        />
      ))}
    </div>
  );
}

export function ShippingLogos({ size = 'md' }: { size?: LogoSize }) {
  const basePx = size === 'lg' ? 24 : size === 'md' ? 20 : 16;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {SHIPPING_LOGOS.map(({ src, alt, hScale }) => (
        <img
          key={alt}
          src={src}
          alt={alt}
          style={computeHeight(basePx, hScale)}
          className="w-auto transition-all motion-reduce:transition-none duration-300"
          loading="lazy"
        />
      ))}
    </div>
  );
}
