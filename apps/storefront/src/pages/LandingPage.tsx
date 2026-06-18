/**
 * Haa Landing Page — Aurora / Glass aesthetic
 *
 * This file is the orchestrator. Each section is in
 * src/landing/sections/<Name>.tsx (P2-#1 refactor, in progress).
 *
 * Sections (split across files):
 *   - Nav (62 lines)
 *   - Hero (242 lines) - next
 *   - AboutSection (53 lines)
 *   - LiveTicker (36 lines)
 *   - Features (75 lines)
 *   - HowItWorks (119 lines)
 *   - PaymentSection (65 lines)
 *   - StorefrontPreview (92 lines)
 *   - MockupPreview (96 lines)
 *   - Bento (209 lines)
 *   - Pricing (133 lines)
 *   - FinalCTA (95 lines)
 *   - Footer (43 lines)
 *
 * Inspired by Linear, Stripe, Vercel. Apple-grade typography.
 * RTL Arabic, IBM Plex Sans Arabic.
 */
import React, { useEffect, useRef, useState as useReactState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getClaim, isClaimEnabled } from '@/lib/landing-claims';
import {
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Heart,
  MessageCircle,
  Quote,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { StoreContainer } from '@/components/ui';
// P2-#10: lazy-load the AI chat to reduce initial bundle size.
// The chat is below-the-fold and only renders for users with the
// feature flag enabled, so we lazy-load it. The Suspense boundary
// renders nothing while the chunk loads.
const HeroAIChatLazy = React.lazy(() => import('@/landing/HeroAIChat'));

import { isAIPreviewEnabled } from '@/landing/aiChatContent';

// Extracted sections (P2-#1 refactor)
import { Nav } from '@/landing/sections/Nav';
import { Footer } from '@/landing/sections/Footer';
import { LiveTicker } from '@/landing/sections/LiveTicker';
import { AboutSection } from '@/landing/sections/AboutSection';
import { Features } from '@/landing/sections/Features';
import { PaymentSection } from '@/landing/sections/PaymentSection';
import { HowItWorks } from '@/landing/sections/HowItWorks';
import { MockupPreview, StorefrontPreview } from '@/landing/sections/StorefrontMockup';
import { Pricing } from '@/landing/sections/Pricing';
import { FinalCTA } from '@/landing/sections/FinalCTA';
import type { TFn } from '@/landing/sections/types';

/* ════════════════════════════════════════════════════════════════
   SCROLL REVEAL — fade-in-slide-up on intersection
   ════════════════════════════════════════════════════════════════ */
function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useReactState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   AURORA BACKGROUND — animated mesh gradient + grain overlay
   ════════════════════════════════════════════════════════════════ */
function AuroraBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base */}
      <div className="absolute inset-0 bg-white" />
      {/* Animated blobs */}
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
      {/* Grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HERO — animated gradient title + floating product mock
   ════════════════════════════════════════════════════════════════ */
function CountdownTimer() {
  const startRef = useRef(Date.now());
  const [seconds, setSeconds] = useReactState(60);

  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setSeconds(remaining);
      if (remaining === 0) {
        startRef.current = Date.now();
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const r = 26;
  const c = 2 * Math.PI * r;
  const p = seconds / 60;

  return (
    <span className="inline-flex items-center gap-2 align-middle" dir="ltr">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90 shrink-0" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-200/60" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="3"
          className="text-blue-500"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s linear' }}
        />
      </svg>
      <span className="text-5xl font-black text-blue-600 tabular-nums leading-none sm:text-7xl lg:text-8xl">{seconds}</span>
    </span>
  );
}

function Hero({ t }: { t: TFn; onDemoOpen?: () => void }) {
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

/* ════════════════════════════════════════════════════════════════
   DEMO MODAL — interactive product walkthrough
   ════════════════════════════════════════════════════════════════ */
function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useReactState(0);
  const steps = [
    { title: 'سجّل في 30 ثانية', body: 'فقط بريد إلكتروني ورقم جوال. لا بطاقة بنكية، لا تعقيد.' },
    { title: 'اختر ثيمك', body: `${getClaim('themeCount').text}. عدّل الألوان والخطوط كما تريد.` },
    { title: 'أضف منتجاتك', body: 'صور وأوصاف وأسعار. اسحب وأفلت.' },
    { title: 'أطلق متجرك', body: 'فعّل الدفع، انشر، وابدأ البيع.' },
  ];
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="عرض توضيحي للمنصة"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
    >
      <div className="absolute inset-0 bg-text-primary/30 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div className="aurora-modal relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/40 bg-white/95 shadow-2xl">
        <div aria-hidden="true" className="absolute -top-32 -end-32 h-64 w-64 rounded-pill bg-blue-300/40 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 -start-32 h-64 w-64 rounded-pill bg-blue-400/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-pill bg-danger" />
              <span className="h-2 w-2 rounded-pill bg-warning" />
              <span className="h-2 w-2 rounded-pill bg-success" />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-8 py-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600 text-white shadow-xl shadow-blue-500/30">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-text-primary sm:text-3xl">{steps[step].title}</h3>
            <p className="mx-auto mt-3 max-w-md text-base text-text-secondary">{steps[step].body}</p>
            <div className="mt-8 flex items-center justify-center gap-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`الخطوة ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-text-primary' : 'w-2 bg-border hover:bg-text-tertiary'}`}
                />
              ))}
            </div>
            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => step > 0 && setStep(step - 1)}
                disabled={step === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-all hover:border-text-primary disabled:opacity-40"
              >
                السابق
              </button>
              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="aurora-btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white"
                >
                  التالي
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <Link
                  to="/signup?ref=demo-modal"
                  onClick={onClose}
                  className="aurora-btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white"
                >
                  سجّل الآن
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



/* ════════════════════════════════════════════════════════════════
   SCROLL PROGRESS BAR
   ════════════════════════════════════════════════════════════════ */
function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      ref.current.style.transform = `scaleX(${pct / 100})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-700"
      ref={ref}
      style={{ transform: 'scaleX(0)' }}
    />
  );
}

/* ════════════════════════════════════════════════════════════════
   BENTO TESTIMONIALS — varied tile sizes
   ════════════════════════════════════════════════════════════════ */
function Bento({ t }: { t: TFn }) {
  const particles2 = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1.5,
    delay: Math.random() * 8,
    duration: Math.random() * 6 + 6,
  }));
  return (
    <section className="relative bg-white py-16 sm:py-24 overflow-hidden" aria-labelledby="bento-title">
      {/* Subtle background decoration */}
      <div aria-hidden="true" className="absolute -start-32 top-1/4 h-96 w-96 rounded-pill bg-blue-200/20 blur-3xl" />
      <div aria-hidden="true" className="absolute -end-32 bottom-1/4 h-96 w-96 rounded-pill bg-amber-200/20 blur-3xl" />
      {particles2.map((p) => (
        <div
          key={p.id}
          aria-hidden="true"
          className="absolute rounded-pill bg-text-primary/[0.03] aurora-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animation: `auroraFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      {isClaimEnabled('testimonials') && (
      <StoreContainer>
        <div className="mx-auto max-w-2xl text-center">
          <span className="aurora-pill text-xs">{t('landing.bento.eyebrow', 'آراء التجار')}</span>
          <h2 id="bento-title" className="mt-6 text-[36px] font-bold leading-[1.15] tracking-[-0.02em] text-text-primary sm:text-[48px]">
            {t('landing.bento.title', 'أرقام وقصص حقيقية')}
          </h2>
          <p className="mt-6 text-[18px] leading-[1.6] text-text-secondary sm:text-[20px]">
            {t('landing.bento.subtitle', 'تاجرون يبيعون منتجاتهم اليوم عبر Haa')}
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Pride tile: نحن نفخر بتجارنا — full width hero */}
          <article className="relative col-span-1 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 p-7 text-white shadow-xl shadow-amber-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/40 sm:p-9 lg:col-span-3">
            <div aria-hidden="true" className="absolute -end-20 -top-20 h-64 w-64 rounded-pill bg-white/10 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-16 -start-16 h-48 w-48 rounded-pill bg-orange-300/10 blur-2xl" />
            <div className="relative flex flex-col items-center justify-center gap-3 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-eyebrow backdrop-blur-sm">
                <Heart className="h-3 w-3" />
                {t('landing.bento.pride.eyebrow', 'فخر')}
              </div>
              <p className="text-[26px] font-bold leading-[1.3] sm:text-[34px]">
                {t('landing.bento.pride.title', 'نفخر بكل تاجر يختار هاء')}
              </p>
              <p className="max-w-2xl text-[15px] leading-[1.6] text-white/85 sm:text-[17px]">
                {t('landing.bento.pride.desc', 'قصص نجاحهم هي دليلنا أن المتاجر السعودية تستحق منصة تفهم احتياجاتها.')}
              </p>
            </div>
          </article>

          {/* Testimonial 1 — widest, prime spot */}
          <article className="aurora-bento group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-rose-50 to-amber-50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg sm:p-7 lg:col-span-2">
            <div aria-hidden="true" className="pointer-events-none absolute -end-4 -top-4 select-none text-[120px] font-black leading-none text-rose-200/40 sm:text-[160px]">{'"'}</div>
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <Quote className="h-5 w-5 text-rose-400" />
                <blockquote className="mt-3 text-[15px] leading-[1.6] text-text-primary sm:text-base">
                  {t('landing.bento.quote1', 'ربطت بوابة مدى وتابي في نفس اليوم. ما توقعت الموضوع بهالسلاسة.')}
                </blockquote>
              </div>
              <footer className="relative mt-4 flex items-center gap-2.5 border-t border-rose-100 pt-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-gradient-to-br from-rose-500 to-amber-500 text-[14px] font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110">خ</div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">{t('landing.bento.q1name', 'خالد السبيعي')}</div>
                  <div className="text-xs text-text-tertiary">{t('landing.bento.q1role', 'إلكترونيات · الدمام')}</div>
                </div>
              </footer>
            </div>
          </article>

          {/* Testimonial 2 */}
          <article className="aurora-bento group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-cyan-50 to-emerald-50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg sm:p-7">
            <div aria-hidden="true" className="pointer-events-none absolute end-4 top-4 select-none text-[100px] font-black leading-none text-emerald-200/40">{'"'}</div>
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <Quote className="h-5 w-5 text-emerald-500" />
                <blockquote className="mt-3 text-[15px] leading-[1.6] text-text-primary sm:text-base">
                  {t('landing.bento.quote2', 'الثيمات جاهزة وجميلة جدًا. غيّرت الألوان والشعار في أقل من ساعة، بدون أي مساعدة تقنية.')}
                </blockquote>
              </div>
              <footer className="relative mt-4 flex items-center gap-2.5 border-t border-emerald-100 pt-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-gradient-to-br from-cyan-500 to-emerald-500 text-[14px] font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110">ن</div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">{t('landing.bento.q2name', 'نورة العتيبي')}</div>
                  <div className="text-xs text-text-tertiary">{t('landing.bento.q2role', 'علامة أزياء · جدة')}</div>
                </div>
              </footer>
            </div>
          </article>

          {/* Testimonial 3 */}
          <article className="aurora-bento group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg sm:p-7">
            <div aria-hidden="true" className="pointer-events-none absolute end-4 top-4 select-none text-[100px] font-black leading-none text-violet-200/40">{'"'}</div>
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <Quote className="h-5 w-5 text-violet-500" />
                <blockquote className="mt-3 text-[15px] leading-[1.6] text-text-primary sm:text-base">
                  {t('landing.bento.quote3', 'في 3 أيام كان عندي متجر كامل ومنتجاتي تنباع. الدعم بالعربي فرق كبير عن المنصات الأجنبية.')}
                </blockquote>
              </div>
              <footer className="relative mt-4 flex items-center gap-2.5 border-t border-violet-100 pt-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-gradient-to-br from-indigo-500 to-violet-500 text-[14px] font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110">أ</div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">{t('landing.bento.q3name', 'أحمد المالكي')}</div>
                  <div className="text-xs text-text-tertiary">{t('landing.bento.q3role', 'متجر هدايا · الرياض')}</div>
                </div>
              </footer>
            </div>
          </article>

          {/* Testimonial 4 */}
          <article className="aurora-bento group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-sky-50 to-blue-50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg sm:p-7 lg:col-span-2">
            <div aria-hidden="true" className="pointer-events-none absolute -end-4 -top-4 select-none text-[120px] font-black leading-none text-sky-200/40 sm:text-[160px]">{'"'}</div>
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <Quote className="h-5 w-5 text-sky-500" />
                <blockquote className="mt-3 text-[15px] leading-[1.6] text-text-primary sm:text-base">
                  {t('landing.bento.quote4', 'تصدير المنتجات للرياض وجدة صار سهل. هاء وفرت لي وقت التنسيق مع مكاتب الشحن.')}
                </blockquote>
              </div>
              <footer className="relative mt-4 flex items-center gap-2.5 border-t border-sky-100 pt-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-gradient-to-br from-sky-500 to-blue-500 text-[14px] font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110">س</div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">{t('landing.bento.q4name', 'سعد المحيميد')}</div>
                  <div className="text-xs text-text-tertiary">{t('landing.bento.q4role', 'مواد غذائية · القصيم')}</div>
                </div>
              </footer>
            </div>
          </article>

          {/* Testimonial 5 */}
          <article className="aurora-bento group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-pink-50 to-purple-50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg sm:p-7">
            <div aria-hidden="true" className="pointer-events-none absolute end-4 top-4 select-none text-[100px] font-black leading-none text-pink-200/40">{'"'}</div>
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <Quote className="h-5 w-5 text-pink-400" />
                <blockquote className="mt-3 text-[15px] leading-[1.6] text-text-primary sm:text-base">
                  {t('landing.bento.quote5', 'كنت أدفع عمولات 15% في المنصات الثانية. هاء بدون عمولات — هذا اللي خلاني أحول متجري كامل لها.')}
                </blockquote>
              </div>
              <footer className="relative mt-4 flex items-center gap-2.5 border-t border-pink-100 pt-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-gradient-to-br from-pink-500 to-purple-500 text-[14px] font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110">ف</div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">{t('landing.bento.q5name', 'فهد المطيري')}</div>
                  <div className="text-xs text-text-tertiary">{t('landing.bento.q5role', 'عطور ودهون عود · حائل')}</div>
                </div>
              </footer>
            </div>
          </article>

          {/* Testimonial 6 */}
          <article className="aurora-bento group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-teal-50 to-emerald-50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg sm:p-7">
            <div aria-hidden="true" className="pointer-events-none absolute end-4 top-4 select-none text-[100px] font-black leading-none text-teal-200/40">{'"'}</div>
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <Quote className="h-5 w-5 text-teal-500" />
                <blockquote className="mt-3 text-[15px] leading-[1.6] text-text-primary sm:text-base">
                  {t('landing.bento.quote6', 'حطيت منتجاتي وصورتها بالجوال. طلعت أوضح من تصويري الاحترافي السابق!')}
                </blockquote>
              </div>
              <footer className="relative mt-4 flex items-center gap-2.5 border-t border-teal-100 pt-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-gradient-to-br from-teal-500 to-emerald-500 text-[14px] font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110">م</div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">{t('landing.bento.q6name', 'منى الراشد')}</div>
                  <div className="text-xs text-text-tertiary">{t('landing.bento.q6role', 'إكسسوارات · الخبر')}</div>
                </div>
              </footer>
            </div>
          </article>

          {/* Testimonial 7 */}
          <article className="aurora-bento group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-yellow-50 to-amber-50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg sm:p-7">
            <div aria-hidden="true" className="pointer-events-none absolute end-4 top-4 select-none text-[100px] font-black leading-none text-amber-200/40">{'"'}</div>
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <Quote className="h-5 w-5 text-amber-500" />
                <blockquote className="mt-3 text-[15px] leading-[1.6] text-text-primary sm:text-base">
                  {t('landing.bento.quote7', 'وصلتني أول طلبية من خارج المدينة في ثاني يوم. الرقم الموحد والفاتورة الضريبية كل شيء جاهز.')}
                </blockquote>
              </div>
              <footer className="relative mt-4 flex items-center gap-2.5 border-t border-amber-100 pt-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-gradient-to-br from-yellow-500 to-amber-500 text-[14px] font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110">ه</div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">{t('landing.bento.q7name', 'هند الغامدي')}</div>
                  <div className="text-xs text-text-tertiary">{t('landing.bento.q7role', 'منتجات عناية · الطائف')}</div>
                </div>
               </footer>
            </div>
          </article>
        </div>
      </StoreContainer>
      )}
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   BACK TO TOP
   ════════════════════════════════════════════════════════════════ */
