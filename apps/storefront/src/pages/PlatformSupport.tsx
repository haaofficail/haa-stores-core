// Platform Support — Haa-native identity.
//
// Standalone help-centre page at haastores.com/support. Distinct from
// the per-merchant `/s/:slug/support` (`Support.tsx`) which is the
// in-store customer-help surface owned by the merchant.
//
// This page positions متاجر هاء's institutional help-centre:
//   - Hero with a UI-only search (no backend wired — the input is a
//     visual primitive; submitting opens a mailto fallback so users
//     never hit a dead button).
//   - 4 category cards (البدء / الدفع / الشحن / الفنيات).
//   - 10+ FAQ items covering signup, payment, shipping, billing.
//   - "Still need help?" CTA → hello@haastores.com.
//
// Same visual vocabulary as PlatformAbout / Pricing (IBM Plex Sans
// Arabic, brand-blue accent, Apple ink, layered shadows, 24px radii).

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/icon';
import { useSEO } from '@/hooks/useSEO';
import { PLATFORM_LEGAL_ENTITY } from '@haa/shared';
import './support.css';

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
  return <div ref={ref} className="support-pg__progress" aria-hidden="true" />;
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

/* ─── data ───────────────────────────────────────────────── */

type Category = { id: string; title: string; desc: string; glyph: string; href: string };

const CATEGORIES: Category[] = [
  {
    id: 'getting-started',
    title: 'البدء',
    desc: 'إنشاء حسابك، إعداد متجرك الأول، واختيار النطاق المناسب.',
    glyph: '↑',
    href: '#faq-q-1',
  },
  {
    id: 'payments',
    title: 'الدفع',
    desc: 'مدى، Apple Pay، تابي وتمارا، وكيفية تفعيل المزوّدات.',
    glyph: '﷼',
    href: '#faq-q-3',
  },
  {
    id: 'shipping',
    title: 'الشحن',
    desc: 'ربط شركات الشحن، حساب الأسعار، وإدارة الطرود.',
    glyph: '⇆',
    href: '#faq-q-5',
  },
  {
    id: 'technical',
    title: 'الفنيات',
    desc: 'النطاق المخصّص، الفواتير ZATCA، واتساب وAPI.',
    glyph: '⌘',
    href: '#faq-q-7',
  },
];

