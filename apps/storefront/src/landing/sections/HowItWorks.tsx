/**
 * HowItWorks — 4-step process with gradient connector line
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor, sprint 7/13).
 * Steps: signup → products → theme → launch. Final step gets a
 * gradient background + "النتيجة" sparkle badge.
 */
import {
  MousePointerClick,
  ShoppingBag,
  Palette,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { getClaim } from '@/lib/landing-claims';
import { StoreContainer } from '@/components/ui';
import type { TFn } from './types';

export function HowItWorks({ t }: { t: TFn }) {
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