function BackToTop() {
  const { t } = useTranslation();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      if (window.scrollY > 600) ref.current.classList.add('opacity-100', 'translate-y-0');
      else ref.current.classList.remove('opacity-100', 'translate-y-0');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t('store.skipToContent', 'العودة للأعلى')}
      className="fixed bottom-6 end-6 z-40 flex h-11 w-11 translate-y-4 items-center justify-center rounded-full border border-white/40 bg-white/70 text-text-primary opacity-0 shadow-lg backdrop-blur-xl transition-all duration-300 hover:bg-white"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { t: i18nT } = useTranslation();
  const t = i18nT as unknown as TFn;
  const [demoOpen, setDemoOpen] = useReactState(false);
  const openDemo = useCallback(() => setDemoOpen(true), []);
  const closeDemo = useCallback(() => setDemoOpen(false), []);
  // Cmd+K / Ctrl+K shortcut for demo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setDemoOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useSEO({
    title: t('landing.metaTitle', 'Haa — أطلق متجرك الإلكتروني خلال دقيقة'),
    description: t(
      'landing.metaDescription',
      'منصة سعودية للتجارة الإلكترونية. ابدأ بيع منتجاتك بثيمات جاهزة، بوابات دفع محلية، ولوحة تحكم كاملة.'
    ),
  });
  return (
    <div id="storefront-scope" className="min-h-screen">
      <AuroraBackground />
      <ScrollProgress />
      <Nav t={t} />
      <main>
        <Reveal><Hero t={t} onDemoOpen={openDemo} /></Reveal>
        <Reveal><AboutSection /></Reveal>
        <Reveal><LiveTicker t={t} /></Reveal>
        <Reveal><Features t={t} /></Reveal>
        <Reveal><HowItWorks t={t} /></Reveal>
        <Reveal><PaymentSection t={t} /></Reveal>
        <Reveal><StorefrontPreview t={t} /></Reveal>
        <Reveal><MockupPreview /></Reveal>
        <Reveal><Bento t={t} /></Reveal>
        <Reveal><Pricing t={t} /></Reveal>
        <Reveal><FinalCTA t={t} /></Reveal>
      </main>
      <Footer t={t} />
      <BackToTop />
      <DemoModal open={demoOpen} onClose={closeDemo} />
    </div>
  );
}
