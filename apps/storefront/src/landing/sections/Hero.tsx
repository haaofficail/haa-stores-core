/**
 * Hero — top-of-page hero section
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor, sprint 13/13).
 * Eyebrow badge + H1 with CountdownTimer + subtitle + payment/shipping logo
 * strips + government logos (gated by isClaimEnabled('govLogos')) + dual CTA
 * + lazy-loaded AI Preview Chat (P2-#10) + trust microcopy.
 * The CountdownTimer helper is local to this section.
 */
import React from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; lucide icons as plain JSX
import {
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Shield,
  X,
} from 'lucide-react';
import { isClaimEnabled } from '@/lib/landing-claims';
import { isAIPreviewEnabled } from '@/landing/aiChatContent';
import { StoreContainer } from '@/components/ui';
import type { TFn } from './types';
// P2-#10: lazy-load the AI chat to reduce initial bundle size.
// The chat is below-the-fold and only renders for users with the
// feature flag enabled, so we lazy-load it. The Suspense boundary
// renders nothing while the chunk loads.
const HeroAIChatLazy = React.lazy(() => import('@/landing/HeroAIChat'));

/**
 * CountdownTimer — animates from 60 → 0 once on mount, used in the H1
 * to convey speed ("launch your store in <countdown> second").
 * Local helper used only by Hero.
 */
function CountdownTimer() {
  const [count, setCount] = React.useState(60);

  React.useEffect(() => {
    if (count <= 0) return;
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count]);

  return (
    <span
      className="inline-flex items-baseline bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(59,130,246,0.35)] tabular-nums"
      style={{ minWidth: '1.4ch' }}
    >
      {count}
    </span>
  );
}

export function Hero({ t }: { t: TFn; onDemoOpen?: () => void }) {
  return (
    <section className="relative overflow-hidden pb-16 pt-20 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28">
      {/* Decorative background glow */}
      <div aria-hidden="true" className="absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-pill bg-gradient-to-b from-blue-100/40 via-indigo-100/20 to-transparent blur-3xl" />
      <StoreContainer className="relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow */}
          <span className="aurora-pill text-xs !border-emerald-200 !bg-transparent !text-emerald-700">
            <img src="/assets/saudi-map.png" alt="" className="inline-block h-[1.1em] w-auto align-middle" aria-hidden="true" />
            {' '}
            {t('landing.hero.badge', 'منصة سعودية')}
          </span>

          {/* H1 */}
          <h1 className="mt-7 text-[44px] font-extrabold leading-[1.1] tracking-[-0.04em] text-text-primary sm:text-[60px] lg:text-[76px] xl:text-[84px]">
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <span>أطلق متجرك الإلكتروني خلال</span>
              <span className="inline-flex items-center gap-2">
                <CountdownTimer />
                <span>ثانية</span>
              </span>
            </div>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-3xl text-[18px] leading-[1.65] text-text-secondary sm:text-[20px]">
            {t(
              'landing.hero.subtitle',
              'ثيمات جاهزة، بوابات دفع سعودية، شحن مدمج، ولوحة تحكم كاملة لإدارة متجرك.'
            )}
          </p>

          {/* Payment logos */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {[
              { src: '/assets/payment-logos/mada.svg', alt: 'مدى', h: '24px' },
              { src: '/assets/payment-logos/apple-pay.svg', alt: 'Apple Pay', h: '20px' },
              { src: '/assets/payment-logos/visa.svg', alt: 'Visa', h: '16px' },
              { src: '/assets/payment-logos/mastercard.svg', alt: 'Mastercard', h: '20px' },
              { src: '/assets/payment-logos/stc-pay.svg', alt: 'STC Pay', h: '20px' },
              { src: '/assets/payment-logos/tabby.svg', alt: 'تابي', h: '20px' },
              { src: '/assets/payment-logos/tamara.svg', alt: 'تمارا', h: '20px' },
            ].map(({ src, alt, h }) => (
              <img
                key={alt}
                src={src}
                alt={alt}
                className="w-auto transition-all duration-300"
                style={{ height: h }}
                loading="lazy"
              />
            ))}
          </div>

          {/* Shipping logos */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <img src="/assets/shipping-logos/saudi-post.svg" alt="سبل" style={{ height: '22px' }} className="w-auto transition-all duration-300" />
            <img src="/assets/shipping-logos/aramex.svg" alt="Aramex" style={{ height: '20px' }} className="w-auto transition-all duration-300" />
            <img src="/assets/shipping-logos/naqel.svg" alt="ناقل" style={{ height: '22px' }} className="w-auto transition-all duration-300" />
            <img src="/assets/shipping-logos/dhl.svg" alt="DHL" style={{ height: '16px' }} className="w-auto transition-all duration-300" />
              <img src="/assets/shipping-logos/redbox.svg" alt="ريد بوكس" style={{ height: '24px' }} className="w-auto transition-all duration-300" />
          </div>

          {/* Government trust logos — gated by isClaimEnabled('govLogos').
              TASK-0038 audit P0-#9: each logo implies a government
              registration we may not yet have. Until G1 (MoCI) + G2
              (ZATCA VAT) + G3 (e-commerce license) are all approved,
              these logos MUST be hidden. */}
          {isClaimEnabled('govLogos') && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <img src="/assets/payment-logos/ministry-of-commerce.svg" alt="وزارة التجارة" style={{ height: '48px' }} className="w-auto transition-all duration-300" />
              <img src="/assets/payment-logos/saudi-business-center.svg" alt="منصة الأعمال" style={{ height: '92px' }} className="w-auto transition-all duration-300" />
              <img src="/assets/payment-logos/maroof.svg" alt="معروف" style={{ height: '42px' }} className="w-auto transition-all duration-300" />
              <img src="/assets/payment-logos/saudi-made.svg" alt="صنع في السعودية" style={{ height: '48px' }} className="w-auto transition-all duration-300" />
              <img src="/assets/payment-logos/zatca.svg" alt="هيئة الزكاة والضريبة والجمارك" style={{ height: '42px' }} className="w-auto transition-all duration-300" />
            </div>
          )}

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/signup?ref=hero"
              className="aurora-btn-primary group inline-flex h-14 min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-8 text-[17px] font-bold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:!text-white sm:w-auto"
            >
              {t('landing.hero.primaryCta', 'سجّل كتاجر — مجانًا')}
              <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
            </Link>
            <Link
              to="/s/demo"
              className="group inline-flex h-14 min-h-[56px] w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/50 px-8 text-[16px] font-semibold text-text-secondary shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:border-white/60 hover:text-text-primary sm:w-auto"
            >
              {'شاهد متجرًا حقيقيًا'}
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          {/* AI Preview Chat — replaces the old "شاهد العرض التوضيحي" secondary CTA.
              P2-#10: lazy-loaded via React.lazy to keep the initial bundle smaller.
              The Suspense fallback renders nothing while the chunk is fetched. */}
          {isAIPreviewEnabled() && (
            <React.Suspense fallback={null}>
              <HeroAIChatLazy />
            </React.Suspense>
          )}

          {/* Trust microcopy */}
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] font-medium text-text-secondary">
            {[
              { icon: Shield, text: t('landing.hero.trust1', 'بدون بطاقة بنكية') },
              { icon: X, text: t('landing.hero.trust2', 'إلغاء في أي وقت') },
              { icon: MessageCircle, text: t('landing.hero.trust3', 'دعم بالعربي 24/7') },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>


      </StoreContainer>
    </section>
  );
}
