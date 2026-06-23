/**
 * Pricing — 4 tiers, mirrors the canonical DB seed exactly
 * (packages/db/src/seed/index.ts → plans).
 *
 * Codes + monthly prices come from the seed; do NOT diverge from
 * the DB here or merchants will see one number on the landing and a
 * different one inside the dashboard. Annual price = monthly × 12 ×
 * 0.80 (20% discount) per the seed (e.g. growth 99×12×0.80 = 950.40).
 *
 * Growth is highlighted as "الأكثر شيوعًا".
 */
import { useState as useReactState } from 'react';
import { Link } from 'react-router-dom';
import { getClaim } from '@/lib/landing-claims';
import { StoreContainer, Icon } from '@/components/ui';
import type { TFn } from './types';

export function Pricing({ t }: { t: TFn }) {
  const [yearly, setYearly] = useReactState(false);
  // 4-tier ladder mirrors packages/db/src/seed/index.ts. priceMonthly is
  // the source of truth; yearly column = round(monthly × 0.8) so it
  // matches the seed's priceAnnual / 12 rounding.
  const plans = [
    {
      key: 'starter',
      name: t('landing.pricing.starter.name', 'Starter · مجاني'),
      monthly: '0',
      yearly: '0',
      period: '',
      desc: t('landing.pricing.starter.desc', 'للبدء وتجربة المنصة بدون أي رسوم.'),
      highlight: false,
      cta: t('landing.pricing.starter.cta', 'ابدأ مجانًا'),
      features: ['حتى 10 منتجات', 'موظف واحد', 'مساحة 100 ميجابايت', 'دفع مدى و Apple Pay', 'دعم بالبريد'],
    },
    {
      key: 'growth',
      name: t('landing.pricing.growth.name', 'Growth · نمو'),
      monthly: '99',
      yearly: '79',
      period: t('landing.pricing.perMonth', '/شهريًا'),
      desc: t('landing.pricing.growth.desc', 'لمتجر صغير ينمو بثقة.'),
      highlight: true,
      cta: t('landing.pricing.growth.cta', 'جرّب 14 يوم مجانًا'),
      features: ['حتى 100 منتج', '3 موظفين', 'مساحة 1 جيجابايت', 'كل وسائل الدفع المحلية', 'تحليلات وكوبونات', 'دعم أولوية'],
    },
    {
      key: 'professional',
      name: t('landing.pricing.professional.name', 'Professional · احتراف'),
      monthly: '249',
      yearly: '199',
      period: t('landing.pricing.perMonth', '/شهريًا'),
      desc: t('landing.pricing.professional.desc', 'للشركات المتوسطة وفِرَق المبيعات.'),
      highlight: false,
      cta: t('landing.pricing.professional.cta', 'جرّب 14 يوم مجانًا'),
      features: ['حتى 500 منتج', '10 موظفين', 'مساحة 5 جيجابايت', 'تقسيط تابي وتمارا', 'مزامنة سلّة ونون وزد', 'دعم أولوية 24/7'],
    },
    {
      key: 'business',
      name: t('landing.pricing.business.name', 'Business · أعمال'),
      monthly: '499',
      yearly: '399',
      period: t('landing.pricing.perMonth', '/شهريًا'),
      desc: t('landing.pricing.business.desc', 'للعلامات الكبيرة والاحتياجات المخصّصة.'),
      highlight: false,
      cta: t('landing.pricing.business.cta', 'تواصل مع المبيعات'),
      features: ['منتجات غير محدودة', 'موظفون غير محدودين', 'مساحة 20 جيجابايت', 'مدير حساب مخصّص', 'SLA مكتوب', 'تخصيص API + Webhooks'],
    },
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
          <div role="group" aria-label="اختر دورة الفوترة" className="mt-8 inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-2 p-1 shadow-sm">
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
        {/* Grid: 1 col mobile, 2 col tablet, 4 col desktop. gap 24px. */}
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => {
            const { key, name, desc, highlight, cta, features } = p;
            const price = yearly ? p.yearly : p.monthly;
            const period = p.period;
            return (
              // Card: 32px padding, 24px radius, layered shadow. Pro card has 2px border (visual lift).
              <li
                key={key}
                className={`aurora-card relative overflow-hidden rounded-3xl p-8 transition-all duration-500 hover:-translate-y-2 sm:p-10 ${
                  highlight
                    ? 'border-2 border-primary-200 bg-gradient-to-br from-primary-50 via-white to-primary-50 shadow-2xl shadow-primary-500/20'
                    : 'border border-border-subtle bg-white hover:shadow-xl'
                }`}
              >
                {highlight && (
                  <span className="absolute top-6 end-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white shadow-lg">
                    <Icon name="Sparkles" size="2xs" />
                    {t('landing.pricing.popular', 'الأكثر شيوعًا')}
                  </span>
                )}
                {/* Plan name: 11px font-bold uppercase tracking-[0.12em] — eyebrow style */}
                <div className="text-xs font-bold uppercase tracking-eyebrow text-text-tertiary">{name}</div>
                {/* Price: 56px font-black (Linear convention for hero price)
                    If highlight, gradient text; otherwise slate-900 */}
                <div className="mt-5 flex items-baseline gap-1">
                  <span className={`text-[56px] font-black leading-none tracking-[-0.04em] ${highlight ? 'text-primary' : 'text-text-primary'}`}>{price}</span>
                  {period &&               <span className="text-sm font-medium text-text-tertiary">{period}</span>}
                </div>
                {/* Description: 15px line-height 1.6 */}
                <p className="mt-4 text-base leading-[1.6] text-text-secondary">{desc}</p>
                {/* Feature highlights — per-plan, mirrors DB seed limits. */}
                <ul className="mt-5 space-y-2 text-sm text-text-secondary">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {/* CTA. Business → /#contact (sales-assisted); others → /signup with plan code so the sign-up flow lands on the correct tier. */}
                <Link
                  to={key === 'business' ? '/#contact' : `/signup?plan=${key}`}
                  className={`mt-8 inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-full text-base font-semibold transition-all ${
                    highlight
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:scale-[1.02] hover:shadow-xl hover:!text-white'
                      : 'border border-border bg-surface text-text-primary hover:border-text-primary'
                  }`}
                >
                  {cta}
                </Link>
                {/* Trust microcopy under CTA */}
                <p className="mt-3 text-center text-[12px] text-text-tertiary">
                  {key === 'starter'
                    ? `${getClaim('freeForever').text} · لا حاجة لبطاقة`
                    : key === 'business'
                    ? 'سعر مخصّص · SLA مكتوب'
                    : 'تجربة 14 يوم · إلغاء في أي وقت'}
                </p>
              </li>
            );
          })}
        </ul>
      </StoreContainer>
    </section>
  );
}