const FAQ: Array<[string, string]> = [
  [
    'كيف أنشئ حسابًا جديدًا في متاجر هاء؟',
    'ادخل صفحة /signup، أدخل بريدك الإلكتروني واسم متجرك المقترح، ستصلك رسالة تفعيل خلال ثوانٍ. بعد التفعيل تختار قالبك الافتراضي وتبدأ بإضافة منتجاتك مباشرةً — بدون بطاقة وبدون التزام.',
  ],
  [
    'هل أحتاج بطاقة ائتمانية للبدء؟',
    'لا. الباقة المجانية متاحة بلا بطاقة. ستحتاج البطاقة فقط عند الترقية إلى Pro أو Business، أو لتفعيل مزوّدات الدفع الإلكترونية في متجرك.',
  ],
  [
    'كيف أُفعّل بوابات الدفع مثل مدى وApple Pay؟',
    'من لوحة التحكم → الإعدادات → الدفع، اختر مزوّدك (Moyasar أو Geidea)، أدخل مفاتيح API التي يزوّدك بها المزوّد. بعد التحقّق التلقائي تصبح وسائل الدفع مرئية لعملائك خلال دقائق.',
  ],
  [
    'هل تأخذون عمولة على المبيعات؟',
    'لا. متاجر هاء لا تأخذ نسبة من مبيعاتك. ما تدفعه هو سعر باقتك الشهري فقط. رسوم البطاقات والتقسيط (تابي/تمارا) تدفعها مباشرةً للمزوّد بنسبة معلنة.',
  ],
  [
    'كيف أربط شركة شحن بمتجري؟',
    'من الإعدادات → الشحن، نوفّر تكاملًا مباشرًا مع SMSA، Aramex، DHL، وأبرز الشركات المحلية. أدخل بيانات حسابك مع الشركة لتفعيل حساب الأسعار التلقائي وإصدار البوليصات من داخل لوحة الطلبات.',
  ],
  [
    'كيف أحدّد أسعار الشحن لمناطق المملكة؟',
    'لديك خياران: (١) أسعار ثابتة تحدّدها بنفسك حسب المنطقة، (٢) أسعار آلية من شركة الشحن المرتبطة. يمكنك أيضًا تفعيل الشحن المجاني فوق مبلغ معيّن، أو إضافة رسوم خدمة COD.',
  ],
  [
    'كيف أفعّل دفع عند الاستلام (COD)؟',
    'من الإعدادات → الدفع → دفع عند الاستلام، فعّل الخيار وحدّد رسوم الخدمة (مثلًا ١٥ ريال) والحدّ الأقصى للمبلغ المسموح. يظهر الخيار للعميل في صفحة الدفع تلقائيًا.',
  ],
  [
    'كيف أربط نطاقي الخاص (.com أو .sa)؟',
    'من الإعدادات → النطاق، أدخل نطاقك، سنزوّدك بسجلات DNS التي تضيفها لدى مزوّد النطاق. خلال ساعة (وغالبًا أقل) يصبح متجرك متاحًا على نطاقك مع شهادة SSL تلقائية ومجانية.',
  ],
  [
    'هل الفواتير متوافقة مع ZATCA (فاتورة)؟',
    'نعم. كل فواتير الاشتراك وفواتير عملائك تصدر بصيغة ZATCA-compatible متوافقة مع المرحلة الثانية من نظام الفوترة الإلكترونية في المملكة، شاملةً QR والتوقيع الرقمي.',
  ],
  [
    'متى تصلني أموال مبيعاتي؟',
    'حسب مزوّد الدفع: Moyasar تُسوّي يوميًا (T+1)، Geidea أسبوعيًا (T+7) افتراضيًا. تظهر التسويات في لوحة التحكم → المحفظة مع تفصيل العمولات.',
  ],
  [
    'هل أستطيع إرسال رسائل واتساب لعملائي من المنصة؟',
    'نعم. وحدة الواتساب الرسمية مدمجة في باقتي Pro وBusiness — اربط رقم العمل (Business API)، أرسل تأكيدات الطلب، تتبّع الشحنات، وحملات تسويقية بناءً على شريحة العملاء.',
  ],
  [
    'كيف ألغي اشتراكي؟',
    'من الإعدادات → الاشتراك → إلغاء، يلغى بضغطة واحدة. تستمر مزايا باقتك حتى نهاية الدورة المدفوعة، ثم يتحوّل متجرك للباقة المجانية تلقائيًا بدون فقدان بياناتك.',
  ],
];

/* ─── page ───────────────────────────────────────────────── */

