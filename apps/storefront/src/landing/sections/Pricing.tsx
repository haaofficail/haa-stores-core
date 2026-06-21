/**
 * Pricing — 3-tier pricing with monthly/yearly toggle
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor, sprint 10/13).
 * Apple-style "3 cards with middle highlighted" pattern. Pro plan gets
 * the visual lift + "الأكثر شيوعًا" badge + gradient pricing.
 * Yearly toggle saves 15%. Each plan's CTA links to /signup or /contact.
 */
import { useState as useReactState } from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; Sparkles icon as plain JSX
import { Sparkles } from 'lucide-react';
import { getClaim } from '@/lib/landing-claims';
import { StoreContainer } from '@/components/ui';
import type { TFn } from './types';

export function Pricing({ t }: { t: TFn }) {
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
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${yearly ? 'bg-white text-text-primary' : 'bg-success-soft text-success'}`}>
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
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">✓</span>
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
