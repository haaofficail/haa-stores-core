// Pricing — Haa-native identity.
//
// Standalone /pricing page extracted from LandingPage's #pricing section.
// Mirrors the brand vocabulary of PlatformAbout (white surface, Apple
// ink, single brand-blue accent, layered shadows, 24px card radius,
// 999px pill buttons, IBM Plex Sans Arabic only).
//
// Plans here intentionally trimmed to 3 (Free / Pro / Business) per
// owner request for the standalone /pricing surface — the dashboard
// seed still carries the 4-tier ladder (Starter/Growth/Pro/Business);
// when the user clicks a plan CTA we deep-link with `?plan=…` so the
// signup funnel can preselect the correct tier.
//
// Single source of truth for the legal entity remains `@haa/shared`
// PLATFORM_LEGAL_ENTITY — never hardcode the CR/name.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { PlatformShell } from '@/components/platform/PlatformShell';
import './pricing.css';

/* ─── primitives (mirrors PlatformAbout) ─────────────────── */

function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      ref.current.style.transform = `scaleX(${h > 0 ? window.scrollY / h : 0})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return <div ref={ref} className="pricing-pg__progress" aria-hidden="true" />;
}

function useScrollReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      rootRef.current.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            obs.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    rootRef.current.querySelectorAll('[data-reveal]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return rootRef;
}

/* ─── plan data ──────────────────────────────────────────── */

type Plan = {
  id: 'free' | 'pro' | 'business';
  name: string;
  price: string;
  priceNote: string;
  desc: string;
  features: string[];
  cta: string;
  ctaHref: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free · مجاني',
    price: '0',
    priceNote: '/شهريًا',
    desc: 'للبدء وتجربة المنصة بدون أي رسوم.',
    features: [
      'حتى ١٠ منتجات',
      'موظف واحد',
      'مساحة ١٠٠ ميجابايت',
      'دفع مدى و Apple Pay',
      'دعم بالبريد',
    ],
    cta: 'ابدأ مجانًا',
    ctaHref: '/signup?ref=pricing&plan=free',
  },
  {
    id: 'pro',
    name: 'Pro · احتراف',
    price: '٩٩',
    priceNote: '/شهريًا',
    desc: 'لمتجر ينمو بثقة ويحتاج كل وسائل الدفع.',
    features: [
      'حتى ١٠٠ منتج',
      '٣ موظفين',
      'مساحة ١ جيجابايت',
      'كل وسائل الدفع المحلية',
      'تحليلات وكوبونات',
      'دعم أولوية',
    ],
    cta: 'جرّب ١٤ يوم مجانًا',
    ctaHref: '/signup?ref=pricing&plan=pro',
    featured: true,
  },
  {
    id: 'business',
    name: 'Business · أعمال',
    price: '٤٩٩',
    priceNote: '/شهريًا',
    desc: 'للعلامات الكبيرة والاحتياجات المخصّصة.',
    features: [
      'منتجات غير محدودة',
      'موظفون غير محدودين',
      'مساحة ٢٠ جيجابايت',
      'مدير حساب مخصّص',
      'SLA مكتوب · API & Webhooks',
      'دعم أولوية ٢٤/٧',
    ],
    cta: 'تواصل مع المبيعات',
    ctaHref: 'mailto:hello@haastores.com?subject=Business%20plan',
  },
];

type CompareRow = { feature: string; free: string; pro: string; business: string };

const COMPARE: CompareRow[] = [
  { feature: 'عدد المنتجات', free: '١٠', pro: '١٠٠', business: 'غير محدود' },
  { feature: 'عدد الموظفين', free: '١', pro: '٣', business: 'غير محدود' },
  { feature: 'مساحة الوسائط', free: '١٠٠م.ب', pro: '١ج.ب', business: '٢٠ج.ب' },
  { feature: 'دفع مدى و Apple Pay', free: '✓', pro: '✓', business: '✓' },
  { feature: 'كل وسائل الدفع المحلية', free: '—', pro: '✓', business: '✓' },
  { feature: 'تقسيط تابي وتمارا', free: '—', pro: '—', business: '✓' },
  { feature: 'تحليلات متقدّمة وكوبونات', free: '—', pro: '✓', business: '✓' },
  { feature: 'مزامنة سلّة / نون / زد', free: '—', pro: '—', business: '✓' },
  { feature: 'مدير حساب مخصّص', free: '—', pro: '—', business: '✓' },
  { feature: 'API و Webhooks', free: '—', pro: '—', business: '✓' },
  { feature: 'الدعم', free: 'بالبريد', pro: 'أولوية', business: 'أولوية ٢٤/٧' },
];

const FAQ: Array<[string, string]> = [
  [
    'هل يمكنني الإلغاء في أي وقت؟',
    'نعم، بضغطة واحدة وبدون أي التزام. الباقة المجانية تبقى مجانية دائمًا للبدء، وأي اشتراك مدفوع يمكن إلغاؤه فورًا من لوحة التحكم.',
  ],
  [
    'هل توجد رسوم خفية أو عمولات على المبيعات؟',
    'لا. سعر الباقة الشهري هو كل ما تدفعه لـمتاجر هاء. وسائل الدفع (مدى/Apple Pay/تابي/تمارا) لها رسوم بنكية مستقلّة معلنة من المزوّد، ولا نأخذ نسبة من مبيعاتك.',
  ],
  [
    'كيف يعمل الإصدار التجريبي المجاني؟',
    'ابدأ بالباقة المجانية مباشرةً بدون بطاقة. عند اختيارك Pro، نقدّم ١٤ يومًا مجانًا لتجربة كل المزايا، وإذا لم تكمل الاشتراك سيتم تحويلك تلقائيًا للباقة المجانية بدون انقطاع لمتجرك.',
  ],
  [
    'هل يمكنني الترقية أو التخفيض لاحقًا؟',
    'بالطبع. الترقية فورية، والتخفيض يبدأ مع بداية الدورة الفوترية التالية، مع احتساب نسبي للأيام المتبقّية (proration).',
  ],
  [
    'ما طرق الدفع المقبولة لاشتراك الباقة؟',
    'بطاقات مدى، فيزا، ماستركارد، وApple Pay. الفاتورة الضريبية تصلك تلقائيًا بصيغة ZATCA-compatible متوافقة مع نظام الفوترة الإلكترونية في المملكة.',
  ],
  [
    'هل الدعم باللغة العربية؟',
    'نعم — كل قنوات الدعم تعمل بالعربية الفصحى من فريق سعودي يفهم السوق والاحتياجات المحلية.',
  ],
];

/* ─── page ───────────────────────────────────────────────── */

export default function Pricing() {
  useSEO({
    title: 'الباقات والأسعار — متاجر هاء',
    description:
      'باقات متاجر هاء — ابدأ مجانًا بدون بطاقة، وارتقِ متى ما كبر متجرك. أسعار شفّافة، بدون عمولات على المبيعات، دفع محلي وفواتير ZATCA.',
  });

  const root = useScrollReveal();
  const [faqOpen, setFaqOpen] = useState<number>(-1);

  useEffect(() => {
    const prev = { dir: document.documentElement.dir, lang: document.documentElement.lang };
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    return () => {
      document.documentElement.dir = prev.dir;
      document.documentElement.lang = prev.lang;
    };
  }, []);

  return (
    <PlatformShell>
    <div ref={root} className="pricing-pg overflow-x-hidden" dir="rtl" lang="ar">
      <ScrollProgress />

      <main className="pricing-pg__wrap">
        {/* ── Hero ─────────── */}
        <header className="pricing-pg__hero">
          <span className="pricing-pg__eyebrow">الباقات · شفّافة، بدون مفاجآت</span>

          <h1 className="pricing-pg__hero-title">
            باقة تناسب حجم متجرك،
            <br />
            <em>وتكبر معك.</em>
          </h1>

          <p className="pricing-pg__hero-lede">
            ابدأ مجانًا بدون بطاقة. ادفع فقط حين يكبر متجرك ويحتاج
            مزايا أعمق. بدون عمولات على المبيعات، وبدون رسوم خفيّة.
          </p>

          <div className="pricing-pg__hero-actions">
            <Link to="/signup?ref=pricing-hero" className="pricing-pg__btn pricing-pg__btn--primary">
              ابدأ الآن مجانًا
              <span className="pa-arrow" aria-hidden="true">←</span>
            </Link>
            <a href="#compare" className="pricing-pg__btn pricing-pg__btn--ghost">
              قارن الباقات
            </a>
          </div>
        </header>

        {/* ── Plans ─────────── */}
        <section className="pricing-pg__section" aria-labelledby="plans-title">
          <div className="pricing-pg__section-head" data-reveal>
            <p className="pricing-pg__section-eyebrow">الباقات</p>
            <h2 id="plans-title" className="pricing-pg__section-title">
              ثلاث باقات. وضوح كامل.
            </h2>
            <p className="pricing-pg__section-lede">
              كل باقة تتضمّن استضافة، شهادة SSL، نطاقًا فرعيًا على
              haastores.com، وفواتير ZATCA-compatible.
            </p>
          </div>

          <div className="pricing-pg__plans">
            {PLANS.map((plan, i) => (
              <article
                key={plan.id}
                className={`pricing-pg__plan${plan.featured ? ' pricing-pg__plan--featured' : ''}`}
                data-reveal
                data-reveal-delay={String(i + 1) as '1' | '2' | '3'}
                aria-label={plan.name}
              >
                {plan.featured && (
                  <span className="pricing-pg__plan-tag">الأكثر شيوعًا</span>
                )}
                <header>
                  <h3 className="pricing-pg__plan-name">{plan.name}</h3>
                  <p className="pricing-pg__plan-desc">{plan.desc}</p>
                </header>

                <div className="pricing-pg__plan-price" aria-label={`${plan.price} ريال ${plan.priceNote}`}>
                  <span className="pricing-pg__plan-currency" aria-hidden="true">﷼</span>
                  <b>{plan.price}</b>
                  <span>{plan.priceNote}</span>
                </div>

                <ul className="pricing-pg__plan-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <span className="pricing-pg__plan-check" aria-hidden="true">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.ctaHref}
                  className={`pricing-pg__btn pricing-pg__plan-cta ${
                    plan.featured ? 'pricing-pg__btn--primary' : 'pricing-pg__btn--ghost'
                  }`}
                >
                  {plan.cta}
                  {plan.featured && <span className="pa-arrow" aria-hidden="true">←</span>}
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* ── Comparison ─────────── */}
        <section
          id="compare"
          className="pricing-pg__section pricing-pg__section--soft"
          aria-labelledby="compare-title"
        >
          <div className="pricing-pg__section-head" data-reveal>
            <p className="pricing-pg__section-eyebrow">مقارنة تفصيلية</p>
            <h2 id="compare-title" className="pricing-pg__section-title">
              كل ميزة، كل باقة.
            </h2>
            <p className="pricing-pg__section-lede">
              قارن المزايا جنبًا إلى جنب لتختار الباقة المناسبة لمرحلتك
              الحالية.
            </p>
          </div>

          <div className="pricing-pg__compare-wrap" data-reveal data-reveal-delay="1">
            <table className="pricing-pg__compare">
              <thead>
                <tr>
                  <th scope="col">الميزة</th>
                  <th scope="col">Free</th>
                  <th scope="col" className="pricing-pg__compare-featured">Pro</th>
                  <th scope="col">Business</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td>
                    <td className={row.free === '—' ? 'pricing-pg__compare-no' : 'pricing-pg__compare-yes'}>
                      {row.free}
                    </td>
                    <td className={`pricing-pg__compare-featured ${row.pro === '—' ? 'pricing-pg__compare-no' : 'pricing-pg__compare-yes'}`}>
                      {row.pro}
                    </td>
                    <td className={row.business === '—' ? 'pricing-pg__compare-no' : 'pricing-pg__compare-yes'}>
                      {row.business}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FAQ ─────────── */}
        <section className="pricing-pg__section" aria-labelledby="faq-title">
          <div className="pricing-pg__section-head" data-reveal>
            <p className="pricing-pg__section-eyebrow">الأسئلة الشائعة</p>
            <h2 id="faq-title" className="pricing-pg__section-title">
              فوترة، إلغاء، ودعم.
            </h2>
          </div>

          <div className="pricing-pg__faq" data-reveal data-reveal-delay="1">
            {FAQ.map(([q, a], i) => {
              const open = faqOpen === i;
              return (
                <div key={q} className={`pricing-pg__faq-item${open ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="pricing-pg__faq-q"
                    aria-expanded={open}
                    onClick={() => setFaqOpen(open ? -1 : i)}
                  >
                    <span>{q}</span>
                    <span className="pricing-pg__faq-icon" aria-hidden="true">+</span>
                  </button>
                  {open && <p className="pricing-pg__faq-a">{a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CTA ─────────── */}
        <section className="pricing-pg__cta">
          <div data-reveal>
            <h2 className="pricing-pg__cta-title">
              ابدأ متجرك خلال دقائق <em>لا أيام.</em>
            </h2>
            <div className="pricing-pg__hero-actions" style={{ marginTop: 0 }}>
              <Link to="/signup?ref=pricing-cta" className="pricing-pg__btn pricing-pg__btn--primary">
                ابدأ الآن مجانًا
                <span className="pa-arrow" aria-hidden="true">←</span>
              </Link>
              <a href="mailto:hello@haastores.com" className="pricing-pg__btn pricing-pg__btn--ghost">
                تواصل مع المبيعات
              </a>
            </div>
          </div>
        </section>
      </main>

    </div>
    </PlatformShell>
  );
}
