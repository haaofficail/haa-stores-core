// Platform "About" — editorial Saudi modernism.
//
// Earlier iteration of this page was a competent landing-style stack of
// cards. This one trades that for an editorial sensibility — large
// Reem Kufi display type, El Messiri serif for prose, ivory paper +
// deep ink with one accent blue used like a drop-cap. The page reads
// less like a marketing landing and more like a magazine feature.
//
// Single source of truth for the legal entity remains
// `@haa/shared` PLATFORM_LEGAL_ENTITY — name, CR number, issue date.
// The "status" field is intentionally not surfaced (a live published
// page implies the registration is active; restating it adds visual
// noise and creates a maintenance burden).

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { PLATFORM_LEGAL_ENTITY } from '@haa/shared';
import './settings-about-editorial.css';

/* ─── data ─────────────────────────────────────────────────── */

interface Offering {
  num: string;
  title: string;
  desc: string;
}

const OFFERINGS: Offering[] = [
  {
    num: '01',
    title: 'متجر إلكتروني جاهز',
    desc: 'ثيمات أنيقة ومرنة، وأدوات تحرير بدون كود — يطلق التاجر متجره ويبدأ البيع في دقائق.',
  },
  {
    num: '02',
    title: 'دفع سعودي متكامل',
    desc: 'مدى وApple Pay وSTC Pay وVisa وMastercard، إضافةً إلى التقسيط عبر تابي وتمارا — جاهزة ومتوافقة محلياً.',
  },
  {
    num: '03',
    title: 'شحن وتسليم مدمج',
    desc: 'تكامل مباشر مع شركات الشحن السعودية، مع طباعة بوليصة الشحن وتتبّع آلي للطلبات.',
  },
  {
    num: '04',
    title: 'تحليلات وقرارات أذكى',
    desc: 'تقارير مبيعات لحظية، معدّل تحويل، حركة الزوّار، ولوحة تحكم موحّدة لإدارة كل شيء.',
  },
];

/* ─── primitives ─────────────────────────────────────────── */

