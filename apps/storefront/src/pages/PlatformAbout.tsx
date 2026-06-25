// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- platform about page icon bundle
import {
  Sparkles, ArrowLeft, ArrowUp, ShoppingBag, CreditCard, Truck,
  BarChart3, Building2, Link as LinkIcon, Mail, ExternalLink,
  ShieldCheck, Users,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { StoreButton } from '@/components/ui';
import { PLATFORM_LEGAL_ENTITY } from '@haa/shared';
import '@/landing/landing.css';

/* ─── data ─────────────────────────────────────────────────── */

const OFFERINGS: { icon: typeof ShoppingBag; title: string; desc: string }[] = [
  {
    icon: ShoppingBag,
    title: 'متجر إلكتروني جاهز',
    desc: 'ثيمات أنيقة ومرنة، وأدوات تحرير بدون كود — يطلق التاجر متجره ويبدأ البيع في دقائق.',
  },
  {
    icon: CreditCard,
    title: 'دفع سعودي متكامل',
    desc: 'مدى وApple Pay وSTC Pay وVisa وMastercard، إضافةً إلى التقسيط عبر تابي وتمارا — جاهزة ومتوافقة محلياً.',
  },
  {
    icon: Truck,
    title: 'شحن وتسليم مدمج',
    desc: 'تكامل مباشر مع شركات الشحن السعودية، مع طباعة بوليصة الشحن وتتبّع آلي للطلبات.',
  },
  {
    icon: BarChart3,
    title: 'تحليلات وقرارات أذكى',
    desc: 'تقارير مبيعات لحظية، معدّل تحويل، حركة الزوّار، ولوحة تحكم موحّدة لإدارة كل شيء.',
  },
];

/* ─── helpers ───────────────────────────────────────────────── */

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
  return <div aria-hidden="true" className="lp-scroll-bar" ref={ref} style={{ transform: 'scaleX(0)' }} />;
}

function BackToTop() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const show = window.scrollY > 600;
      ref.current.style.opacity = show ? '1' : '0';
      ref.current.style.transform = show ? 'translateY(0)' : 'translateY(1rem)';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="العودة للأعلى"
      className="lp-back-top"
      style={{ opacity: 0, transform: 'translateY(1rem)', transition: 'opacity 300ms, transform 300ms' }}
    >
      <ArrowUp size={20} />
    </button>
  );
}

/* ─── page ──────────────────────────────────────────────────── */

/**
 * Platform-level "About Us" page for haastores.com/about.
 *
 * Distinct from the per-merchant `apps/storefront/src/pages/About.tsx`
 * (mounted under `/s/:slug/about`) which renders editable content for an
 * individual store. This page positions Haa Stores as a product of
 * Haa Soft (the parent software house), and is the canonical
 * institutional page at the apex domain.
 *
 * Anchored on:
 *   - PLATFORM_LEGAL_ENTITY (single source of truth for CR + legal name)
 *   - Outbound link to haasoft.com (parent company, opens in new tab)
 */
