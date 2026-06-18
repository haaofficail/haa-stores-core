/**
 * Bento — bento-grid testimonials section
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor, sprint 11/13).
 * Bento grid of 7 merchant testimonials + 1 pride-tile hero.
 * Testimonial section is gated by isClaimEnabled('testimonials')
 * — when false, only the decorative background renders (no copy).
 * Varied tile sizes (col-span-2 for widest, col-span-1 for normal).
 */
import {
  Heart,
  Quote,
} from 'lucide-react';
import { isClaimEnabled } from '@/lib/landing-claims';
import { StoreContainer } from '@/components/ui';
import type { TFn } from './types';

export function Bento({ t }: { t: TFn }) {
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
