// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- landing page icon bundle
import {
  Sparkles, ArrowLeft, ArrowUp, Play, CheckCircle, Lock,
  ShoppingBag, TrendingUp, Palette, CreditCard, Truck,
  BarChart3, Megaphone, Smartphone, Shuffle, Wallet,
  LayoutDashboard, CircleDollarSign, ShoppingCart, Users,
  PenLine, Wand2, Flame, MessageCircle, Store,
  Search, LayoutGrid, BadgeCheck, Plus, Star,
  LucideIcon,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { merchantDashboardUrl } from '@/lib/merchant';
import { StoreButton } from '@/components/ui';
import { SarIcon } from '@/components/ui/SarIcon';
import '@/landing/landing.css';

/* ─── data ─────────────────────────────────────────────────── */

const FEATURES: [LucideIcon, string, string][] = [
  [Palette,       'ثيمات جاهزة وأنيقة',              'اختر من تشكيلة قوالب احترافية، وعدّلها بنفسك بدون أي كود — متجرك يعكس هويتك.'],
  [CreditCard,    'دفع سعودي متكامل',                 'مدى، Apple Pay، STC Pay، وتقسيط عبر تابي وتمارا — كل وسائل الدفع المحلية جاهزة.'],
  [Truck,         'شحن مدمج',                          'تكامل مباشر مع شركات الشحن، وتتبّع آلي للطلبات من لوحة واحدة.'],
  [BarChart3,     'تحليلات لحظية',                     'تابع مبيعاتك وزوّارك ومعدل التحويل لحظة بلحظة، واتخذ قرارات أذكى.'],
  [Megaphone,     'أدوات تسويق',                       'كوبونات، عروض، وحملات تسويقية مدمجة لزيادة مبيعاتك بلا أدوات خارجية.'],
  [Smartphone,    'متجر يعمل بأناقة',                  'تجربة سلسة على الجوال والحاسب، سريعة ومحسّنة لمحركات البحث.'],
  [Sparkles,      'هاء AI الذكي',                      'مساعد ذكاء اصطناعي يقترح منتجاتك، يكتب أوصافها، ويردّ على عملائك تلقائيًا.'],
  [Shuffle,       'البيع والتزامن متعدد القنوات',       'بِع في سلّة ونون وأمازون وزد، ورحّل بياناتك بضغطة — مع مزامنة المخزون والطلبات.'],
  [Wallet,        'عمولة صفر على مبيعاتك',             'احتفظ بكامل أرباحك — بدون أي عمولة على الطلبات، وتسويات فورية إلى محفظتك.'],
];

const STEPS: [string, string][] = [
  ['أنشئ حسابك',   'سجّل مجانًا خلال أقل من دقيقة — بدون بطاقة ائتمان.'],
  ['جهّز متجرك',   'اختر ثيمًا، أضف منتجاتك، واربط وسيلة الدفع والشحن.'],
  ['ابدأ البيع',    'انشر متجرك واستقبل أول طلب — نحن نتكفّل بالباقي.'],
];

const QUOTES: [string, string, string][] = [
  ['غيّرت هاء متاجر طريقة إدارتي لمتجري بالكامل. أطلقت المتجر في يوم واحد وبدأت أبيع فورًا.', 'نورة الشمري',     'متجر أزياء · الرياض'],
  ['الدفع بالتقسيط عبر تابي وتمارا رفع مبيعاتي ٤٠٪. التكامل كان جاهزًا بدون أي إعداد.',       'عبدالله القحطاني', 'إلكترونيات · الدمام'],
  ['لوحة التحكم واضحة وبسيطة، والتقارير ساعدتني أفهم عملائي وأتخذ قرارات أذكى.',               'سارة الدوسري',     'عناية وتجميل · جدة'],
];

const FAQ_DATA: [string, string][] = [
  ['هل أحتاج خبرة تقنية لإنشاء متجري؟',         'إطلاقًا. كل شيء بالسحب والإفلات بدون أي برمجة — تختار ثيمًا، تضيف منتجاتك، وتنشر متجرك في دقائق.'],
  ['ما وسائل الدفع المدعومة؟',                    'مدى، Apple Pay، STC Pay، فيزا وماستركارد، بالإضافة للتقسيط عبر تابي وتمارا — كلها مفعّلة وجاهزة.'],
  ['هل يمكنني الإلغاء في أي وقت؟',               'نعم، بضغطة واحدة وبدون أي التزام. الباقة المجانية تبقى مجانية دائمًا للبدء.'],
  ['هل متجري متوافق مع الأنظمة السعودية؟',        'نعم، المنصة متوافقة مع متطلبات هيئة الزكاة والضريبة ووزارة التجارة، مع فوترة إلكترونية مدمجة.'],
  ['كيف يصل منتجي للعميل؟',                       'عبر تكامل مباشر مع أرامكس وسمسا وريدبوكس — تطبع بوليصة الشحن وتتبّع الطلب آليًا من لوحة واحدة.'],
  ['هل يظهر متجري في سوق هاء الموحّد؟',          'نعم، منتجاتك تظهر تلقائيًا في سوق هاء أمام آلاف العملاء يوميًا، فتصلك مبيعات إضافية بلا أي جهد تسويقي.'],
  ['هل أستطيع ربط نطاقي الخاص؟',                 'بالتأكيد. تربط نطاقك (.com أو .sa) بمتجرك بخطوات بسيطة، أو تستخدم نطاقًا فرعيًا مجانيًا على haastores.com.'],
  ['ما المدة لاستلام أرباحي؟',                     'تُحوّل أرباحك إلى محفظتك فور تأكيد الطلب، وتسحبها إلى حسابك البنكي في أي وقت خلال أيام عمل قليلة.'],
];

interface LpProduct {
  name: string;
  categoryName: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  purchaseCount?: number;
  bnpl?: boolean;
  badgeText?: string;
  store?: string;
  image: string;
}

const MOCK_PRODUCTS: LpProduct[] = [
  { name: 'سماعة لاسلكية AirPods Pro', categoryName: 'إلكترونيات', price: 299, compareAtPrice: 449, rating: 5, reviewCount: 128, bnpl: true, image: '/assets/products/airpods.png' },
  { name: 'ساعة ذكية رياضية',          categoryName: 'إلكترونيات', price: 899, rating: 4, reviewCount: 64, bnpl: true, badgeText: 'جديد', image: '/assets/products/smartwatch.png' },
];

const MARKET_PRODUCTS: LpProduct[] = [
  { name: 'عطر فاخر شرقي',     categoryName: 'عناية', price: 189, compareAtPrice: 250, rating: 5, reviewCount: 92,  purchaseCount: 340, bnpl: true, store: 'متجر العود',    image: '/assets/products/perfume.png' },
  { name: 'حقيبة يد جلدية',    categoryName: 'أزياء', price: 320, compareAtPrice: 420, rating: 4, reviewCount: 41,  purchaseCount: 128, bnpl: true, store: 'متجر الأناقة', image: '/assets/products/bag.webp' },
  { name: 'قهوة مختصة ٢٥٠غ',   categoryName: 'أطعمة', price: 65,  compareAtPrice: 85,  rating: 5, reviewCount: 213, purchaseCount: 510, bnpl: true, store: 'محمصة البن',   image: '/assets/products/coffee.png' },
  { name: 'سجادة صلاة فاخرة',  categoryName: 'منزل',  price: 145, compareAtPrice: 199, rating: 4, reviewCount: 28,  purchaseCount: 95,  bnpl: true, store: 'بيت السجاد',   image: '/assets/products/prayer-rug.png' },
];

/* ─── helpers ───────────────────────────────────────────────── */

function Ck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
}

function LpAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return <span className="lp-avatar">{initials}</span>;
}

function LpProductCard({ product }: { product: LpProduct }) {
  const savings = product.compareAtPrice ? Math.round(product.compareAtPrice - product.price) : 0;
  const savingsPct = product.compareAtPrice ? Math.round((savings / product.compareAtPrice) * 100) : 0;
  return (
    <div className="lp-pcard">
      {product.badgeText && <span className="lp-pcard__badge">{product.badgeText}</span>}
      {savingsPct > 0 && <span className="lp-pcard__save">خصم {savingsPct}٪</span>}
      <div className="lp-pcard__img">
        <img src={product.image} alt={product.name} loading="lazy" />
      </div>
      <div className="lp-pcard__body">
        <span className="lp-pcard__cat">{product.categoryName}</span>
        <p className="lp-pcard__name">{product.name}</p>
        <div className="lp-pcard__price">
          <span className="lp-pcard__now" dir="ltr">
            {product.price.toLocaleString('ar-SA-u-nu-arab')} <SarIcon />
          </span>
          {product.compareAtPrice && (
            <span className="lp-pcard__was" dir="ltr">
              {product.compareAtPrice.toLocaleString('ar-SA-u-nu-arab')}
            </span>
          )}
        </div>
        {product.bnpl && (
          <div className="lp-pcard__bnpl">
            <img src="/assets/payment-logos/trim/tabby.png" alt="tabby" />
            <img src="/assets/payment-logos/trim/tamara.png" alt="تمارا" />
            <span>التقسيط متاح</span>
          </div>
        )}
        {product.reviewCount > 0 && (
          <div className="lp-pcard__stars">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} style={{ color: i < product.rating ? '#ff9500' : '#d2d2d7', width: 12, height: 12, display: 'inline-block' }}>
                <StarIcon />
              </span>
            ))}
            <span className="lp-pcard__rc">({product.reviewCount})</span>
          </div>
        )}
        {product.purchaseCount && (
          <div className="lp-pcard__purchases">{product.purchaseCount.toLocaleString('ar-SA-u-nu-arab')} مشتري</div>
        )}
      </div>
    </div>
  );
}

