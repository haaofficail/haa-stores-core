/**
 * Hero — top-of-page hero section
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor, sprint 13/13).
 * Eyebrow badge + H1 with "١ دقيقة" wordmark image + subtitle + trust strip
 * (payment + shipping logos in a glass card) + government logos (gated by
 * isClaimEnabled('govLogos')) + dual CTA + lazy-loaded AI Preview Chat (P2-#10)
 * + trust microcopy.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Icon,
  MessageCircle,
  Shield,
  StoreContainer,
  X,
} from '@/components/ui';
import { isClaimEnabled } from '@/lib/landing-claims';
import { isAIPreviewEnabled } from '@/landing/aiChatContent';
import { PaymentLogos, ShippingLogos } from './TrustLogos';
import type { TFn } from './types';

const HeroAIChatLazy = React.lazy(() => import('@/landing/HeroAIChat'));

export function Hero({ t }: { t: TFn; onDemoOpen?: () => void }) {
  return (
    <section className="relative overflow-hidden pb-16 pt-20 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28">
      {/* Aurora atmosphere — 3 stacked gradient blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-pill bg-gradient-to-b from-primary-100/40 via-primary-200/20 to-transparent blur-3xl" />
        <div className="absolute -end-32 top-40 h-72 w-72 rounded-full bg-primary-300/20 blur-3xl motion-reduce:hidden" />
        <div className="absolute -start-24 top-1/3 h-64 w-64 rounded-full bg-emerald-200/15 blur-3xl motion-reduce:hidden" />
      </div>

      <StoreContainer className="relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow */}
          <span className="aurora-pill text-xs !border-emerald-200 !bg-transparent !text-emerald-700">
            <img src="/assets/saudi-map.png" alt="" className="inline-block h-[1.1em] w-auto align-middle" aria-hidden="true" />
            {' '}
            {t('landing.hero.badge', 'منصة سعودية')}
          </span>

          {/* H1 — "١ دقيقة" wordmark image as the visual anchor.
              CSS class hero-one-minute handles responsive sizing + CLS-safe
              aspect-ratio box. The --animated variant adds fade-up + float. */}
          <h1 className="relative mx-auto mt-10 max-w-5xl text-center font-bold leading-[1.05] tracking-tight text-text-primary sm:mt-12">
            <span
              style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.5rem)' }}
              className="block font-medium text-text-secondary"
            >
              متجرك الكامل جاهز خلال
            </span>
            <img
              src="/assets/hero/one-minute.svg"
              alt="١ دقيقة"
              width={1672}
              height={941}
              loading="eager"
              decoding="async"
              className="hero-one-minute hero-one-minute--animated mt-2 sm:mt-3"
              style={{ height: 'auto' }}
              draggable={false}
            />
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-8 max-w-3xl text-[18px] leading-[1.65] text-text-secondary sm:text-[20px]">
            {t(
              'landing.hero.subtitle',
              'ثيمات جاهزة، بوابات دفع سعودية، شحن مدمج، ولوحة تحكم كاملة لإدارة متجرك.'
            )}
          </p>

          {/* Trust strip — payment + shipping logos in a glass card */}
          <div className="mx-auto mt-10 max-w-3xl">
            <div className="aurora-card rounded-2xl border border-white/40 bg-white/40 px-6 py-5 shadow-lg shadow-primary-500/5 backdrop-blur-xl sm:px-8 sm:py-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                وسائل الدفع والتوصيل المتكاملة
              </p>
              <PaymentLogos size="lg" />
              <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-text-primary/10 to-transparent" />
              <ShippingLogos size="md" />
            </div>
          </div>

          {/* Government trust logos — gated by isClaimEnabled('govLogos') */}
          {isClaimEnabled('govLogos') && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <img src="/assets/payment-logos/ministry-of-commerce.svg" alt="وزارة التجارة" style={{ height: '48px' }} className="w-auto transition-all motion-reduce:transition-none duration-300" />
              <img src="/assets/payment-logos/saudi-business-center.svg" alt="منصة الأعمال" style={{ height: '92px' }} className="w-auto transition-all motion-reduce:transition-none duration-300" />
              <img src="/assets/payment-logos/maroof.svg" alt="معروف" style={{ height: '42px' }} className="w-auto transition-all motion-reduce:transition-none duration-300" />
              <img src="/assets/payment-logos/saudi-made.svg" alt="صنع في السعودية" style={{ height: '48px' }} className="w-auto transition-all motion-reduce:transition-none duration-300" />
              <img src="/assets/payment-logos/zatca.svg" alt="هيئة الزكاة والضريبة والجمارك" style={{ height: '42px' }} className="w-auto transition-all motion-reduce:transition-none duration-300" />
            </div>
          )}

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/signup?ref=hero"
              className="aurora-btn-primary group inline-flex h-14 min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-8 text-[17px] font-bold text-white shadow-lg shadow-primary-500/30 transition-all motion-reduce:transition-none duration-300 hover:scale-[1.03] hover:shadow-xl hover:!text-white sm:w-auto"
            >
              {t('landing.hero.primaryCta', 'سجّل كتاجر — مجانًا')}
              <Icon
                icon={ArrowLeft}
                size="md"
                className="transition-transform motion-reduce:transition-none duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
              />
            </Link>
            <Link
              to="/s/demo"
              className="group inline-flex h-14 min-h-[56px] w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/50 px-8 text-[16px] font-semibold text-text-secondary shadow-sm backdrop-blur-sm transition-all motion-reduce:transition-none duration-300 hover:scale-[1.03] hover:border-white/60 hover:text-text-primary sm:w-auto"
            >
              {'شاهد متجرًا حقيقيًا'}
              <Icon icon={ExternalLink} size="xs" />
            </Link>
          </div>

          {/* AI Preview Chat */}
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
            ].map(({ icon: Ic, text }) => (
              <li key={text} className="flex items-center gap-1.5">
                <Icon icon={Ic} size="xs" className="text-emerald-500" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </StoreContainer>
    </section>
  );
}