function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = h > 0 ? window.scrollY / h : 0;
      ref.current.style.transform = `scaleX(${ratio})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return <div ref={ref} className="about-ed__progress" aria-hidden="true" />;
}

/**
 * Reveals all `[data-reveal]` elements inside the page as the reader
 * scrolls past them. One observer for the whole tree keeps it cheap;
 * elements are unobserved after their first reveal so we don't burn
 * cycles on every scroll event.
 */
function useScrollReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      // Older browsers: just show everything.
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
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    rootRef.current.querySelectorAll('[data-reveal]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return rootRef;
}

/* ─── page ───────────────────────────────────────────────── */

export default function PlatformAbout() {
  useSEO({
    title: 'من نحن — متاجر هاء',
    description:
      'متاجر هاء — منصة سعودية لإطلاق وإدارة المتاجر الإلكترونية، من إنتاج Haa Soft. متجر جاهز، دفع محلي، شحن مدمج، وقرارات أذكى.',
  });

  const root = useScrollReveal();

  // RTL on the page root so the design system inherits direction
  // correctly even if the visitor lands here from a non-RTL route.
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
    <div ref={root} className="about-ed overflow-x-hidden" dir="rtl" lang="ar">
      <ScrollProgress />

      <main className="about-ed__wrap">
        {/* ─────────── Hero ─────────── */}
        <header className="about-ed__hero">
          <span className="about-ed__year" aria-hidden="true">2024</span>

          <p className="about-ed__eyebrow">منتج من هاء سوفت — Haa Soft</p>

          <h1 className="about-ed__hero-title">
            متجر إلكتروني سعودي،
            <br />
            <em>كما يجب أن يكون.</em>
          </h1>

          <p className="about-ed__hero-lede">
            بُنيت متاجر هاء لتمنح التاجر السعودي أداةً تليق بمنتجه
            — هادئة في تصميمها، عميقة في تفاصيلها، ومتوافقة كلياً
            مع السوق المحلي من اللحظة الأولى.
          </p>

          <dl className="about-ed__hero-meta">
            <div className="about-ed__hero-meta-item">
              <dt>التأسيس</dt>
              <dd>2024</dd>
            </div>
            <div className="about-ed__hero-meta-item">
              <dt>المقر</dt>
              <dd>المملكة العربية السعودية</dd>
            </div>
            <div className="about-ed__hero-meta-item">
              <dt>الانتماء</dt>
              <dd>{PLATFORM_LEGAL_ENTITY.legalNameAr}</dd>
            </div>
          </dl>
        </header>

        {/* ─────────── Story ─────────── */}
        <section className="about-ed__section">
          <div className="about-ed__chapter">
            <div data-reveal>
              <p className="about-ed__chapter-eyebrow">
                <span className="num">01</span>
                <span>القصّة</span>
              </p>
              <h2 className="about-ed__chapter-title">
                بداية من فجوة، لا من فكرة.
              </h2>
            </div>
            <div className="about-ed__prose" data-reveal data-reveal-delay="1">
              <p>
                <span className="drop">ر</span>
                أينا التجار السعوديين يبيعون بأدوات صُمّمت لأسواق أخرى:
                واجهات لا تحترم العربية، دفع مُعقّد، شحن غير متوافق،
                وفواتير لا تنطبق على نظام الزكاة والضريبة. الفجوة كانت
                واضحة، والحاجة أوضح.
              </p>
              <p>
                ولدت متاجر هاء من هذه الفجوة — منصّة بُنيت من الأرض إلى
                السماء داخل المملكة، بأيدٍ تعرف السوق وتفهم اللغة وتقدّر
                التفاصيل التي تفرّق بين تجربة جيدة وأخرى لا تُنسى.
              </p>
              <p>
                نحن جزء من <strong>Haa Soft</strong> — بيت تقني سعودي يبني
                منتجات برمجية للسوق المحلّي. كل سطر شفرة، كل ركن من
                لوحة التحكم، كل قرار تصميمي: مكتوب لأجل التاجر الذي
                سيستخدم الأداة، لا لأجل عرض تقني.
              </p>
            </div>
          </div>
        </section>

        {/* ─────────── Offerings ─────────── */}
        <section className="about-ed__section about-ed__section--accent">
          <div className="about-ed__chapter">
            <div data-reveal>
              <p className="about-ed__chapter-eyebrow">
                <span className="num">02</span>
                <span>ما الذي نقدّمه</span>
              </p>
              <h2 className="about-ed__chapter-title">
                منصّة كاملة، لا أدوات متفرّقة.
              </h2>
            </div>
            <div className="about-ed__prose" data-reveal data-reveal-delay="1">
              <p>
                المتجر، الدفع، الشحن، التحليلات — كلّها في مكان واحد،
                تتحدّث مع بعضها، وتفهم السياق السعودي افتراضياً. لا
                إضافات تشتري، لا تكاملات تربط يدوياً، لا أدوات تستبدل
                بعد سنة.
              </p>
            </div>
          </div>

          <ol className="about-ed__offerings" data-reveal data-reveal-delay="2">
            {OFFERINGS.map((o) => (
              <li className="about-ed__offering" key={o.num}>
                <span className="about-ed__offering-num">— {o.num}</span>
                <h3 className="about-ed__offering-title">{o.title}</h3>
                <p className="about-ed__offering-desc">{o.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ─────────── Provenance (legal entity) ─────────── */}
        <section className="about-ed__section">
          <div className="about-ed__chapter">
            <div data-reveal>
              <p className="about-ed__chapter-eyebrow">
                <span className="num">03</span>
                <span>الكيان القانوني</span>
              </p>
              <h2 className="about-ed__chapter-title">
                مُسجَّلون. موثَّقون. مسؤولون.
              </h2>
            </div>
            <div className="about-ed__prose" data-reveal data-reveal-delay="1">
              <p>
                نعمل تحت كيان تجاري سعودي مُسجَّل رسمياً. الشفافية في
                الانتماء ليست تفصيلاً قانونياً — هي وعد للتاجر بأنّ
                هناك من يقف خلف المنصّة، باسم وعنوان ومسؤولية.
              </p>
            </div>
          </div>

          <div className="about-ed__certificate" data-reveal data-reveal-delay="2">
            <p className="about-ed__certificate-label">شهادة الكيان</p>
            <h3 className="about-ed__certificate-name">{PLATFORM_LEGAL_ENTITY.legalNameAr}</h3>
            <dl className="about-ed__certificate-rows">
              <div>
                <dt>السجل التجاري</dt>
                <dd dir="ltr">{PLATFORM_LEGAL_ENTITY.commercialRegistration}</dd>
              </div>
              <div>
                <dt>تاريخ الإصدار</dt>
                <dd dir="ltr">{PLATFORM_LEGAL_ENTITY.issueDate}</dd>
              </div>
              <div>
                <dt>جهة الإصدار</dt>
                <dd>المملكة العربية السعودية</dd>
              </div>
              <div>
                <dt>الاسم بالإنجليزية</dt>
                <dd dir="ltr">{PLATFORM_LEGAL_ENTITY.legalNameEn}</dd>
              </div>
            </dl>
          </div>

          <a
            className="about-ed__anchor"
            href="https://haasoft.com"
            target="_blank"
            rel="noopener noreferrer"
            data-reveal
            data-reveal-delay="3"
            style={{ display: 'block', textDecoration: 'none' }}
          >
            <p className="about-ed__anchor-label">الانتماء — Affiliation</p>
            <p className="about-ed__anchor-quote">
              متاجر هاء واحد من منتجات <strong>Haa Soft</strong> —
              بيتٍ تقني سعودي يبني أدوات برمجية للسوق المحلّي.
              زر الموقع الرسمي للاطّلاع على باقي المنتجات.
            </p>
            <span className="about-ed__anchor-link">
              haasoft.com
              <span aria-hidden="true">↗</span>
            </span>
          </a>
        </section>

        {/* ─────────── CTA ─────────── */}
        <section className="about-ed__cta">
          <p className="about-ed__cta-eyebrow">ابدأ — Begin</p>
          <h2 className="about-ed__cta-title">
            أطلق متجرك<br />
            في دقائق <em>لا أيام.</em>
          </h2>
          <div className="about-ed__cta-actions">
            <Link to="/signup?ref=about" className="about-ed__btn about-ed__btn--primary">
              ابدأ متجرك مجاناً
              <span aria-hidden="true">→</span>
            </Link>
            <a href="/#contact" className="about-ed__btn about-ed__btn--ghost">
              تواصل مع المبيعات
            </a>
          </div>
        </section>

        <footer className="about-ed__footer">
          <span>
            © {new Date().getFullYear()} {PLATFORM_LEGAL_ENTITY.legalNameAr} — جميع الحقوق محفوظة.
          </span>
          <span>
            <Link to="/">العودة للرئيسية</Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