export default function PlatformSupport() {
  useSEO({
    title: 'مركز الدعم — متاجر هاء',
    description:
      'مركز مساعدة متاجر هاء — أجوبة عن البدء، الدفع، الشحن، الفواتير، والنطاق. تواصل بسرعة عبر hello@haastores.com لدعم بشري سعودي.',
  });

  const root = useScrollReveal();
  const [faqOpen, setFaqOpen] = useState<number>(-1);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const prev = { dir: document.documentElement.dir, lang: document.documentElement.lang };
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    return () => {
      document.documentElement.dir = prev.dir;
      document.documentElement.lang = prev.lang;
    };
  }, []);

  // UI-only search — no backend. Falls back to mailto so the button
  // never appears broken: if the user typed a question we forward it
  // to the support inbox as a pre-filled subject line.
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const subject = encodeURIComponent(`سؤال دعم: ${q}`);
    window.location.href = `mailto:hello@haastores.com?subject=${subject}`;
  };

  const filteredFaq = query.trim()
    ? FAQ.filter(([q, a]) => q.includes(query.trim()) || a.includes(query.trim()))
    : FAQ;

  return (
    <div ref={root} className="support-pg overflow-x-hidden" dir="rtl" lang="ar">
      <ScrollProgress />

      <main className="support-pg__wrap">
        {/* ── Hero ─────────── */}
        <header className="support-pg__hero">
          <span className="support-pg__eyebrow">مركز الدعم · فريق سعودي</span>

          <h1 className="support-pg__hero-title">
            كيف نساعدك،
            <br />
            <em>اليوم؟</em>
          </h1>

          <p className="support-pg__hero-lede">
            دليل سريع لأكثر الأسئلة شيوعًا، أو تواصل مباشرة مع فريق
            الدعم — نرد بسرعة، وباللغة العربية، من المملكة.
          </p>

          <form className="support-pg__search" role="search" onSubmit={onSearch}>
            <span className="support-pg__search-icon" aria-hidden="true">
              <Icon name="Search" size="sm" />
            </span>
            <input
              type="search"
              placeholder="ابحث في الأسئلة الشائعة…"
              aria-label="ابحث في مركز الدعم"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">بحث</button>
          </form>
        </header>

        {/* ── Categories ─────────── */}
        <section className="support-pg__section" aria-labelledby="cats-title">
          <div className="support-pg__section-head" data-reveal>
            <p className="support-pg__section-eyebrow">تصفّح حسب الموضوع</p>
            <h2 id="cats-title" className="support-pg__section-title">
              ابدأ من هنا.
            </h2>
            <p className="support-pg__section-lede">
              أربع تجميعات تغطّي ٩٠٪ من أسئلة التجار. اضغط أي فئة
              للقفز إلى الأسئلة المرتبطة بها.
            </p>
          </div>

          <div className="support-pg__cats">
            {CATEGORIES.map((c, i) => (
              <a
                key={c.id}
                href={c.href}
                className="support-pg__cat"
                data-reveal
                data-reveal-delay={String((i % 4) + 1) as '1' | '2' | '3' | '4'}
              >
                <span className="support-pg__cat-icon" aria-hidden="true">{c.glyph}</span>
                <h3 className="support-pg__cat-title">{c.title}</h3>
                <p className="support-pg__cat-desc">{c.desc}</p>
              </a>
            ))}
          </div>
        </section>

        {/* ── FAQ ─────────── */}
        <section
          id="faq"
          className="support-pg__section support-pg__section--soft"
          aria-labelledby="faq-title"
        >
          <div className="support-pg__section-head" data-reveal>
            <p className="support-pg__section-eyebrow">الأسئلة الشائعة</p>
            <h2 id="faq-title" className="support-pg__section-title">
              أجوبة مباشرة، بدون لفّ.
            </h2>
            {query.trim() && filteredFaq.length === 0 && (
              <p className="support-pg__section-lede">
                لم نجد إجابة تطابق «{query}» — جرّب التواصل مع الفريق
                مباشرة في الأسفل.
              </p>
            )}
          </div>

          <div className="support-pg__faq" data-reveal data-reveal-delay="1">
            {filteredFaq.map(([q, a], i) => {
              const open = faqOpen === i;
              return (
                <div
                  key={q}
                  id={`faq-q-${i + 1}`}
                  className={`support-pg__faq-item${open ? ' is-open' : ''}`}
                >
                  <button
                    type="button"
                    className="support-pg__faq-q"
                    aria-expanded={open}
                    onClick={() => setFaqOpen(open ? -1 : i)}
                  >
                    <span>{q}</span>
                    <span className="support-pg__faq-icon" aria-hidden="true">+</span>
                  </button>
                  {open && <p className="support-pg__faq-a">{a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Contact CTA ─────────── */}
        <section className="support-pg__section">
          <div className="support-pg__contact" data-reveal>
            <p className="support-pg__contact-label">ما زلت بحاجة مساعدة؟</p>
            <h2 className="support-pg__contact-title">
              تواصل معنا مباشرة.
            </h2>
            <p className="support-pg__contact-desc">
              فريقنا متاح للرد على أسئلتك التقنية والفنّية وأي
              استفسار حول باقات الاشتراك أو التكاملات. عادةً نرد
              خلال ساعات العمل (الأحد–الخميس، ٩ص–٥م بتوقيت الرياض).
            </p>
            <a className="support-pg__contact-cta" href="mailto:hello@haastores.com">
              راسلنا على hello@haastores.com
              <span className="pa-arrow" aria-hidden="true">←</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="support-pg__footer">
        <div className="support-pg__footer-inner">
          <span>
            © {new Date().getFullYear()} {PLATFORM_LEGAL_ENTITY.legalNameAr}
          </span>
          <Link to="/">العودة للرئيسية</Link>
        </div>
      </footer>
    </div>
  );
}