export default function PlatformAbout() {
  useSEO({
    title: 'من نحن | متاجر هاء — منتج من Haa Soft',
    description:
      'متاجر هاء منصة سعودية للتجارة الإلكترونية، وأحد منتجات شركة Haa Soft. تعرّف على قصّتنا، ما الذي نقدّمه للتجار، وكيف ننتمي لـ Haa Soft.',
  });

  useEffect(() => {
    // honour <html lang/dir> while this page is mounted — keeps SEO
    // signals consistent for crawlers that read the root attributes.
    const prevLang = document.documentElement.lang;
    const prevDir = document.documentElement.dir;
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    return () => {
      document.documentElement.lang = prevLang;
      document.documentElement.dir = prevDir;
    };
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal, .reveal-stagger');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));
    const safety = setTimeout(() => els.forEach((el) => el.classList.add('is-visible')), 1200);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, []);

  return (
    <div id="storefront-scope" className="lp-page" lang="ar" dir="rtl">
      <ScrollProgress />

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-container lp-nav__in">
          <Link to="/" className="lp-logo">
            <img src="/assets/haa-stores-logo.png" alt="هاء متاجر" />
          </Link>
          <div className="lp-nav__links">
            <Link to="/">الرئيسية</Link>
            <Link to="/about" aria-current="page">من نحن</Link>
          </div>
          <div className="lp-nav__cta">
            <StoreButton size="sm" iconEnd={<ArrowLeft size={16} />} href="/signup">
              ابدأ مجاناً
            </StoreButton>
          </div>
        </div>
      </nav>

      <main>
        {/* ── Hero ────────────────────────────────────────── */}
        <header className="lp-hero">
          <div className="lp-hero__glow" />
          <div className="lp-container lp-hero__in">
            <div className="reveal">
              <span className="lp-pill">
                <Sparkles size={14} /> منتج من Haa Soft
              </span>
              <h1>
                متاجر هاء — <b>منصة سعودية</b> للتجارة الإلكترونية، من بيت Haa Soft
              </h1>
              <p className="lp-hero__sub">
                نبني الأدوات التي يحتاجها التاجر السعودي ليطلق متجره ويُديره ويُنميه بثقة —
                دفع محلّي، شحن مدمج، تحليلات لحظية، وتجربة عميل أنيقة.
              </p>
              <div className="lp-hero__cta">
                <StoreButton size="lg" iconEnd={<ArrowLeft size={18} />} href="/signup">
                  ابدأ متجرك
                </StoreButton>
                <StoreButton size="lg" variant="secondary" href="/#contact">
                  تواصل مع المبيعات
                </StoreButton>
              </div>
            </div>
          </div>
        </header>

        {/* ── Story ───────────────────────────────────────── */}
        <section id="story" className="lp-sec">
          <div className="lp-container">
            <div className="lp-sec__head reveal">
              <div className="lp-sec__eyebrow">قصّتنا</div>
              <h2>من نحن، ولماذا أنشأنا متاجر هاء</h2>
              <p style={{ textWrap: 'balance' }}>
                Haa Soft بيت تقني سعودي يبني منتجات برمجية للسوق المحلّي. لاحظنا أنّ التاجر
                السعودي بحاجة إلى منصّة تتحدّث لغته فعلاً — تتكامل مع وسائل الدفع المحلّية،
                وتفهم متطلّبات هيئة الزكاة والضريبة، وتقدّم تجربة شراء بسيطة وأنيقة لعميله.
                أنشأنا "متاجر هاء" لتكون هذه المنصّة: أداة احترافية، أوضح ماليّاً وتشغيليّاً،
                وتُدار بالكامل من الرياض.
              </p>
            </div>
          </div>
        </section>

        {/* ── Offerings ───────────────────────────────────── */}
        <section id="offerings" className="lp-sec" style={{ paddingTop: 0 }}>
          <div className="lp-container">
            <div className="lp-sec__head reveal">
              <div className="lp-sec__eyebrow">ما الذي نقدّمه</div>
              <h2>منصّة متكاملة للتاجر السعودي</h2>
              <p>أدوات صُمّمت خصّيصاً للسوق المحلّي، تُدير متجرك من الألف إلى الياء.</p>
            </div>
            <div className="lp-feats reveal-stagger">
              {OFFERINGS.map(({ icon: Icon, title, desc }) => (
                <div className="lp-feat" key={title}>
                  <div className="lp-feat__ic">
                    <Icon size={24} />
                  </div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Haa Soft affiliation ────────────────────────── */}
        <section id="haasoft" className="lp-sec" style={{ paddingTop: 0 }}>
          <div className="lp-container">
            <div className="lp-sec__head reveal">
              <div className="lp-sec__eyebrow">انتماؤنا</div>
              <h2>
                متاجر هاء أحد منتجات <b>Haa Soft</b>
              </h2>
              <p style={{ textWrap: 'balance' }}>
                Haa Soft (هاء سوفت) هي الشركة الأم التي تطوّر متاجر هاء وتشغّلها.
                نحن جزء من مجموعة منتجات برمجية يبنيها فريق هاء سوفت لخدمة السوق السعودي،
                ومتاجر هاء هي منتج التجارة الإلكترونية الرسمي من هذه المجموعة.
              </p>
              <div style={{ display: 'inline-flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <a
                  href="https://haasoft.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-pill"
                  style={{ textDecoration: 'none' }}
                  data-testid="haasoft-outbound-link"
                >
                  <Building2 size={14} /> زُر موقع Haa Soft الرسمي
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Haa Soft product family ─────────────────────── */}
        <section id="family" className="lp-sec" style={{ paddingTop: 0 }}>
          <div className="lp-container">
            <div className="lp-sec__head reveal">
              <div className="lp-sec__eyebrow">عائلة منتجات Haa Soft</div>
              <h2>منصّات بُنيت محلّياً</h2>
              <p style={{ textWrap: 'balance' }}>
                تُطوّر Haa Soft عدداً من المنتجات البرمجيّة للسوق السعودي. تجد القائمة
                الكاملة والمحدّثة على الموقع الرسمي للشركة الأم.
              </p>
            </div>
            <div className="lp-feats reveal-stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', maxWidth: 760, margin: '0 auto' }}>
              <div className="lp-feat">
                <div className="lp-feat__ic">
                  <ShoppingBag size={24} />
                </div>
                <h3>متاجر هاء</h3>
                <p>منصّة التجارة الإلكترونية للتجار السعوديين — هذا المنتج.</p>
              </div>
              <div className="lp-feat">
                <div className="lp-feat__ic">
                  <LinkIcon size={24} />
                </div>
                <h3>منتجات Haa Soft الأخرى</h3>
                <p>
                  للاطّلاع على بقية منتجات وحلول هاء سوفت، يُرجى زيارة الموقع الرسمي{' '}
                  <a href="https://haasoft.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                    haasoft.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Legal entity ────────────────────────────────── */}
        <section id="legal" className="lp-sec" style={{ paddingTop: 0 }}>
          <div className="lp-container">
            <div className="lp-sec__head reveal">
              <div className="lp-sec__eyebrow">الكيان القانوني</div>
              <h2>منشأة رسميّة ومسجّلة في المملكة</h2>
            </div>
            <div className="lp-feats reveal" style={{ gridTemplateColumns: '1fr', maxWidth: 720, margin: '0 auto' }}>
              <div className="lp-feat">
                <div className="lp-feat__ic">
                  <ShieldCheck size={24} />
                </div>
                <h3>{PLATFORM_LEGAL_ENTITY.legalNameAr}</h3>
                <p>
                  السجل التجاري:{' '}
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                    {PLATFORM_LEGAL_ENTITY.commercialRegistration}
                  </span>
                  <br />
                  جهة الإصدار: المملكة العربية السعودية · الحالة: نشطة.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Contact ─────────────────────────────────────── */}
        <section id="contact" className="lp-sec" style={{ paddingTop: 0 }}>
          <div className="lp-container">
            <div className="lp-sec__head reveal">
              <div className="lp-sec__eyebrow">التواصل</div>
              <h2>كيف نصلك</h2>
            </div>
            <div className="lp-feats reveal-stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', maxWidth: 760, margin: '0 auto' }}>
              <a className="lp-feat" href="mailto:hello@haastores.com" style={{ textDecoration: 'none' }}>
                <div className="lp-feat__ic">
                  <Mail size={24} />
                </div>
                <h3>البريد الرسمي</h3>
                <p dir="ltr" style={{ unicodeBidi: 'isolate' }}>hello@haastores.com</p>
              </a>
              <Link className="lp-feat" to="/" style={{ textDecoration: 'none' }}>
                <div className="lp-feat__ic">
                  <Users size={24} />
                </div>
                <h3>الدعم والمبيعات</h3>
                <p>تواصل معنا من نموذج الاتصال على الصفحة الرئيسيّة، نردّ خلال يوم عمل واحد.</p>
              </Link>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <section className="lp-cta">
          <div className="lp-container">
            <div className="lp-cta__in reveal">
              <div className="lp-cta__pattern" />
              <h2>جاهز تطلق متجرك مع متاجر هاء؟</h2>
              <p>انضم لأكثر من ١٢٠٠ تاجر يبيعون بثقة عبر منصّتنا.</p>
              <div className="lp-cta__btn">
                <StoreButton size="lg" iconEnd={<ArrowLeft size={18} />} href="/signup">
                  ابدأ متجرك
                </StoreButton>
                <StoreButton size="lg" variant="secondary" href="/#contact">
                  تواصل مع المبيعات
                </StoreButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="lp-foot">
        <div className="lp-container">
          <div className="lp-foot__grid">
            <div className="lp-foot__brand">
              <Link to="/" className="lp-logo">
                <img src="/assets/haa-stores-logo.png" alt="هاء متاجر" style={{ height: 36 }} />
              </Link>
              <p>منصّة المتاجر السعوديّة الأسهل والأوضح ماليّاً وتشغيليّاً. منتج من Haa Soft.</p>
            </div>
            <div className="lp-foot__col">
              <h4>المنتج</h4>
              <Link to="/#features">المزايا</Link>
              <Link to="/#pricing">الأسعار</Link>
            </div>
            <div className="lp-foot__col">
              <h4>الشركة</h4>
              <Link to="/about">من نحن</Link>
              <a href="https://haasoft.com" target="_blank" rel="noopener noreferrer">
                Haa Soft
              </a>
              <a href="mailto:hello@haastores.com">تواصل معنا</a>
            </div>
            <div className="lp-foot__col">
              <h4>القانوني</h4>
              <Link to="/legal/terms">الشروط</Link>
              <Link to="/legal/privacy">الخصوصيّة</Link>
            </div>
          </div>
          <div className="lp-foot__bottom">
            <div className="lp-foot__copy">© 2026 هاء متاجر · جميع الحقوق محفوظة</div>
          </div>
          <p className="lp-legal-entity" dir="rtl">
            {PLATFORM_LEGAL_ENTITY.displayLine}
          </p>
        </div>
      </footer>

      <BackToTop />
    </div>
  );
}