const STARTER_CHIPS: [LucideIcon, string][] = [
  [Sparkles,      'أبي أبيع عطور'],
  [PenLine,       'اكتب وصف عطر'],
  [TrendingUp,    'وش الرائج؟'],
  [Star,          'اقترح سعر'],
  [MessageCircle, 'كيف أبدأ متجري؟'],
];

function ChatWidget() {
  const [msgs, setMsgs] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: 'أهلًا! أنا هاء AI خبّرني وش تبي تبيع وأساعدك تختار منتجاتك وتبدأ متجرك في دقائق.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [chipsVisible, setChipsVisible] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, busy]);

  const DEMO_REPLIES: Record<string, string> = {
    'أبي أبيع عطور':   'رائع! قطاع العطور الشرقية من الأكثر رواجًا في السعودية. أنصحك بالبدء بـ ٥-١٠ عطور مميزة بأسعار متنوعة. هل تبيع عطور شرقية أم غربية أم كلاهما؟',
    'اكتب وصف عطر':    '**عطر فاخر شرقي:** "مزيج ساحر من العود الكمبودي والورد الطائفي مع لمسة مسك ناعمة — رائحة تدوم طويلًا وتمنحك حضورًا استثنائيًا في كل مناسبة."',
    'وش الرائج؟':       'الأكثر رواجًا الآن في السعودية: ١) العبايات المصمّمة، ٢) العطور الشرقية، ٣) منتجات العناية بالبشرة، ٤) الإكسسوارات، ٥) القهوة المختصة.',
    'اقترح سعر':        'للساعات الذكية المتوسطة: ٤٠٠-٨٠٠ ريال للبيع، وبعرض التقسيط عبر تابي/تمارا ترفع مبيعاتك ٤٠٪ لأن العميل يشعر بانخفاض السعر.',
    'كيف أبدأ متجري؟': 'سجّل مجانًا → اختر ثيمًا → أضف منتجاتك → ربط مدى وApple Pay → انشر وابدأ البيع. الوقت الفعلي أقل من ٣٠ دقيقة!',
  };

  const ask = (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    setInput('');
    setChipsVisible(false);
    setMsgs((prev) => [...prev, { role: 'user', text: question }]);
    setBusy(true);
    setTimeout(() => {
      const reply = DEMO_REPLIES[question] ?? 'تواصل معنا لتجربة هاء AI كاملًا بعد إنشاء متجرك المجاني على haastores.com';
      setMsgs((m) => [...m, { role: 'ai', text: reply }]);
      setBusy(false);
    }, 900);
  };

  const fmtMsg = (t: string) =>
    t.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
      seg.startsWith('**') && seg.endsWith('**')
        ? <strong key={j}>{seg.slice(2, -2)}</strong>
        : seg
    );

  return (
    <div className="lp-chat">
      <div className="lp-chat__head">
        <span className="lp-chat__avatar"><Sparkles size={20} /></span>
        <div className="lp-chat__title">
          <b>هاء AI</b>
          <span><span className="lp-chat__dot" /> متصل الآن</span>
        </div>
      </div>
      <div className="lp-chat__body" ref={bodyRef}>
        {msgs.map((m, i) =>
          m.role === 'ai' ? (
            <div key={i} className="lp-row lp-row--ai">
              <span className="lp-row__ava"><Sparkles size={16} /></span>
              <div className="lp-msg lp-msg--ai">{fmtMsg(m.text)}</div>
            </div>
          ) : (
            <div key={i} className="lp-msg lp-msg--user">{fmtMsg(m.text)}</div>
          )
        )}
        {busy && (
          <div className="lp-row lp-row--ai">
            <span className="lp-row__ava"><Sparkles size={16} /></span>
            <div className="lp-typing"><i /><i /><i /></div>
          </div>
        )}
      </div>
      {chipsVisible && !busy && (
        <div className="lp-chat__chips">
          {STARTER_CHIPS.map(([Icon, label]) => (
            <button key={label} className="lp-chat__chip" onClick={() => ask(label)}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      )}
      <form className="lp-chat__form" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <input
          className="lp-chat__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اسأل هاء AI عن منتجاتك…"
          aria-label="رسالتك"
        />
        <button className="lp-chat__send" type="submit" disabled={busy || !input.trim()} aria-label="إرسال">
          <ArrowUp size={18} />
        </button>
      </form>
    </div>
  );
}

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
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
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

export default function LandingPage() {
  useSEO({
    title: 'Haa Stores | هاء متاجر — أطلق متجرك الإلكتروني خلال دقيقة',
    description: 'منصة سعودية للتجارة الإلكترونية. ابدأ بيع منتجاتك بثيمات جاهزة، بوابات دفع محلية، ولوحة تحكم كاملة.',
  });

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal, .reveal-stagger');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      }),
      { threshold: 0.06 }
    );
    els.forEach((el) => io.observe(el));
    const vh = () => window.innerHeight || 800;
    const showInView = () => {
      document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible), .reveal-stagger:not(.is-visible)').forEach((el) => {
        if (el.getBoundingClientRect().top < vh() * 0.92) el.classList.add('is-visible');
      });
    };
    [0, 120, 350, 700].forEach((t) => t === 0 ? requestAnimationFrame(showInView) : setTimeout(showInView, t));
    const safety = setTimeout(() => els.forEach((el) => el.classList.add('is-visible')), 1400);
    return () => { io.disconnect(); clearTimeout(safety); };
  }, []);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 76, behavior: 'smooth' });
  };

  const [faqOpen, setFaqOpen] = useState(0);

  return (
    <div id="storefront-scope" className="lp-page">
      <ScrollProgress />

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-container lp-nav__in">
          <a href="/" className="lp-logo"><img src="/assets/haa-stores-logo.png" alt="هاء متاجر" /></a>
          <div className="lp-nav__links">
            <a href="#features"  onClick={go('features')}>المزايا</a>
            <a href="#ai"        onClick={go('ai')}>هاء AI</a>
            <a href="#market"    onClick={go('market')}>السوق</a>
            <a href="#showcase"  onClick={go('showcase')}>المنصة</a>
            <a href="#pricing"   onClick={go('pricing')}>الأسعار</a>
            <a href="#faq"       onClick={go('faq')}>الأسئلة</a>
          </div>
          <div className="lp-nav__cta">
            <StoreButton variant="ghost" size="sm" href={merchantDashboardUrl('/login')}>دخول</StoreButton>
            <StoreButton size="sm" iconEnd={<ArrowLeft size={16} />} href="/signup">ابدأ مجانًا</StoreButton>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <header className="lp-hero">
        <div className="lp-hero__glow" />
        <div className="lp-container lp-hero__in">
          <div className="reveal">
            <span className="lp-pill"><Sparkles size={14} /> منصة المتاجر السعودية الأحدث</span>
            <h1>أطلق متجرك الإلكتروني <b>خلال دقيقة</b></h1>
            <p className="lp-hero__sub">
              كل ما تحتاجه لبيع منتجاتك أونلاين — ثيمات أنيقة، دفع سعودي، وشحن مدمج.
              أسهل وأوضح ماليًا وتشغيليًا.
            </p>
            <div className="lp-hero__cta">
              <StoreButton size="lg" iconEnd={<ArrowLeft size={18} />} href="/signup">أنشئ متجري مجانًا</StoreButton>
              <StoreButton size="lg" variant="secondary" iconStart={<Play size={18} />} href="#ai" onClick={go('ai')}>شاهد العرض</StoreButton>
            </div>
            <div className="lp-hero__note">
              <span><CheckCircle size={15} /> مجاني للبدء</span>
              <span><CheckCircle size={15} /> بدون بطاقة ائتمان</span>
              <span><CheckCircle size={15} /> دعم ٢٤/٧</span>
            </div>
          </div>

          {/* Product mockup */}
          <div className="lp-mock reveal">
            <div className="lp-window">
              <div className="lp-window__bar">
                <div className="lp-dots">
                  <i style={{ background: '#ff5f57' }} />
                  <i style={{ background: '#febc2e' }} />
                  <i style={{ background: '#28c840' }} />
                </div>
                <div className="lp-url"><Lock size={11} /> haastores.com/متجر-الأناقة</div>
              </div>
              <div className="lp-shop">
                <div className="lp-shop__head">
                  <div className="lp-shop__brand"><span className="m">ه</span> متجر الأناقة</div>
                  <div className="lp-shop__nav"><span>الرئيسية</span><span>المنتجات</span><span>العروض</span></div>
                </div>
                <div className="lp-shop__banner">
                  <b>تخفيضات الموسم تصل ٥٠٪</b>
                  <span>توصيل سريع لكل مدن المملكة</span>
                </div>
                <div className="lp-shop__grid">
                  {MOCK_PRODUCTS.map((p, i) => <LpProductCard key={i} product={p} />)}
                </div>
              </div>
            </div>
            <div className="lp-fcard lp-fcard--1">
              <span className="lp-fcard__ic" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
                <ShoppingBag size={18} />
              </span>
              <div><b>+٢٤</b><span>طلب جديد اليوم</span></div>
            </div>
            <div className="lp-fcard lp-fcard--2">
              <span className="lp-fcard__ic" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
                <TrendingUp size={18} />
              </span>
              <div>
                <b style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, direction: 'ltr' }}>
                  ٣٬٨٤٠<SarIcon />
                </b>
                <span>مبيعات اليوم</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Marquee ─────────────────────────────────────── */}
      <section className="lp-marquee">
        <div className="lp-marquee__label">وسائل دفع وشحن سعودية موثوقة</div>
        <div className="lp-marquee__track">
          {[0, 1].map((g) => (
            <div className="lp-marquee__group" key={g} aria-hidden={g === 1}>
              <span className="lp-marquee__item"><img src="/assets/payment-logos/trim/mada.png"        alt="مدى"       /></span>
              <span className="lp-marquee__item"><img src="/assets/payment-logos/apple-pay.svg"        alt="Apple Pay" /></span>
              <span className="lp-marquee__item"><img src="/assets/payment-logos/stc-pay.svg"          alt="STC Pay"   /></span>
              <span className="lp-marquee__item"><img src="/assets/payment-logos/visa.svg"             alt="Visa"      /></span>
              <span className="lp-marquee__item"><img src="/assets/payment-logos/mastercard.svg"       alt="Mastercard"/></span>
              <span className="lp-marquee__item"><img src="/assets/payment-logos/trim/tabby.png"       alt="tabby"     /></span>
              <span className="lp-marquee__item"><img src="/assets/payment-logos/trim/tamara.png"      alt="تمارا"     /></span>
              <span className="lp-marquee__item ship"><img src="/assets/shipping-logos/aramex.svg"     alt="أرامكس"    /></span>
              <span className="lp-marquee__item ship"><img src="/assets/shipping-logos/redbox.svg"     alt="ريدبوكس"   /></span>
              <span className="lp-marquee__item ship spl"><img src="/assets/shipping-logos/spl.svg"    alt="سبل"       /></span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gov logos ────────────────────────────────────── */}
      <section className="lp-gov">
        <div className="lp-container">
          <div className="lp-gov__label">متوافق ومسجّل لدى الجهات الرسمية في المملكة</div>
          <div className="lp-gov__row reveal-stagger">
            <span className="lp-gov__chip"><img className="g-wide" src="/assets/payment-logos/trim/ministry-of-commerce.png" alt="وزارة التجارة"                  /></span>
            <span className="lp-gov__chip"><img src="/assets/payment-logos/trim/citc.png"                                     alt="هيئة الاتصالات وتقنية المعلومات" /></span>
            <span className="lp-gov__chip"><img src="/assets/payment-logos/trim/zatca.png"                                    alt="هيئة الزكاة والضريبة والجمارك"   /></span>
            <span className="lp-gov__chip"><img src="/assets/payment-logos/saudi-business-center.svg"                         alt="المركز السعودي للأعمال"           /></span>
          </div>
        </div>
      </section>

      {/* ── AI section ──────────────────────────────────── */}
      <section id="ai" className="lp-sec">
        <div className="lp-container">
          <div className="lp-ai reveal">
            <div className="lp-ai__mesh">
              <span className="lp-ai__orb lp-ai__orb-a" />
              <span className="lp-ai__orb lp-ai__orb-b" />
              <span className="lp-ai__orb lp-ai__orb-c" />
              <span className="lp-ai__orb lp-ai__orb-d" />
            </div>
            <div className="lp-ai__head">
              <span className="lp-ai__badge"><Sparkles size={15} /> مدعوم بالذكاء الاصطناعي</span>
              <h2>التق بـ <b>هاء AI</b> — مساعدك الذكي للبيع</h2>
              <p>قبل ما تشترك حتى، جرّبه الآن: اسأله عن منتجاتك، وخلّه يقترح ما يناسب السوق السعودي، يكتب الأوصاف، ويرتّب متجرك — بالعربية وفي ثوانٍ.</p>
            </div>
            <div className="lp-ai__bento">
              <ChatWidget />
              <div className="lp-ai__side">
                <div className="lp-ai__cell">
                  <span className="lp-ai__cell-ic"><PenLine size={20} /></span>
                  <h4>يكتب أوصاف منتجاتك</h4>
                  <div className="lp-ai__sample">
                    "عطر شرقي فاخر بمزيج العود والورد، يدوم طويلًا ويمنحك حضورًا آسرًا في كل مناسبة."
                    <span className="lp-ai__cursor" />
                  </div>
                </div>
                <div className="lp-ai__cell">
                  <span className="lp-ai__cell-ic"><Wand2 size={20} /></span>
                  <h4>يقترح منتجات رائجة</h4>
                  <div className="lp-ai__tags">
                    <span><Flame size={12} /> عبايات مصمّمة</span>
                    <span>عطور شرقية</span>
                    <span>عناية بالبشرة</span>
                    <span>إكسسوارات</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section id="features" className="lp-sec">
        <div className="lp-container">
          <div className="lp-sec__head reveal">
            <div className="lp-sec__eyebrow">المزايا</div>
            <h2>كل ما تحتاجه لتنجح</h2>
            <p>أدوات متكاملة صُممت خصيصًا للسوق السعودي، تدير متجرك من الألف إلى الياء.</p>
          </div>
          <div className="lp-feats reveal-stagger">
            {FEATURES.map(([Icon, title, desc]) => (
              <div className="lp-feat" key={title}>
                <div className="lp-feat__ic"><Icon size={24} /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Migration funnel ─────────────────────────────── */}
      <section id="migrate" className="lp-sec" style={{ paddingTop: 0 }}>
        <div className="lp-container">
          <div className="lp-mig__grid">
            <div className="lp-funnel reveal">
              <div className="lp-funnel__row">
                {([
                  ['/assets/channel-logos/salla-trim.png',  'سلّة'],
                  ['/assets/channel-logos/noon-trim.png',   'نون'],
                  ['/assets/channel-logos/amazon-trim.png', 'أمازون'],
                  ['/assets/channel-logos/zid-trim.png',    'زد'],
                ] as [string, string][]).map(([src, alt]) => (
                  <span key={alt} className="lp-funnel__chan">
                    <span className="lp-funnel__logo lp-funnel__logo--img"><img src={src} alt={alt} /></span>
                    {alt}
                  </span>
                ))}
              </div>
              <div className="lp-funnel__pipe">
                <span className="lp-funnel__flow" />
                <span className="lp-funnel__flow" style={{ animationDelay: '.6s' }} />
                <span className="lp-funnel__flow" style={{ animationDelay: '1.2s' }} />
              </div>
              <div className="lp-funnel__hub">
                <span className="lp-funnel__hub-mark"><LayoutDashboard size={22} /></span>
                <div><b>لوحة هاء الموحّدة</b><span>كل طلباتك ومخزونك في مكان واحد</span></div>
                <span className="lp-funnel__live"><span className="lp-chat__dot" /> مُزامن</span>
              </div>
            </div>
            <div className="lp-mig__copy reveal">
              <div className="lp-sec__eyebrow">قنوات بيع متعددة</div>
              <h2>بِع في كل مكان، وأدِر من مكان واحد</h2>
              <p>متجرك على هاء ليس جزيرة معزولة — اربطه بسلّة ونون وأمازون وزد، وأدِر منتجاتك وطلباتك ومخزونك من لوحة واحدة.</p>
              <ul className="lp-mig__list">
                <li><span className="lp-mig__ck"><Ck /></span> ترحيل منتجاتك وعملائك وطلباتك بضغطة واحدة</li>
                <li><span className="lp-mig__ck"><Ck /></span> مزامنة المخزون والأسعار عبر كل القنوات</li>
                <li><span className="lp-mig__ck"><Ck /></span> طلبات كل المنصّات في لوحة تحكم موحّدة</li>
              </ul>
              <StoreButton size="lg" iconEnd={<ArrowLeft size={18} />} href="/signup">رحّل متجرك مجانًا</StoreButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── Showcase ─────────────────────────────────────── */}
      <section id="showcase" className="lp-sec" style={{ paddingTop: 0 }}>
        <div className="lp-container">
          <div className="lp-show reveal">
            <div className="lp-show__media">
              <div className="lp-kpis">
                {([
                  [CircleDollarSign, 'var(--color-primary-50)', 'var(--color-primary-600)', '+١٢٪', ['٣٬٨٤٠', true], 'مبيعات اليوم'],
                  [ShoppingCart,     'var(--color-primary-50)', 'var(--color-primary-600)', '+٨٪',  ['٢٤', false],   'طلبات اليوم'],
                  [Users,            '#fff4e5',                 'var(--color-warning)',      '+٥٪',  ['٦١٢', false],  'زوّار اليوم'],
                  [TrendingUp,       'var(--color-primary-50)', 'var(--color-primary-600)', '+١٪',  ['٣٫٩٪', false], 'معدل التحويل'],
                ] as [LucideIcon, string, string, string, [string, boolean], string][]).map(([Icon, bg, color, delta, [val, withSar], label]) => (
                  <div className="lp-kpi" key={label}>
                    <div className="lp-kpi__t">
                      <span className="lp-kpi__ic" style={{ background: bg, color }}><Icon size={18} /></span>
                      <span className="lp-kpi__d">{delta}</span>
                    </div>
                    <div className="lp-kpi__v" style={withSar ? { display: 'inline-flex', alignItems: 'baseline', gap: 3, direction: 'ltr' } : undefined}>
                      {val}{withSar && <SarIcon />}
                    </div>
                    <div className="lp-kpi__l">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="lp-show__eyebrow">لوحة تحكم ذكية</div>
              <h3>تابع متجرك لحظة بلحظة</h3>
              <p>كل أرقامك في مكان واحد — المبيعات، الطلبات، الزوّار، والمخزون.</p>
              <ul className="lp-show__list">
                <li><span className="lp-show__ck"><Ck /></span> تقارير مبيعات لحظية ورسوم بيانية</li>
                <li><span className="lp-show__ck"><Ck /></span> تنبيهات تلقائية لنقص المخزون</li>
                <li><span className="lp-show__ck"><Ck /></span> إدارة الطلبات والعملاء من شاشة واحدة</li>
              </ul>
            </div>
          </div>
          <div className="lp-show lp-show--flip reveal">
            <div className="lp-show__media">
              <div className="lp-shop__grid">
                {MOCK_PRODUCTS.map((p, i) => <LpProductCard key={i} product={{ ...p, purchaseCount: 120 + i * 60 }} />)}
              </div>
            </div>
            <div>
              <div className="lp-show__eyebrow">واجهة متجر راقية</div>
              <h3>متجر يبيع عنك</h3>
              <p>بطاقات منتجات أنيقة تُبرز السعر والتوفير والدليل الاجتماعي.</p>
              <ul className="lp-show__list">
                <li><span className="lp-show__ck"><Ck /></span> عرض واضح للسعر والخصم والتوفير</li>
                <li><span className="lp-show__ck"><Ck /></span> دليل اجتماعي حيّ يحفّز الشراء</li>
                <li><span className="lp-show__ck"><Ck /></span> خيارات تقسيط مدمجة في البطاقة</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marketplace ──────────────────────────────────── */}
      <section id="market" className="lp-sec" style={{ paddingTop: 0 }}>
        <div className="lp-container">
          <div className="lp-market reveal">
            <div className="lp-market__bg" />
            <div className="lp-market__in">
              <div className="lp-market__copy">
                <span className="lp-pill" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>
                  <Store size={15} /> سوق هاء الموحّد
                </span>
                <h2>منتجاتك تصل لآلاف العملاء في <b>سوق واحد</b></h2>
                <p>منتجاتك تظهر تلقائيًا في <b>سوق هاء</b> — وجهة تسوّق موحّدة يكتشف فيها آلاف العملاء يوميًا.</p>
                <ul className="lp-market__list">
                  <li><Search size={16} /> ظهور منتجاتك أمام عملاء جدد يبحثون يوميًا</li>
                  <li><LayoutGrid size={16} /> تصفّح حسب الفئات والمتاجر والعروض</li>
                  <li><BadgeCheck size={16} /> متاجر موثّقة تزيد ثقة المشتري</li>
                </ul>
                <div className="lp-market__stats">
                  <div className="lp-market__stat"><b>+٥٠ ألف</b><span>منتج معروض</span></div>
                  <div className="lp-market__stat"><b>+١٢٠٠</b><span>متجر موثّق</span></div>
                  <div className="lp-market__stat"><b>+١٠٠ ألف</b><span>زائر شهريًا</span></div>
                </div>
                <StoreButton size="lg" variant="secondary" iconEnd={<ArrowLeft size={18} />} href="/market">اكتشف السوق</StoreButton>
              </div>
              <div className="lp-market__grid-wrap">
                <div className="lp-market__cats">
                  <span className="lp-market__cat is-on"><Flame size={13} /> الأكثر رواجًا</span>
                  <span className="lp-market__cat">إلكترونيات</span>
                  <span className="lp-market__cat">أزياء</span>
                  <span className="lp-market__cat">عناية</span>
                  <span className="lp-market__cat">منزل</span>
                </div>
                <div className="lp-market__grid">
                  {MARKET_PRODUCTS.map((p, i) => (
                    <div className="lp-market__card" key={i}>
                      <span className="lp-market__store"><Store size={12} /> {p.store}</span>
                      <LpProductCard product={p} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Steps ────────────────────────────────────────── */}
      <section id="how" className="lp-sec" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-primary-500) 4%, var(--surface-1)), var(--surface-1))' }}>
        <div className="lp-container">
          <div className="lp-sec__head reveal">
            <div className="lp-sec__eyebrow">كيف يعمل</div>
            <h2>٣ خطوات وتبدأ البيع</h2>
          </div>
          <div className="lp-steps reveal-stagger">
            {STEPS.map(([title, desc], i) => (
              <div className="lp-step" key={title}>
                <div className="lp-step__num">{i + 1}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="lp-sec">
        <div className="lp-container">
          <div className="lp-sec__head reveal">
            <div className="lp-sec__eyebrow">آراء التجار</div>
            <h2>يثقون بنا وينمون معنا</h2>
            <p>أكثر من ١٢٠٠ تاجر سعودي يديرون متاجرهم عبر هاء متاجر.</p>
          </div>
          <div className="lp-quotes reveal-stagger">
            {QUOTES.map(([q, name, role]) => (
              <div className="lp-quote" key={name}>
                <div className="lp-quote__stars">
                  {[0,1,2,3,4].map((i) => (
                    <span key={i} style={{ width: 14, height: 14, display: 'inline-block', color: '#ff9500' }}>
                      <StarIcon />
                    </span>
                  ))}
                </div>
                <p>"{q}"</p>
                <div className="lp-quote__by">
                  <LpAvatar name={name} />
                  <div><b>{name}</b><span>{role}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────── */}
      <section id="pricing" className="lp-sec" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-primary-500) 4%, var(--surface-1)), var(--surface-1))' }}>
        <div className="lp-container">
          <div className="lp-sec__head reveal">
            <div className="lp-sec__eyebrow">الأسعار</div>
            <h2>باقات تناسب نموّك</h2>
            <p>ابدأ مجانًا، وارتقِ متى ما كبر متجرك. بدون رسوم خفية.</p>
          </div>
          <div className="lp-plans reveal-stagger">
            <div className="lp-plan">
              <h3>المجانية</h3>
              <div className="lp-plan__price"><b>0</b><SarIcon /><span>/شهريًا</span></div>
              <p className="lp-plan__desc">للبدء وتجربة المنصة</p>
              <ul>
                <li><span className="lp-plan__check"><Ck /></span> حتى ٢٠ منتج</li>
                <li><span className="lp-plan__check"><Ck /></span> ثيم واحد</li>
                <li><span className="lp-plan__check"><Ck /></span> دفع مدى و Apple Pay</li>
                <li><span className="lp-plan__check"><Ck /></span> دعم بالبريد</li>
              </ul>
              <StoreButton variant="secondary" size="lg" className="w-full" href="/signup">ابدأ مجانًا</StoreButton>
            </div>
            <div className="lp-plan lp-plan--pro">
              <span className="lp-plan__tag">الأكثر شيوعًا</span>
              <h3>الاحترافية</h3>
              <div className="lp-plan__price"><b>٢٩٩</b><SarIcon /><span>/شهريًا</span></div>
              <p className="lp-plan__desc">لمتجر ينمو بسرعة</p>
              <ul>
                <li><span className="lp-plan__check"><Ck /></span> منتجات غير محدودة</li>
                <li><span className="lp-plan__check"><Ck /></span> كل الثيمات + تخصيص كامل</li>
                <li><span className="lp-plan__check"><Ck /></span> تقسيط تابي وتمارا</li>
                <li><span className="lp-plan__check"><Ck /></span> تحليلات متقدمة وأدوات تسويق</li>
                <li><span className="lp-plan__check"><Ck /></span> دعم أولوية ٢٤/٧</li>
              </ul>
              <StoreButton size="lg" className="w-full" iconEnd={<ArrowLeft size={18} />} href="/signup?plan=pro">جرّب ١٤ يوم مجانًا</StoreButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section id="faq" className="lp-sec">
        <div className="lp-container">
          <div className="lp-sec__head reveal">
            <div className="lp-sec__eyebrow">الأسئلة الشائعة</div>
            <h2>كل ما تريد معرفته</h2>
          </div>
          <div className="lp-faq reveal">
            {FAQ_DATA.map(([q, a], i) => (
              <div key={i} className={`lp-faq__item${faqOpen === i ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="lp-faq__q"
                  onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}
                  aria-expanded={faqOpen === i}
                >
                  {q} <Plus size={20} />
                </button>
                {faqOpen === i && <p className="lp-faq__a">{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-container">
          <div className="lp-cta__in reveal">
            <div className="lp-cta__pattern" />
            <h2>جاهز تطلق متجرك؟</h2>
            <p>انضم لأكثر من ١٢٠٠ تاجر يبيعون بثقة عبر هاء متاجر.</p>
            <div className="lp-cta__btn">
              <StoreButton size="lg" iconEnd={<ArrowLeft size={18} />} href="/signup">أنشئ متجري الآن</StoreButton>
              <StoreButton size="lg" variant="secondary" href="/contact">تحدّث مع المبيعات</StoreButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="lp-foot">
        <div className="lp-container">
          <div className="lp-foot__grid">
            <div className="lp-foot__brand">
              <a href="/" className="lp-logo"><img src="/assets/haa-stores-logo.png" alt="هاء متاجر" style={{ height: 36 }} /></a>
              <p>منصة المتاجر السعودية الأسهل والأوضح ماليًا وتشغيليًا. أطلق متجرك وابدأ البيع اليوم.</p>
            </div>
            <div className="lp-foot__col">
              <h4>المنتج</h4>
              <a href="#features" onClick={go('features')}>المزايا</a>
              <a href="#pricing"  onClick={go('pricing')}>الأسعار</a>
              <a href="#showcase" onClick={go('showcase')}>المنصة</a>
            </div>
            <div className="lp-foot__col">
              <h4>الشركة</h4>
              <Link to="/about">من نحن</Link>
              <Link to="/blog">المدوّنة</Link>
              <Link to="/contact">تواصل معنا</Link>
            </div>
            <div className="lp-foot__col">
              <h4>الدعم</h4>
              <a href="#faq" onClick={go('faq')}>الأسئلة الشائعة</a>
              <Link to="/help">مركز المساعدة</Link>
              <Link to="/privacy">الشروط والخصوصية</Link>
            </div>
          </div>
          <div className="lp-foot__bottom">
            <div className="lp-saudi-made">
              <img src="/assets/saudi-map.png" alt="خريطة السعودية" />
              <div className="lp-saudi-made__txt"><b>صنع في السعودية</b><span>منصة سعودية بالكامل</span></div>
            </div>
            <div className="lp-foot__copy">© 2026 هاء متاجر · جميع الحقوق محفوظة</div>
            <div className="lp-foot__pays">
              <img src="/assets/payment-logos/trim/mada.png"   alt="مدى"       />
              <img src="/assets/payment-logos/apple-pay.svg"   alt="Apple Pay" />
              <img src="/assets/payment-logos/stc-pay.svg"     alt="STC Pay"   />
              <img src="/assets/payment-logos/visa.svg"        alt="Visa"      />
              <img src="/assets/payment-logos/mastercard.svg"  alt="Mastercard"/>
              <img src="/assets/payment-logos/trim/tabby.png"  alt="tabby"     />
              <img src="/assets/payment-logos/trim/tamara.png" alt="تمارا"     />
            </div>
          </div>
        </div>
      </footer>

      <BackToTop />
    </div>
  );
}
