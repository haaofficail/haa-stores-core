/**
 * Haa Landing Page — Aurora / Glass aesthetic
 * Inspired by Linear, Stripe, Vercel. Apple-grade typography.
 * RTL Arabic, IBM Plex Sans Arabic.
 */
import React, { useEffect, useRef, useState as useReactState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getClaim, isClaimEnabled } from '@/lib/landing-claims';
import {
  ArrowLeft,
  ArrowUp,
  CreditCard,
  ExternalLink,
  Globe,
  Heart,
  MessageCircle,
  MousePointerClick,
  Palette,
  Quote,
  Rocket,
  Search,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Trash2,
  Truck,
  User,
  X,
  Zap,
} from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { usePlatformBrand } from '@/hooks/usePlatformBrand';
import { StoreContainer } from '@/components/ui';
import HeroAIChat from '@/landing/HeroAIChat';
import { isAIPreviewEnabled } from '@/landing/aiChatContent';

type TFn = (key: string, fallback?: string) => string;

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
   NAV — fixed glass header
   ════════════════════════════════════════════════════════════════ */
function Nav({ t }: { t: TFn }) {
  const [logoError, setLogoError] = useReactState(false);
  const { platformLogoUrl } = usePlatformBrand();
  const showLogo = !!platformLogoUrl && !logoError;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-white/60 backdrop-blur-2xl backdrop-saturate-150">
      <StoreContainer className="flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label={t('store.logo', 'الرئيسية')} className="flex items-center gap-2.5">
          {showLogo ? (
            <img key={platformLogoUrl} src={platformLogoUrl!} alt="Haa" className="platform-logo h-12 w-auto" onError={() => setLogoError(true)} />
          ) : (
            <img src="/assets/haa-logo.png" alt="Haa" className="h-12 w-auto" />
          )}
        </Link>

        <nav aria-label={t('store.mainNav', 'التنقل الرئيسي')} className="hidden items-center gap-1 md:flex">
          {[
            { label: t('landing.nav.features', 'الميزات'), href: '#features' },
            { label: t('landing.nav.howItWorks', 'كيف نعمل'), href: '#how' },
            { label: 'تعرف علينا', href: '#about' },
            { label: t('landing.nav.pricing', 'الأسعار'), href: '#pricing' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="min-h-[44px] rounded-full px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-white/60 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {label}
            </a>
          ))}
          <Link
            to="/marketplace"
            className="min-h-[44px] rounded-full px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-white/60 hover:text-text-primary"
          >
            السوق
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login?ref=nav"
            className="hidden min-h-[40px] items-center rounded-full px-3 text-[15px] font-medium text-text-secondary transition-colors hover:text-text-primary sm:inline-flex"
          >
            {t('landing.nav.login', 'تسجيل الدخول')}
          </Link>
          <Link
            to="/signup?ref=nav"
            className="aurora-btn inline-flex h-10 min-h-[40px] items-center gap-2 rounded-full bg-text-primary px-5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 hover:!text-white"
          >
            {t('landing.nav.signup', 'سجّل كتاجر')}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </StoreContainer>
    </header>
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

          {/* AI Preview Chat — replaces the old "شاهد العرض التوضيحي" secondary CTA */}
          {isAIPreviewEnabled() && <HeroAIChat />}

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
   LIVE ACTIVITY TICKER — social proof strip
   ════════════════════════════════════════════════════════════════ */
/* ── Events for the marquee ticker ── */
interface LiveEvent {
  city: string;
  action: string;
  item?: string;
  merchant?: string;
  time: string;
}

const LIVE_EVENTS: LiveEvent[] = [
  /* سجّل كتاجر */
  { city: 'الدمام', action: 'سجّل كتاجر', time: 'الآن', merchant: 'فهد' },
  { city: 'جدة', action: 'سجّل كتاجر', time: 'قبل دقيقة', merchant: 'سارة' },
  { city: 'الرياض', action: 'سجّل كتاجر', time: 'قبل ٣ دقائق', merchant: 'عبدالله' },
  { city: 'مكة', action: 'سجّل كتاجر', time: 'قبل ٥ دقائق', merchant: 'بدر' },
  { city: 'المدينة', action: 'سجّل كتاجر', time: 'قبل ٧ دقائق', merchant: 'حصة' },
  { city: 'الخبر', action: 'سجّل كتاجر', time: 'قبل ١٠ دقائق', merchant: 'ناصر' },
  { city: 'أبها', action: 'سجّل كتاجر', time: 'قبل ١٢ دقيقة', merchant: 'سعد' },
  { city: 'حائل', action: 'سجّل كتاجر', time: 'قبل ١٥ دقيقة', merchant: 'نوف' },
  { city: 'تبوك', action: 'سجّل كتاجر', time: 'قبل ٢٠ دقيقة', merchant: 'ماجد' },
  { city: 'بريدة', action: 'سجّل كتاجر', time: 'قبل ٢٥ دقيقة', merchant: 'عبير' },

  /* أطلق متجره */
  { city: 'الرياض', action: 'أطلق متجره', time: 'الآن', merchant: 'محمد' },
  { city: 'جدة', action: 'أطلق متجره', time: 'الآن', merchant: 'نورة' },
  { city: 'الدمام', action: 'أطلق متجره', time: 'قبل ٣ دقائق', merchant: 'خالد' },
  { city: 'الخبر', action: 'أطلق متجره', time: 'قبل ٨ دقائق', merchant: 'راشد' },
  { city: 'تبوك', action: 'أطلق متجره', time: 'قبل ١١ دقيقة', merchant: 'ماجد' },
  { city: 'بريدة', action: 'أطلق متجره', time: 'قبل ١٤ دقيقة', merchant: 'ليلى' },
  { city: 'الطائف', action: 'أطلق متجره', time: 'قبل ١٨ دقيقة', merchant: 'سلمان' },
  { city: 'الأحساء', action: 'أطلق متجره', time: 'قبل ٢٢ دقيقة', merchant: 'هند' },

  /* باع منتج */
  { city: 'جدة', action: 'باع منتج', item: 'عطر خشب العود', time: 'الآن', merchant: 'أحمد' },
  { city: 'الرياض', action: 'باع منتج', item: 'قهوة سعودية', time: 'قبل دقيقة', merchant: 'منى' },
  { city: 'مكة', action: 'باع منتج', item: 'تمور فاخرة', time: 'قبل ٤ دقائق', merchant: 'هند' },
  { city: 'الدمام', action: 'باع منتج', item: 'بخور عود', time: 'قبل ٦ دقائق', merchant: 'فيصل' },
  { city: 'المدينة', action: 'باع منتج', item: 'ورد طبيعي', time: 'قبل ٩ دقائق', merchant: 'ليلى' },
  { city: 'الأحساء', action: 'باع منتج', item: 'شنطة سفر', time: 'قبل ١٣ دقيقة', merchant: 'نورة' },
  { city: 'ينبع', action: 'باع منتج', item: 'سماعة لاسلكية', time: 'قبل ١٦ دقيقة', merchant: 'ماجد' },
  { city: 'الجبيل', action: 'باع منتج', item: 'سبحة كهرمان', time: 'قبل ١٩ دقيقة', merchant: 'فهد' },
  { city: 'القصيم', action: 'باع منتج', item: 'طقم شاهي', time: 'قبل ٢٢ دقيقة', merchant: 'سارة' },
  { city: 'حفر الباطن', action: 'باع منتج', item: 'دباديب كبيرة', time: 'قبل ٢٥ دقيقة', merchant: 'عبدالله' },
  { city: 'خميس مشيط', action: 'باع منتج', item: 'عطر ورد', time: 'قبل ٢٨ دقيقة', merchant: 'بدر' },
  { city: 'جازان', action: 'باع منتج', item: 'محفظة رجالية', time: 'قبل ٣٢ دقيقة', merchant: 'لينة' },
  { city: 'نجران', action: 'باع منتج', item: 'جاكيت شتوي', time: 'قبل ٣٦ دقيقة', merchant: 'حصة' },
  { city: 'عرعر', action: 'باع منتج', item: 'شموع معطرة', time: 'قبل ٤٢ دقيقة', merchant: 'ناصر' },

  /* حصل على أول طلب */
  { city: 'الرياض', action: 'حصل على أول طلب', time: 'قبل ٣ دقائق', merchant: 'سعد' },
  { city: 'جدة', action: 'حصل على أول طلب', time: 'قبل ٨ دقائق', merchant: 'نوف' },
  { city: 'أبها', action: 'حصل على أول طلب', time: 'قبل ١٦ دقيقة', merchant: 'خالد' },
  { city: 'القطيف', action: 'حصل على أول طلب', time: 'قبل ٢٧ دقيقة', merchant: 'سارة' },

  /* أضاف منتجاً جديداً */
  { city: 'مكة', action: 'أضاف منتجاً جديداً', item: 'ساعة كاجوال', time: 'قبل ٥ دقائق', merchant: 'فيصل' },
  { city: 'الخبر', action: 'أضاف منتجاً جديداً', item: 'كريم عناية', time: 'قبل ٩ دقائق', merchant: 'عبير' },
  { city: 'بريدة', action: 'أضاف منتجاً جديداً', item: 'شموع معطرة', time: 'قبل ١٥ دقيقة', merchant: 'حصة' },
  { city: 'الطائف', action: 'أضاف منتجاً جديداً', item: 'لوحة فنية', time: 'قبل ٢١ دقيقة', merchant: 'نورة' },
  { city: 'حائل', action: 'أضاف منتجاً جديداً', item: 'ساعة كاجوال', time: 'قبل ٢٧ دقيقة', merchant: 'سلمان' },
  { city: 'نجران', action: 'أضاف منتجاً جديداً', item: 'حقيبة جلدية', time: 'قبل ٣٣ دقيقة', merchant: 'راشد' },
  { city: 'الباحة', action: 'أضاف منتجاً جديداً', item: 'دباديب كبيرة', time: 'قبل ٤٠ دقيقة', merchant: 'ماجد' },

  /* فعّل بوابة مدى */
  { city: 'مكة', action: 'فعّل بوابة مدى', time: 'قبل ٥ دقائق', merchant: 'عبدالله' },
  { city: 'ينبع', action: 'فعّل بوابة مدى', time: 'قبل ١٢ دقيقة', merchant: 'ماجد' },
  { city: 'تبوك', action: 'فعّل بوابة مدى', time: 'قبل ٢٠ دقيقة', merchant: 'سعد' },
  { city: 'عرعر', action: 'فعّل بوابة مدى', time: 'قبل ٣٠ دقيقة', merchant: 'ناصر' },
  { city: 'سكاكا', action: 'فعّل بوابة مدى', time: 'قبل ٤٥ دقيقة', merchant: 'بدر' },

  /* فعّل الشحن المدمج */
  { city: 'المدينة', action: 'فعّل الشحن المدمج', time: 'قبل ٧ دقائق', merchant: 'محمد' },
  { city: 'الأحساء', action: 'فعّل الشحن المدمج', time: 'قبل ١٨ دقيقة', merchant: 'هند' },
  { city: 'سكاكا', action: 'فعّل الشحن المدمج', time: 'قبل ٣٥ دقيقة', merchant: 'عبدالله' },
  { city: 'القطيف', action: 'فعّل الشحن المدمج', time: 'قبل ٤٨ دقيقة', merchant: 'ليلى' },

  /* جدّد الباقة السنوية */
  { city: 'الرياض', action: 'جدّد الباقة السنوية', time: 'قبل ١٠ دقائق', merchant: 'أحمد' },
  { city: 'الخبر', action: 'جدّد الباقة السنوية', time: 'قبل ٢٢ دقيقة', merchant: 'نورة' },
  { city: 'جدة', action: 'جدّد الباقة السنوية', time: 'قبل ٣٨ دقيقة', merchant: 'فيصل' },

  /* إنجازات (حقق أول مبيعة / ١٠٠ طلب / مبيعات ١٠ آلاف) */
  { city: 'الرياض', action: 'حقق أول مبيعة', time: 'قبل ٤ دقائق', merchant: 'نوف' },
  { city: 'جدة', action: 'حقق ١٠٠ طلب', time: 'قبل ١١ دقيقة', merchant: 'محمد' },
  { city: 'الدمام', action: 'حقق مبيعات ١٠ آلاف', time: 'قبل ٢٤ دقيقة', merchant: 'أحمد' },
  { city: 'الخبر', action: 'حقق أول مبيعة', time: 'قبل ٣١ دقيقة', merchant: 'عبير' },
  { city: 'حائل', action: 'حقق ١٠٠ طلب', time: 'قبل ٣٩ دقيقة', merchant: 'فهد' },

  /* نال تقييم ٥ نجوم */
  { city: 'جدة', action: 'نال تقييم ٥ نجوم', time: 'قبل ٦ دقائق', merchant: 'سعد' },
  { city: 'مكة', action: 'نال تقييم ٥ نجوم', time: 'قبل ١٧ دقيقة', merchant: 'لينة' },
  { city: 'الطائف', action: 'نال تقييم ٥ نجوم', time: 'قبل ٢٦ دقيقة', merchant: 'خالد' },
  { city: 'أبها', action: 'نال تقييم ٥ نجوم', time: 'قبل ٣٦ دقيقة', merchant: 'فهد' },

  /* انضم للبرنامج الذهبي */
  { city: 'الرياض', action: 'انضم للبرنامج الذهبي', time: 'قبل ١٣ دقيقة', merchant: 'منى' },
  { city: 'جدة', action: 'انضم للبرنامج الذهبي', time: 'قبل ٢٩ دقيقة', merchant: 'خالد' },
  { city: 'حائل', action: 'انضم للبرنامج الذهبي', time: 'قبل ٤٠ دقيقة', merchant: 'سارة' },
  { city: 'الخبر', action: 'انضم للبرنامج الذهبي', time: 'قبل ٥٠ دقيقة', merchant: 'نوف' },

  /* فعّل نطاق مخصص */
  { city: 'الرياض', action: 'فعّل نطاق مخصص', time: 'قبل دقيقتين', merchant: 'راشد' },
  { city: 'الدمام', action: 'فعّل نطاق مخصص', time: 'قبل ٢٣ دقيقة', merchant: 'سلمان' },
  { city: 'ينبع', action: 'فعّل نطاق مخصص', time: 'قبل ٣٤ دقيقة', merchant: 'نوف' },

  /* أصدر أول شحنة */
  { city: 'جدة', action: 'أصدر أول شحنة', item: 'عطر خشب العود', time: 'قبل دقيقة', merchant: 'ماجد' },
  { city: 'الرياض', action: 'أصدر أول شحنة', item: 'ساعة كاجوال', time: 'قبل ١٤ دقيقة', merchant: 'هند' },
  { city: 'المدينة', action: 'أصدر أول شحنة', item: 'حقيبة جلدية', time: 'قبل ٢٨ دقيقة', merchant: 'فيصل' },
  { city: 'الدمام', action: 'أصدر أول شحنة', item: 'قهوة سعودية', time: 'قبل ٤٤ دقيقة', merchant: 'عبير' },
];

function LiveTicker({ t }: { t: TFn }) {
  return (
    <section className="relative py-6 sm:py-8" aria-label="نشاط مباشر">
      <StoreContainer>
        <div className="flex items-center gap-3 overflow-hidden rounded-2xl border border-white/30 bg-white/40 px-4 py-3 shadow-sm backdrop-blur-xl">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {t('landing.ticker.label', 'نشاط مباشر')}
          </span>
          <div className="flex-1 overflow-hidden min-w-0">
            <div className="inline-flex animate-carousel gap-6 shrink-0" style={{ paddingInlineStart: '10px' }}>
              {[...LIVE_EVENTS, ...LIVE_EVENTS].map((e, i) => (
                <span key={i} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{e.merchant} · {e.city}</span>
                  <span>·</span>
                  <span>{e.action}</span>
                  {e.item && (
                    <>
                      <span>·</span>
                      <span className="text-text-tertiary">{e.item}</span>
                    </>
                  )}
                  <span className="text-2xs text-text-tertiary">· {e.time}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </StoreContainer>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   ABOUT — تعرف علينا
   ════════════════════════════════════════════════════════════════ */
function AboutSection() {
  const stats = [
    { num: '١٠٠٠+', label: 'متجر نشط' },
    { num: '٥٠٠٠٠+', label: 'طلب شهريًا' },
    { num: '١٠٠٪', label: 'سعودي ١٠٠٪' },
    { num: 'دقيقة', label: 'وانطلق متجرك' },
  ];
  return (
    <section id="about" className="relative py-16 sm:py-24 overflow-hidden" aria-labelledby="about-title">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -end-16 -top-16 h-80 w-80 rounded-full bg-blue-100/30 blur-3xl" />
        <div className="absolute -start-16 -bottom-16 h-80 w-80 rounded-full bg-emerald-100/20 blur-3xl" />
      </div>
      <StoreContainer>
        <div className="mx-auto max-w-4xl text-center">
          <span className="aurora-pill text-xs">{'منصة سعودية'}</span>
          <h2 id="about-title" className="mt-6 text-[40px] font-bold leading-[1.15] tracking-[-0.03em] text-text-primary sm:text-[52px] lg:text-[64px]">
            {'هاء — متجرك الإلكتروني في دقيقة'}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.7] text-text-secondary sm:text-[19px]">
            {'هاء منصة سعودية ١٠٠٪ تمنح التجار متجرًا إلكترونيًا جاهزًا بالثيمات، بوابات الدفع السعودية (مدى، STC Pay، تابي، تمارا)، وشحن مدمج. لا برمجة، لا تصميم، ولا تعقيدات.'}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {stats.map(({ num, label }) => (
            <div key={label} className="rounded-2xl border border-white/20 bg-white/40 p-5 text-center backdrop-blur-sm sm:p-6">
              <p className="text-[28px] font-bold text-text-primary sm:text-[34px]">{num === 'دقيقة' ? (
                <><span className="text-blue-600">١</span> {num}</>
              ) : num}
              </p>
              <p className="mt-1 text-sm font-medium text-text-secondary">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
          >
            {'اعرف أكثر عن هاء'}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </StoreContainer>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   FEATURES — three glass cards
   ════════════════════════════════════════════════════════════════ */
function Features({ t }: { t: TFn }) {
  // Each card pairs an icon (24px icon inside 56px container) with a 3-step micro-proof
  // structure: outcome stat → feature name → 1-line benefit. Card padding 32px, border-radius 24px.
  const items = [
    {
      id: 'launch',
      icon: Zap,
      stat: '< 60 ثانية',
      title: t('landing.features.launch.title', 'إطلاق فوري'),
      desc: t('landing.features.launch.desc', 'افتح متجرك وأضف أول منتج في أقل من دقيقة. لا فريق تقني، لا انتظار.'),
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/30',
    },
    {
      id: 'themes',
      icon: Palette,
      stat: getClaim('themeCount').text,
      title: t('landing.features.themes.title', 'ثيمات احترافية'),
      desc: t('landing.features.themes.desc', 'صمّمها مصممون محترفون. غيّر الألوان والخطوط بنقرة واحدة بدون لمس الكود.'),
      gradient: 'from-blue-600 to-indigo-700',
      shadow: 'shadow-blue-600/30',
    },
    {
      id: 'payments',
      icon: CreditCard,
      stat: getClaim('zeroCommission').text,
      title: t('landing.features.payments.title', 'دفع سعودي كامل'),
      desc: t('landing.features.payments.desc', 'مدى، Apple Pay، فيزا، ماستركارد، تابي، تمارا. كل البوابات بدون عمولات خفية.'),
      gradient: 'from-blue-400 to-blue-600',
      shadow: 'shadow-blue-500/30',
    },
    {
      id: 'shipping',
      icon: Truck,
      stat: 'شحن مدمج',
      title: t('landing.features.shipping.title', 'شحن وتوصيل'),
      desc: t('landing.features.shipping.desc', 'اربط متجرك بشركات الشحن السعودية. احسب تكلفة التوصيل آليًا وتابع الطلبات.'),
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/30',
    },
  ];
  return (
    // Section padding: 64px mobile, 96px desktop (reduced for better rhythm)
    <section id="features" className="relative bg-white py-16 sm:py-24 scroll-mt-20">
      <StoreContainer>
        <div className="mx-auto max-w-2xl text-center">
          <span className="aurora-pill text-xs">{t('landing.features.eyebrow', 'لماذا Haa؟')}</span>
          <h2 className="mt-6 text-[32px] font-bold leading-[1.15] tracking-[-0.02em] text-text-primary sm:text-[44px]">
            {t('landing.features.title', 'ركّز على منتجاتك، واترك التقنية علينا')}
          </h2>
        </div>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ id, icon: Icon, stat, title, desc, gradient, shadow }) => (
            <li
              key={id}
              className="aurora-card group relative overflow-hidden rounded-2xl border border-white/40 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-white/60 hover:shadow-lg"
            >
              <div aria-hidden="true" className={`absolute -end-16 -top-16 h-48 w-48 rounded-pill bg-gradient-to-br ${gradient} opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40`} />
              <span className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg ${shadow}`}>
                <Icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <div className="relative mt-8 text-sm font-bold uppercase tracking-wider text-blue-600">{stat}</div>
              <h3 className="relative mt-4 text-[18px] font-bold tracking-[-0.01em] text-text-primary">{title}</h3>
              <p className="relative mt-4 text-[15px] leading-[1.6] text-text-secondary">{desc}</p>
            </li>
          ))}
        </ul>
      </StoreContainer>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   PAYMENT SECTION — Saudi payment methods showcase
   ════════════════════════════════════════════════════════════════ */
function PaymentSection(_props: { t: TFn }) {
  const payments = [
    { title: 'بطاقات مدى والمدفوعات الحكومية', desc: 'مدى — شبكة المدفوعات الوطنية. تقبل البطاقات البنكية والمدفوعات الحكومية بالريال السعودي', logos: ['mada.svg'], color: 'from-green-500 to-emerald-600' },
    { title: 'المحافظ الرقمية', desc: 'Apple Pay و STC Pay — أسرع وسيلة دفع بدون لمس بطاقة', logos: ['apple-pay.svg', 'stc-pay.svg'], color: 'from-blue-500 to-indigo-600' },
    { title: 'اشتر الآن وادفع لاحقًا', desc: 'تابي وتمارا — قسّم مشترياتك على 3 دفعات بدون فوائد', logos: ['tabby.svg', 'tamara.svg'], color: 'from-violet-500 to-purple-600' },
    { title: 'بطاقات ائتمانية وتقليدي', desc: 'فيزا وماستركارد — خيارات تناسب الجميع', logos: ['visa.svg', 'mastercard.svg'], color: 'from-amber-500 to-orange-600' },
  ];
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden" aria-labelledby="payment-title">
      <div aria-hidden="true" className="pointer-events-none absolute -end-32 -top-32 h-96 w-96 rounded-pill bg-green-100/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -start-32 -bottom-32 h-96 w-96 rounded-pill bg-emerald-100/30 blur-3xl" />
      <StoreContainer>
        <div className="mx-auto max-w-3xl text-center">
          <span className="aurora-pill text-xs">{'الدفع السعودي'}</span>
          {/* Hero icon - big SAMA ﷷ */}
          <div className="mt-8 flex justify-center">
            <div className="relative flex items-center justify-center">
              <img src="/assets/saudi-riyal-symbol.svg" alt="" className="relative h-32 w-auto sm:h-40 lg:h-48" aria-hidden="true" style={{ filter: 'brightness(0.12) saturate(0.8)' }} />
            </div>
          </div>
          <div className="mt-6">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-text-secondary sm:text-[15px]">{'تقبل الدفع بـ'}</p>
            <p className="mt-1 text-[44px] font-bold leading-[1.1] tracking-[-0.03em] text-text-primary sm:text-[60px] lg:text-[76px]">{'الريال السعودي'}</p>
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-[17px] leading-[1.6] text-text-secondary sm:text-[19px]">
            {'مدى، Apple Pay، فيزا، ماستركارد، STC Pay، تابي، تمارا — كلها تعمل بالريال السعودي بدون عمولات خفية.'}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {payments.map(({ title, desc, logos, color }) => (
            <article
              key={title}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg sm:p-7"
            >
              <div aria-hidden="true" className={`absolute -end-8 -top-8 h-20 w-20 rounded-pill bg-gradient-to-br ${color} opacity-5 blur-xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-15`} />
              <div className={`h-3 w-3 rounded-pill bg-gradient-to-br ${color} opacity-40`} aria-hidden="true" />
              <h3 className="mt-4 text-[15px] font-bold leading-[1.3] text-text-primary sm:text-[16px]">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-text-secondary">{desc}</p>
              <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4 pb-1">
                {logos.map((logo) => (
                  <img key={logo} src={`/assets/payment-logos/${logo}`} alt="" className="w-auto opacity-70 transition-opacity group-hover:opacity-100" loading="lazy" style={{ height: '20px' }} />
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/signup?ref=how-it-works"
            className="group inline-flex min-h-[52px] items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-8 text-[16px] font-bold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:!text-white"
          >
            {'أطلق متجرك بالريال السعودي'}
            <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
          </Link>
        </div>
      </StoreContainer>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   HOW IT WORKS — 4-step process with gradient line
   ════════════════════════════════════════════════════════════════ */
function HowItWorks({ t }: { t: TFn }) {
  // 4 steps with consistent time, icon, title, outcome copy
  const steps = [
    { n: 1, icon: MousePointerClick, time: '30 ثانية', title: t('landing.how.steps.1.title', 'سجّل حسابك'), desc: t('landing.how.steps.1.desc', 'فقط بريد إلكتروني ورقم جوال. بدون بطاقة بنكية.') },
    { n: 2, icon: ShoppingBag, time: '5 دقائق', title: t('landing.how.steps.2.title', 'ارفع منتجاتك'), desc: t('landing.how.steps.2.desc', 'صور، أوصاف، وأسعار. اسحب وأفلت مرة واحدة.') },
    { n: 3, icon: Palette, time: 'دقيقة واحدة', title: t('landing.how.steps.3.title', 'اختر ثيمك'), desc: t('landing.how.steps.3.desc', `${getClaim('themeCount').text}. عدّل الألوان والخطوط بنقرة واحدة.`) },
    { n: 4, icon: Rocket, time: 'فوري', title: t('landing.how.steps.4.title', 'أطلق متجرك'), desc: t('landing.how.steps.4.desc', 'فعّل بوابة الدفع وانشر متجرك على نطاقك.') },
  ];
  return (
    <section id="how" className="relative py-16 sm:py-24 scroll-mt-20">
      <StoreContainer>
        <div className="mx-auto max-w-2xl text-center">
          <span className="aurora-pill text-xs">{t('landing.how.eyebrow', 'كيف نعمل')}</span>
          {/* H2: 36/48/60 — section title scale */}
          <h2 className="mt-6 text-[36px] font-bold leading-[1.15] tracking-[-0.02em] text-text-primary sm:text-[48px]">
            {t('landing.how.title', '4 خطوات فقط، ومتجرك شغّال')}
          </h2>
          {/* Sub: 19px line-height 1.6 */}
            <p className="mt-6 text-[18px] leading-[1.6] text-text-secondary sm:text-[20px]">
              {t('landing.how.subtitle', 'ما تحتاج أي خبرة تقنية. كل شيء بالعربي، وكل خطوة تستغرق أقل من 5 دقائق.')}
            </p>
        </div>
        {/* Grid: 1 col mobile, 2 col tablet, 4 col desktop. gap 24px → 16px on lg (tighter when 4 cols). */}
        <ol className="relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {/* Connector line: 1px height, position top-10 (40px) = middle of 80px icon containers */}
          <div aria-hidden="true" className="pointer-events-none absolute top-10 right-[12.5%] left-[12.5%] hidden h-px lg:block">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
          </div>
          {steps.map(({ n, icon: Icon, time, title, desc }, idx) => {
            const isFinal = n === 4;
            return (
              <li
                key={n}
                className="group relative rounded-2xl border border-white/30 bg-white/40 p-6 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-white/60 hover:bg-white/70 hover:shadow-xl sm:p-8"
                style={{ animationDelay: `${0.08 * idx}s` }}
              >
                {/* Step number */}
                <span aria-hidden="true" className="pointer-events-none absolute -top-1 end-2 select-none text-[40px] font-black leading-none text-text-primary/[0.06]">
                  0{n}
                </span>
                {/* Icon container: 80px square, 16px radius */}
                <div
                  className={`relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-500 group-hover:-translate-y-1 ${
                    isFinal
                      ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600 text-white shadow-xl shadow-blue-500/40 ring-4 ring-blue-100'
                      : 'bg-white text-text-primary shadow-lg ring-1 ring-border-subtle group-hover:shadow-xl group-hover:ring-blue-200'
                  }`}
                >
                  {/* Icon: 36px (4.5 × 8 = 36), 1.75 stroke (slightly thicker for legibility at this size) */}
                  <Icon className="h-9 w-9" strokeWidth={1.75} />
                </div>
                {/* Time tag: 12px, tight, slate-500 */}
                <div className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium text-text-tertiary">
                  <span className="h-1 w-1 rounded-pill bg-text-tertiary" />
                  <span>{time}</span>
                </div>
                {/* H3: 18px → 20px, tight tracking */}
                <h3 className={`text-[18px] font-bold tracking-[-0.01em] sm:text-[20px] ${isFinal ? 'bg-gradient-to-br from-blue-600 to-indigo-700 bg-clip-text text-transparent' : 'text-text-primary'}`}>
                  {title}
                </h3>
                {/* Body: 14px → 15px, line-height 1.6 */}
                <p className="mt-2 text-[15px] leading-[1.6] text-text-secondary sm:text-base">{desc}</p>
                {isFinal && (
                  <span className="absolute -top-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white shadow-lg shadow-blue-500/40">
                    <Sparkles className="h-3 w-3" />
                    {t('landing.how.outcome', 'النتيجة')}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </StoreContainer>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   STOREFRONT PREVIEW — live storefront mockup inside MacBook frame
   ════════════════════════════════════════════════════════════════ */

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  category: string;
  description: string;
  rating: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const MOCK_CATEGORIES: { id: number; name: string; image: string; count: string }[] = [
  { id: 1, name: 'إلكترونيات', image: 'https://picsum.photos/seed/electronics/400/300', count: '٢٤ منتج' },
  { id: 2, name: 'أزياء', image: 'https://picsum.photos/seed/fashion/400/300', count: '١٨ منتج' },
  { id: 3, name: 'إكسسوارات', image: 'https://picsum.photos/seed/accessories/400/300', count: '٣١ منتج' },
  { id: 4, name: 'العناية', image: 'https://picsum.photos/seed/beauty/400/300', count: '١٥ منتج' },
];

const PRODUCT_BADGES = ['', 'جديد', 'خصم 20%', 'مخزون محدود', 'مميز', 'الأكثر مبيعًا'];

const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: 'سماعة لاسلكية', price: '١٩٩ ر.س', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', category: 'إلكترونيات', description: 'سماعة بلوتوث لاسلكية أنيقة.', rating: 5 },
  { id: 2, name: 'عطر نسائي', price: '٨٦٥ ر.س', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop', category: 'عطور', description: 'عطر نسائي فاخر برائحة الأزهار.', rating: 5 },
  { id: 3, name: 'ساعة كاجوال', price: '٥٤٩ ر.س', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop', category: 'إكسسوارات', description: 'ساعة كاجوال بتصميم عصري أنيق.', rating: 4 },
  { id: 4, name: 'حقيبة قوتشي', price: '٩٥٠ ر.س', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop', category: 'أزياء', description: 'حقيبة قوتشي جلدية فاخرة.', rating: 5 },
  { id: 5, name: 'عطر فرنسي', price: '٥٤٩ ر.س', image: 'https://picsum.photos/seed/perfume/400/400', category: 'العناية', description: 'عطر خشبي مع مسك العنبر. يدوم ١٢ ساعة.', rating: 5 },
  { id: 6, name: 'محفظة رجالية', price: '٢٥٠ ر.س', image: 'https://picsum.photos/seed/wallet-clutch/400/400', category: 'إكسسوارات', description: 'محفظة جلد فاخرة بتصميم عصري أنيق.', rating: 4 },
  { id: 7, name: 'سوار ذهبي', price: '١,٢٩٩ ر.س', image: 'https://picsum.photos/seed/bracelet/400/400', category: 'إكسسوارات', description: 'سوار من الذهب عيار ٢١ مع فصوص زركون.', rating: 5 },
  { id: 8, name: 'كريم ترطيب فاخر', price: '١٨٩ ر.س', image: 'https://picsum.photos/seed/skincare/400/400', category: 'العناية', description: 'كريم ترطيب بخلاصة الصبار وزبدة الشيا.', rating: 4 },
];
/* ════════════════════════════════════════════════════════════════
   STOREFRONT COMPONENTS — header, hero, categories, products, cart, footer
   ════════════════════════════════════════════════════════════════ */

function StoreHeader({ cartCount, onCartClick, t }: { cartCount: number; onCartClick: () => void; t: TFn }) {
  return (
    <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-neutral-100">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 text-[10px] font-medium text-neutral-500">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm border border-neutral-400 relative">
            <span className="absolute inset-x-0.5 top-0.5 h-1 rounded-sm bg-neutral-400" />
          </span>
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 11v2M10 11v2M14 11v2M18 11v2" stroke="currentColor" strokeWidth="1.5"/></svg>
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none"><path d="M12 2L12 22M12 2L8 6M12 2L16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 h-12">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shadow-md">هـ</div>
          <span className="text-sm font-bold text-neutral-900">متجر الهدايا</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" aria-label={t('landing.demoSearch', 'بحث في المتجر')} className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
            <Search className="h-4 w-4" />
          </button>
          <button type="button" aria-label={t('landing.demoCart', 'السلة')} onClick={onCartClick} className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-blue-500 text-white text-[8px] font-bold flex items-center justify-center ring-2 ring-white">
                {cartCount > 9 ? '٩+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function StoreHero() {
  return (
    <div className="relative bg-gradient-to-br from-amber-50 via-white to-orange-50 overflow-hidden">
      <div className="flex flex-col items-center px-4 py-6 gap-4 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1">
          <Truck className="h-3 w-3 text-green-600" />
          <span className="text-[10px] font-semibold text-green-700">توصيل في نفس اليوم</span>
        </div>
        <div>
          <h3 className="text-xl font-black text-neutral-900 leading-tight">متجر الهدايا</h3>
          <p className="text-xs text-neutral-500 mt-1">أفكار هدايا مميزة بأسعار مناسبة</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-neutral-600">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            <span>٤.٨</span>
          </div>
          <span className="text-neutral-300">|</span>
          <span>٢٬٤٣١ تقييم</span>
          <span className="text-neutral-300">|</span>
          <span>توصيل لـ الرياض وجدة</span>
        </div>
      </div>
    </div>
  );
}

function StoreCategories() {
  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-black text-neutral-900">الأكثر مبيعًا</h4>
        <span className="text-[10px] text-blue-600 font-semibold cursor-pointer">عرض الكل</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {MOCK_CATEGORIES.slice(0, 4).map((cat) => (
          <div key={cat.id} className="flex flex-col items-center gap-1.5 cursor-pointer group">
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-neutral-50 ring-1 ring-neutral-100 group-hover:ring-2 group-hover:ring-blue-200 transition-all">
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            </div>
            <span className="text-[9px] font-semibold text-neutral-700 text-center leading-tight">{cat.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const BADGE_STYLES: Record<string, string> = {
  'جديد': 'bg-blue-500 text-white',
  'خصم 20%': 'bg-red-500 text-white',
  'مخزون محدود': 'bg-amber-500 text-white',
  'مميز': 'bg-purple-500 text-white',
  'الأكثر مبيعًا': 'bg-emerald-500 text-white',
};

const PRODUCT_BADGE_MAP: Record<number, string> = { 1: '', 2: 'جديد', 3: 'خصم 20%', 4: 'مخزون محدود' };

function StoreProductCard({ product, onAddToCart, onClick }: { product: Product; onAddToCart: (p: Product) => void; onClick: (p: Product) => void }) {
  const badge = PRODUCT_BADGE_MAP[product.id] ?? PRODUCT_BADGES[product.id % PRODUCT_BADGES.length];
  return (
    <div className="group cursor-pointer" onClick={() => onClick(product)}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100 mb-2 shadow-sm group-hover:shadow-lg transition-shadow">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        {badge && (
          <span className={`absolute top-2 start-2 px-2 py-0.5 rounded-full text-[8px] font-bold ${BADGE_STYLES[badge] || 'bg-neutral-800 text-white'}`}>
            {badge}
          </span>
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
          className="absolute bottom-2 end-2 min-h-[32px] min-w-[32px] rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-neutral-700 hover:bg-blue-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
        </button>
      </div>
      <h4 className="text-[11px] font-semibold text-neutral-900 leading-tight line-clamp-1">{product.name}</h4>
      <p className="text-[11px] font-black text-neutral-900 mt-0.5">{product.price}</p>
    </div>
  );
}

function StoreProducts({ onAddToCart, onProductClick }: { onAddToCart: (p: Product) => void; onProductClick: (p: Product) => void }) {
  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-black text-neutral-900">مجموعة هدايا فاخرة</h4>
        <span className="text-[10px] text-blue-600 font-semibold cursor-pointer">عرض الكل</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {MOCK_PRODUCTS.slice(0, 4).map((p) => (
          <StoreProductCard key={p.id} product={p} onAddToCart={onAddToCart} onClick={onProductClick} />
        ))}
      </div>
    </section>
  );
}

function StoreProductModal({ product, onClose, onAddToCart, t }: { product: Product; onClose: () => void; onAddToCart: (p: Product) => void; t: TFn }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl mx-4 max-w-sm w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label={t('common.close', 'إغلاق')} onClick={onClose} className="absolute top-3 end-3 z-10 min-h-[32px] min-w-[32px] rounded-full bg-white/90 shadow flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-colors">
          <X className="h-4 w-4" />
        </button>
        <div className="aspect-square bg-neutral-100">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-1 mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3 w-3 ${i < product.rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-200'}`} />
            ))}
          </div>
          <h3 className="text-lg font-bold text-neutral-900">{product.name}</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{product.description}</p>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-100">
            <span className="text-xl font-black text-neutral-900">{product.price}</span>
            <button type="button" onClick={() => { onAddToCart(product); onClose(); }}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-5 text-sm font-bold text-white shadow-lg hover:scale-[1.02] transition-transform"
            >
              <ShoppingCart className="h-4 w-4" />أضف للسلة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoreCartDrawer({ items, onClose, onRemove, total }: { items: CartItem[]; onClose: () => void; onRemove: (product: Product) => void; total: string }) {
  return (
    <div className="absolute inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="relative bg-white w-72 h-full shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="سلة التسوق">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <h3 className="text-sm font-bold text-neutral-900">سلة التسوق ({items.length})</h3>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">السلة فارغة</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 px-4">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="w-12 h-12 rounded-xl object-cover bg-neutral-100 shrink-0 overflow-hidden">
                    <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 truncate">{item.product.name}</p>
                    <p className="text-[11px] font-bold text-neutral-700 mt-0.5">{item.product.price}</p>
                    <p className="text-[10px] text-neutral-400">الكمية: {item.quantity}</p>
                  </div>
                  <button type="button" onClick={() => onRemove(item.product)} className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-neutral-100 px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-neutral-500">الإجمالي</span>
                <span className="text-sm font-black text-neutral-900">{total}</span>
              </div>
              <button type="button" className="w-full min-h-[44px] rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                إتمام الشراء <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StoreBottomNav() {
  const tabs = [
    { icon: Store, label: 'الرئيسية', active: true },
    { icon: Search, label: 'بحث', active: false },
    { icon: ShoppingCart, label: 'السلة', active: false },
    { icon: User, label: 'حسابي', active: false },
  ];
  return (
    <nav className="bg-white border-t border-neutral-100">
      <div className="flex items-center justify-around h-[52px] px-1">
        {tabs.map(({ icon: Icon, label, active }) => (
          <button key={label} type="button" className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] h-full">
            <div className={`flex items-center justify-center rounded-xl transition-all duration-200 ${active ? 'bg-blue-50' : ''}`} style={{ padding: '4px 10px' }}>
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-blue-600' : 'text-neutral-400'}`} strokeWidth={active ? 2.5 : 1.5} />
            </div>
            <span className={`text-[10px] font-semibold leading-none ${active ? 'text-blue-600' : 'text-neutral-400'}`}>{label}</span>
          </button>
        ))}
      </div>
      {/* Home indicator */}
      <div className="flex justify-center pb-[6px]">
        <div className="h-[5px] w-[36px] rounded-full bg-neutral-300" />
      </div>
    </nav>
  );
}

function StoreFooter() {
  return (
    <div className="px-4 py-4 text-center">
      <p className="text-[9px] text-neutral-400">© 2026 متجر هاء</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MOCKUP PREVIEW — full-width image mockup section
   ════════════════════════════════════════════════════════════════ */
function AnimatedCounter({ value, prefix, suffix }: { value: number; prefix: string; suffix: string }) {
  const [count, setCount] = useReactState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !done.current) {
          done.current = true;
          obs.disconnect();
          const duration = 1000;
          const start = performance.now();
          const animate = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const p = 1 - Math.pow(1 - t, 3);
            setCount(Math.round(p * value));
            if (t < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);
  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

function MockupPreview() {
  const benefits = [
    { prefix: '< ', value: 60, suffix: ' ثانية', desc: 'إطلاق فوري' },
    { prefix: '', value: getClaim('themeCount').text, suffix: '', desc: 'ثيمات احترافية' },
    { prefix: '', value: getClaim('zeroCommission').text, suffix: '', desc: 'دفع سعودي كامل' },
  ];
  return (
    <section className="relative py-16 sm:py-24 scroll-mt-20">
      <StoreContainer>
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Image — right side */}
          <div className="flex-1 flex justify-center lg:justify-start">
            <Link to="/s/demo" className="block w-full max-w-2xl transition-opacity hover:opacity-90">
              <img
                src="/mockup-preview.png"
                alt="معاينة المتجر"
                className="w-full h-auto"
                loading="lazy"
              />
            </Link>
          </div>
          {/* Content — left side */}
          <div className="flex-1 text-center lg:text-start">
            <span className="aurora-pill text-xs">{'لماذا Haa؟'}</span>
            <h2 className="mt-6 text-[36px] font-bold leading-[1.15] tracking-[-0.02em] text-text-primary sm:text-[48px]">
              {'كل ما تحتاجه في منصة واحدة'}
            </h2>
            <p className="mt-6 text-[18px] leading-[1.6] text-text-secondary sm:text-[20px]">
              {'منصة متكاملة تدير متجرك من البداية للنهاية. بدون أكواد، بدون عمولات، بدون تعقيد.'}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {benefits.map(({ prefix, value, suffix, desc }, idx) => {
                const gradients = [
                  'from-blue-500 to-indigo-500',
                  'from-violet-500 to-purple-600',
                  'from-emerald-500 to-teal-500',
                ];
                const icons = [Zap, Palette, CreditCard];
                const Icon = icons[idx];
                return (
                  <div
                    key={prefix + suffix}
                    className="group relative overflow-hidden rounded-3xl border border-white/50 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-white/60 hover:shadow-xl"
                    style={{
                      opacity: 0,
                      animation: `fadeSlideUp 0.6s ease-out ${0.15 * idx}s forwards`,
                    }}
                  >
                    <div aria-hidden="true" className={`absolute -end-10 -top-10 h-28 w-28 rounded-pill bg-gradient-to-br ${gradients[idx]} opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-25`} />
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradients[idx]} text-white shadow-lg`}>
                      <Icon className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <div className="mt-4 text-2xl font-bold tracking-[-0.01em] text-text-primary">
                      {typeof value === 'number' && value > 0 ? (
                        <AnimatedCounter prefix={prefix} value={value} suffix={suffix} />
                      ) : (
                        <span>{prefix}{value}{suffix}</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm font-medium text-text-secondary">{desc}</div>
                  </div>
                );
              })}
            </div>
            <style>{`
              @keyframes fadeSlideUp {
                from { opacity: 0; transform: translateY(12px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/signup?ref=mockup-cta"
                className="min-h-[52px] inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-8 text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:scale-[1.02] hover:text-white transition-transform"
              >
                {'ابدأ مجانًا'}
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/s/demo"
                className="min-h-[52px] inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/50 px-6 text-base font-semibold text-text-secondary shadow-sm backdrop-blur-sm hover:scale-[1.02] hover:text-text-primary transition-transform"
              >
                {'شاهد متجرًا حقيقيًا'}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </StoreContainer>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   STOREFRONT PREVIEW — live storefront mockup inside MacBook frame
   ════════════════════════════════════════════════════════════════ */
function StorefrontPreview({ t }: { t: TFn }) {
  const [cartItems, setCartItems] = useReactState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useReactState(false);
  const [selectedProduct, setSelectedProduct] = useReactState<Product | null>(null);

  const addToCart = useCallback((product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((product: Product) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== product.id));
  }, []);

  const total = useMemo(() => {
    const sum = cartItems.reduce((acc, item) => {
      const price = parseInt(item.product.price.replace(/[^\d]/g, ''), 10);
      return acc + price * item.quantity;
    }, 0);
    return sum.toLocaleString('ar-SA') + ' ر.س';
  }, [cartItems]);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <section id="storefront-preview" className="relative overflow-hidden bg-white py-16 sm:py-24 scroll-mt-20">
      <StoreContainer className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <span className="aurora-pill text-xs">{t('landing.store.eyebrow', 'المتجر الإلكتروني')}</span>
          <h2 className="mt-6 text-[36px] font-bold leading-[1.15] tracking-[-0.02em] text-text-primary sm:text-[48px]">
            {t('landing.store.title', 'متجر يعمل بهذا الشكل')}
          </h2>
          <p className="mt-6 text-[18px] leading-[1.6] text-text-secondary sm:text-[20px]">
            {t('landing.store.subtitle', 'تصميم عصري، تجربة سلسة، جاهز للبيع.')}
          </p>
        </div>

        {/* iPhone device frame — clean CSS */}
        <div className="relative mt-16 mx-auto w-[250px]">
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 bg-blue-300/30 blur-[80px]" />
          <div className="relative">
            {/* Shadow */}
            <div aria-hidden="true" className="absolute -bottom-[6%] left-1/2 z-0 h-[10%] w-[75%] -translate-x-1/2 rounded-full bg-black/10 blur-[16px]" />

            {/* Phone body */}
            <div className="relative overflow-hidden rounded-[40px] border-[3px] border-neutral-300 bg-neutral-100 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_48px_-12px_rgba(0,0,0,0.2)]">
              {/* Screen */}
              <div className="overflow-hidden rounded-[34px] bg-white flex flex-col" dir="rtl" style={{ aspectRatio: '9/19.5' }}>
                <div className="flex-1 overflow-y-auto">
                  <StoreHeader cartCount={cartCount} onCartClick={() => setCartOpen(true)} t={t} />
                  <StoreHero />
                  <StoreCategories />
                  <StoreProducts onAddToCart={addToCart} onProductClick={setSelectedProduct} />
                  <StoreFooter />
                </div>
                <StoreBottomNav />
                {selectedProduct && (
                  <StoreProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={addToCart} t={t} />
                )}
                {cartOpen && (
                  <StoreCartDrawer items={cartItems} onClose={() => setCartOpen(false)} onRemove={removeFromCart} total={total} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
              to="/signup?ref=store-preview"
              className="aurora-btn-primary group inline-flex h-14 min-h-[56px] items-center justify-center gap-2 rounded-full px-8 text-[17px] font-semibold text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:!text-white"
            >
              {t('landing.store.cta', 'ابدأ مجانًا — وأطلق متجرك الآن')}
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
          </Link>
        </div>
      </StoreContainer>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   PRICING — 3 tiers with Pro highlighted
   ════════════════════════════════════════════════════════════════ */
function Pricing({ t }: { t: TFn }) {
  const [yearly, setYearly] = useReactState(false);
  // Plan data follows the Apple "3 tier with middle highlighted" pattern.
  // Pro plan has graduated monthly/yearly to encourage annual commitment.
  const plans = [
    { key: 'free', name: t('landing.pricing.free.name', 'مجاني'), price: '0', period: '', desc: t('landing.pricing.free.desc', 'للتجار الذين يبدأون رحلتهم بميزانية محدودة.'), highlight: false, cta: t('landing.pricing.free.cta', 'ابدأ مجانًا') },
    {
      key: 'pro',
      name: t('landing.pricing.pro.name', 'احترافي'),
      monthly: '199',
      yearly: '169',
      period: t('landing.pricing.perMonth', '/شهريًا'),
      desc: t('landing.pricing.pro.desc', 'للتجار الذين يريدون التوسّع بثقة.'),
      highlight: true,
      cta: t('landing.pricing.pro.cta', 'ابدأ تجربة 14 يوم'),
    },
    { key: 'enterprise', name: t('landing.pricing.ent.name', 'مؤسسي'), price: t('landing.pricing.ent.price', 'تواصل'), period: '', desc: t('landing.pricing.ent.desc', 'للفِرَق والعلامات الكبيرة باحتياجات مخصصة.'), highlight: false, cta: t('landing.pricing.ent.cta', 'تواصل مع المبيعات') },
  ];
  return (
    <section id="pricing" className="relative py-16 sm:py-24 scroll-mt-20">
      <StoreContainer>
        <div className="mx-auto max-w-2xl text-center">
          <span className="aurora-pill text-xs">{t('landing.pricing.eyebrow', 'الأسعار')}</span>
          {/* H2 scale: 36/48/60 */}
          <h2 className="mt-6 text-[36px] font-bold leading-[1.15] tracking-[-0.02em] text-text-primary sm:text-[48px]">
            {t('landing.pricing.title', 'باقات تناسب كل تاجر')}
          </h2>
            <p className="mt-6 text-[18px] leading-[1.6] text-text-secondary sm:text-[20px]">
              {t('landing.pricing.subtitle', 'ابدأ مجانًا، وكبّر متجرك مع نمو أعمالك. بدون مفاجآت.')}
            </p>

          {/* Glass billing toggle: 40px height buttons, 14px font */}
          <div role="group" aria-label="اختر دورة الفوترة" className="mt-8 inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/60 p-1 shadow-sm backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setYearly(false)}
              aria-pressed={!yearly}
              className={`min-h-[40px] rounded-full px-5 py-1.5 text-sm font-semibold transition-all duration-300 ${!yearly ? 'bg-text-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {t('landing.pricing.monthly', 'شهريًا')}
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              aria-pressed={yearly}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-5 py-1.5 text-sm font-semibold transition-all duration-300 ${yearly ? 'bg-text-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {t('landing.pricing.yearly', 'سنويًا')}
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${yearly ? 'bg-white text-text-primary' : 'bg-success-soft text-success-text'}`}>
                {t('landing.pricing.save', 'وفّر 15%')}
              </span>
            </button>
          </div>
        </div>
        {/* Grid: 1 col mobile, 3 col desktop. gap 24px. */}
        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((p) => {
            const { key, name, desc, highlight, cta } = p;
            const price = 'price' in p ? p.price : (yearly ? p.yearly : p.monthly);
            const period = p.period;
            return (
              // Card: 32px padding, 24px radius, layered shadow. Pro card has 2px border (visual lift).
              <li
                key={key}
                className={`aurora-card relative overflow-hidden rounded-3xl p-8 transition-all duration-500 hover:-translate-y-2 sm:p-10 ${
                  highlight
                    ? 'border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-2xl shadow-blue-500/20'
                    : 'border border-white/40 bg-white/70 backdrop-blur-xl hover:shadow-xl'
                }`}
              >
                {highlight && (
                  <span className="absolute top-6 end-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white shadow-lg">
                    <Sparkles className="h-3 w-3" />
                    {t('landing.pricing.popular', 'الأكثر شيوعًا')}
                  </span>
                )}
                {/* Plan name: 11px font-bold uppercase tracking-[0.12em] — eyebrow style */}
                <div className="text-xs font-bold uppercase tracking-eyebrow text-text-tertiary">{name}</div>
                {/* Price: 56px font-black (Linear convention for hero price)
                    If highlight, gradient text; otherwise slate-900 */}
                <div className="mt-5 flex items-baseline gap-1">
                  <span className={`text-[56px] font-black leading-none tracking-[-0.04em] ${highlight ? 'aurora-text-gradient' : 'text-text-primary'}`}>{price}</span>
                  {period &&               <span className="text-sm font-medium text-text-tertiary">{period}</span>}
                </div>
                {/* Description: 15px line-height 1.6 */}
                <p className="mt-4 text-base leading-[1.6] text-text-secondary">{desc}</p>
                {/* Feature highlights */}
                <ul className="mt-5 space-y-2 text-sm text-text-secondary">
                  {(key === 'free'
                    ? ['متجر كامل', 'منتجات غير محدودة', 'دعم بالبريد']
                    : key === 'pro'
                    ? ['متجر كامل', 'ثيمات جاهزة', 'دفع وشحن', 'دعم عربي']
                    : ['كل المميزات', 'دعم مخصص', 'استضافة خاصة']
                  ).map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {/* CTA: 48px height, 17px font-semibold, 28px horizontal padding, 100% width on mobile, full */}
                <Link
                  to={key === 'enterprise' ? '/contact' : '/signup' + (key === 'pro' ? '?plan=pro' : '')}
                  className={`mt-8 inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-full text-base font-semibold transition-all ${
                    highlight
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:scale-[1.02] hover:shadow-xl hover:!text-white'
                      : 'border border-border bg-surface text-text-primary hover:border-text-primary'
                  }`}
                >
                  {cta}
                </Link>
                {/* Trust microcopy under CTA */}
                <p className="mt-3 text-center text-[12px] text-text-tertiary">
                  {highlight ? 'بدون بطاقة بنكية · إلغاء في أي وقت' : `${getClaim('freeForever').text} · لا حاجة لبطاقة`}
                </p>
              </li>
            );
          })}
        </ul>
      </StoreContainer>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   COUNT UP — animated number on scroll into view (Counter variant)
   NOTE: Counter is no longer used — `AnimatedCounter` below is the active
   implementation. Removed the dead `Counter` to satisfy TS6133.
   ════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════
   FINAL CTA — full-bleed glassy gradient
   ════════════════════════════════════════════════════════════════ */
function HighlightNumbers({ text, size = 'inherit' }: { text: string; size?: string }) {
  const parts = text.split(/(\d[\d,]*\+?)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\d[\d,]*\+?$/.test(part)
          ? <span key={i} className={`inline-block bg-gradient-to-br from-amber-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(251,191,36,0.4)] ${size}`}>{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

function FinalCTA({ t }: { t: TFn }) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 8,
    duration: Math.random() * 6 + 6,
  }));
  return (
    <section className="relative py-16 sm:py-24">
      <StoreContainer>
        <div className="aurora-cta relative overflow-hidden rounded-[2.5rem] px-6 py-16 text-center shadow-2xl sm:px-12 sm:py-20">
          {/* Animated gradient orbs */}
          <div aria-hidden="true" className="absolute -end-32 -top-32 h-96 w-96 rounded-pill bg-blue-400/40 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
          <div aria-hidden="true" className="absolute -bottom-32 -start-32 h-96 w-96 rounded-pill bg-indigo-400/30 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-violet-400/20 blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
          {/* Floating particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              aria-hidden="true"
              className="absolute rounded-pill bg-white/20 aurora-float"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                animation: `auroraFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}
          <div aria-hidden="true" className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
          <div className="relative mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-eyebrow text-white/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-pill bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)] animate-pulse" />
              {t('landing.finalCta.eyebrow', 'جاهز تبدأ؟')}
            </span>
            <h2 className="mt-7 leading-[1.15] tracking-[-0.03em]">
              <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-0">
                <span className="text-[32px] font-bold text-white/90 sm:text-[40px] lg:text-[48px]">{'انضم لـ'}</span>
                <span className="text-[72px] font-extrabold bg-gradient-to-br from-amber-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(251,191,36,0.5)] sm:text-[96px] lg:text-[120px] xl:text-[140px]">
                  {getClaim('merchantCount').text || 'مجتمع Haa'}
                </span>
                <span className="text-[32px] font-bold text-white/90 sm:text-[40px] lg:text-[48px]">
                  {getClaim('merchantCount').status === 'verified' ? 'تاجر سعودي' : 'من التجار'}
                </span>
              </div>
              <div className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-white/70 sm:text-[28px] lg:text-[32px]">
                {getClaim('merchantCount').status === 'verified' ? 'يبيعون على Haa اليوم' : 'وابدأ تجارتك الإلكترونية'}
              </div>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[18px] leading-[1.6] text-white/85 sm:text-[20px]">
              <HighlightNumbers text={t('landing.finalCta.subtitle', 'سجّل كتاجر مجانًا. لا حاجة لبطاقة بنكية. ألغِ في أي وقت بدون أسئلة.')} size="text-[1.15em]" />
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                to="/signup?ref=final-cta"
                className="group inline-flex h-14 min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-white px-8 text-[17px] font-semibold text-blue-700 shadow-xl transition-all duration-300 hover:scale-[1.04] hover:shadow-2xl sm:w-auto"
              >
                {t('landing.finalCta.primaryCta', 'سجّل كتاجر — مجانًا')}
                <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </Link>
              <Link
                to="/contact"
                className="group inline-flex h-14 min-h-[56px] w-full items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 text-[17px] font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:scale-[1.04] hover:bg-white/20 hover:!text-white sm:w-auto"
              >
                <MessageCircle className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                {t('landing.finalCta.secondaryCta', 'تواصل مع المبيعات')}
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-white/80">
              <li className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white">
                <CreditCard className="h-4 w-4 text-amber-300" />
                {t('landing.finalCta.g1', getClaim('zeroCommission').text)}
              </li>
              <li className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white">
                <Globe className="h-4 w-4 text-blue-300" />
                {t('landing.finalCta.g2', 'دومين فرعي مجاني')}
              </li>
              <li className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white">
                <Rocket className="h-4 w-4 text-indigo-300" />
                <HighlightNumbers text={t('landing.finalCta.g3', 'إعداد في 60 ثانية')} size="text-[1.1em]" />
              </li>
            </ul>
          </div>
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
   FOOTER — minimal glass with Saudi identity
   ════════════════════════════════════════════════════════════════ */
function Footer({ t }: { t: TFn }) {
  const [logoError, setLogoError] = useReactState(false);
  const { platformLogoUrl } = usePlatformBrand();
  const showLogo = !!platformLogoUrl && !logoError;

  return (
    <footer className="border-t border-white/10 bg-white/40 py-8 backdrop-blur-xl sm:py-10">
      <StoreContainer>
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Brand badge */}
          <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5">
            {showLogo ? (
              <img key={platformLogoUrl} src={platformLogoUrl!} alt="Haa" className="platform-logo h-12 w-auto" onError={() => setLogoError(true)} />
            ) : (
              <img src="/assets/haa-logo.png" alt="Haa" className="h-12 w-auto" />
            )}
            <span className="font-extrabold text-text-primary">متاجر هاء</span>
            <span className="hidden text-text-tertiary/50 sm:inline select-none" aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-700">
              <span>صنع في السعودية</span>
              <img
                src="/assets/saudi-map.png"
                alt=""
                className="h-5 w-auto"
                aria-hidden="true"
              />
            </span>
          </div>
          {/* Divider */}
          <div className="h-px w-16 bg-border/50" aria-hidden="true" />
          {/* Copyright */}
          <p className="text-sm text-text-tertiary">
            {t('landing.footer.copyright', '© 2026 هاء سوفت')}
          </p>
        </div>
      </StoreContainer>
    </footer>
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
