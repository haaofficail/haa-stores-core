// Platform "About" — Haa-native identity.
//
// Earlier revision experimented with an editorial-magazine vocabulary
// (Reem Kufi display, El Messiri serif, ivory paper). Owner asked to
// re-align with the live brand: white surface, Apple-style ink
// (#1d1d1f), single Haa-blue accent, IBM Plex Sans Arabic only, and
// the same layered shadow + 24px card vocabulary the landing uses.
//
// Single source of truth for the legal entity remains
// `@haa/shared` PLATFORM_LEGAL_ENTITY. The "status" field is
// intentionally not surfaced (a live page implies the registration is
// active; restating it adds visual noise + maintenance burden).

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { PLATFORM_LEGAL_ENTITY } from '@haa/shared';
import { PlatformShell } from '@/components/platform/PlatformShell';
import './settings-about-editorial.css';

/* ─── primitives ─────────────────────────────────────────── */

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
  return <div ref={ref} className="about-ed__progress" aria-hidden="true" />;
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

/* ─── page ───────────────────────────────────────────────── */

export default function PlatformAbout() {
  useSEO({
    title: 'من نحن — متاجر هاء',
    description:
      'متاجر هاء — منصة سعودية لإطلاق وإدارة المتاجر الإلكترونية، من إنتاج Haa Soft. متجر جاهز، دفع محلي، شحن مدمج، وقرارات أذكى.',
  });

  const root = useScrollReveal();

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
    <div ref={root} className="about-ed overflow-x-hidden" dir="rtl" lang="ar">
      <ScrollProgress />

      <main className="about-ed__wrap">
        {/* ─────────── Hero ─────────── */}
        <header className="about-ed__hero">
          <span className="about-ed__eyebrow">منتج من هاء سوفت · Haa Soft</span>

          <h1 className="about-ed__hero-title">
            متجر إلكتروني سعودي،
            <br />
            <em>كما يجب أن يكون.</em>
          </h1>

          <p className="about-ed__hero-lede">
            بُنيت متاجر هاء لتمنح التاجر السعودي أداةً تليق بمنتجه —
            هادئة في تصميمها، عميقة في تفاصيلها، ومتوافقة كلياً مع
            السوق المحلي من اللحظة الأولى.
          </p>

          <div className="about-ed__hero-actions">
            <Link to="/signup?ref=about" className="about-ed__btn about-ed__btn--primary">
              ابدأ متجرك مجاناً
              <span className="pa-arrow" aria-hidden="true">←</span>
            </Link>
            <a href="/#contact" className="about-ed__btn about-ed__btn--ghost">
              تواصل مع المبيعات
            </a>
          </div>

          <dl className="about-ed__hero-meta">
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
        <section className="about-ed__section about-ed__section--soft">
          <div className="about-ed__section-head" data-reveal>
            <p className="about-ed__section-eyebrow">القصّة</p>
            <h2 className="about-ed__section-title">بداية من فجوة، لا من فكرة.</h2>
          </div>

          <article className="about-ed__story" data-reveal data-reveal-delay="1">
            <p>
              رأينا التجار السعوديين يبيعون بأدوات صُمّمت لأسواق أخرى:
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
              منتجات برمجية للسوق المحلّي. كل سطر شفرة، كل ركن من لوحة
              التحكم، كل قرار تصميمي: مكتوب لأجل التاجر الذي سيستخدم
              الأداة، لا لأجل عرض تقني.
            </p>
          </article>
        </section>

        {/* ─────────── Provenance ─────────── */}
        <section className="about-ed__section about-ed__section--soft">
          <div className="about-ed__section-head" data-reveal>
            <p className="about-ed__section-eyebrow">الكيان القانوني</p>
            <h2 className="about-ed__section-title">مُسجَّلون. موثَّقون. مسؤولون.</h2>
            <p className="about-ed__section-lede">
              نعمل تحت كيان تجاري سعودي مُسجَّل رسمياً — اسم وعنوان
              ومسؤولية وراء كل قرار.
            </p>
          </div>

          <div className="about-ed__entity" data-reveal data-reveal-delay="1">
            <div className="about-ed__entity-inner">
              <p className="about-ed__entity-label">شهادة الكيان</p>
              <h3 className="about-ed__entity-name">{PLATFORM_LEGAL_ENTITY.legalNameAr}</h3>
              <dl className="about-ed__entity-rows">
                <div className="about-ed__entity-row">
                  <dt>السجل التجاري</dt>
                  <dd dir="ltr">{PLATFORM_LEGAL_ENTITY.commercialRegistration}</dd>
                </div>
                <div className="about-ed__entity-row">
                  <dt>جهة الإصدار</dt>
                  <dd>المملكة العربية السعودية</dd>
                </div>
                <div className="about-ed__entity-row">
                  <dt>الاسم بالإنجليزية</dt>
                  <dd dir="ltr">{PLATFORM_LEGAL_ENTITY.legalNameEn}</dd>
                </div>
              </dl>
            </div>
          </div>

          <a
            className="about-ed__anchor"
            href="https://haasoft.com"
            target="_blank"
            rel="noopener noreferrer"
            data-reveal
            data-reveal-delay="2"
          >
            <p className="about-ed__anchor-label">الانتماء — Affiliation</p>
            <p className="about-ed__anchor-text">
              متاجر هاء واحد من منتجات <strong>Haa Soft</strong> —
              بيتٍ تقني سعودي يبني أدوات برمجية للسوق المحلّي.
            </p>
            <span className="about-ed__anchor-link">
              زُر haasoft.com
              <span aria-hidden="true">↗</span>
            </span>
          </a>
        </section>

        {/* ─────────── CTA ─────────── */}
        <section className="about-ed__cta">
          <div data-reveal>
            <h2 className="about-ed__cta-title">
              أطلق متجرك في دقائق <em>لا أيام.</em>
            </h2>
            <div className="about-ed__hero-actions" style={{ marginTop: 0 }}>
              <Link to="/signup?ref=about-cta" className="about-ed__btn about-ed__btn--primary">
                ابدأ متجرك مجاناً
                <span className="pa-arrow" aria-hidden="true">←</span>
              </Link>
              <a href="/#contact" className="about-ed__btn about-ed__btn--ghost">
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
