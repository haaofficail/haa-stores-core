/**
 * Features — 4-card feature grid
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor, sprint 5/13).
 * Cards: launch speed, themes, payments, shipping. Each shows a stat
 * (e.g. "< 60 ثانية") + title + 1-line description with icon + gradient.
 * Stats are sourced from getClaim() for the dynamic claims (themes, payments).
 */
import { CreditCard, Palette, StoreContainer, Truck, Zap } from '@/components/ui';
import { getClaim } from '@/lib/landing-claims';
import type { TFn } from './types';

export function Features({ t }: { t: TFn }) {
  // Each card pairs an icon (24px icon inside 56px container) with a 3-step micro-proof
  // structure: outcome stat → feature name → 1-line benefit. Card padding 32px, border-radius 24px.
  const items = [
    {
      id: 'launch',
      icon: Zap,
      stat: '< 60 ثانية',
      title: t('landing.features.launch.title', 'إطلاق فوري'),
      desc: t('landing.features.launch.desc', 'افتح متجرك وأضف أول منتج في أقل من دقيقة. لا فريق تقني، لا انتظار.'),
      gradient: 'from-primary-400 to-primary-700',
      shadow: 'shadow-primary-500/30',
    },
    {
      id: 'themes',
      icon: Palette,
      stat: getClaim('themeCount').text,
      title: t('landing.features.themes.title', 'ثيمات احترافية'),
      desc: t('landing.features.themes.desc', 'صمّمها مصممون محترفون. غيّر الألوان والخطوط بنقرة واحدة بدون لمس الكود.'),
      gradient: 'from-primary-500 to-primary-800',
      shadow: 'shadow-primary-600/30',
    },
    {
      id: 'payments',
      icon: CreditCard,
      stat: getClaim('zeroCommission').text,
      title: t('landing.features.payments.title', 'دفع سعودي كامل'),
      desc: t('landing.features.payments.desc', 'مدى، Apple Pay، فيزا، ماستركارد، تابي، تمارا. كل البوابات بدون عمولات خفية.'),
      gradient: 'from-primary-400 to-primary-600',
      shadow: 'shadow-primary-500/30',
    },
    {
      id: 'shipping',
      icon: Truck,
      stat: 'شحن مدمج',
      title: t('landing.features.shipping.title', 'شحن وتوصيل'),
      desc: t('landing.features.shipping.desc', 'اربط متجرك بشركات الشحن السعودية. احسب تكلفة التوصيل آليًا وتابع الطلبات.'),
      gradient: 'from-primary-400 to-primary-700',
      shadow: 'shadow-primary-500/30',
    },
  ];
  return (
    // Section padding: 64px mobile, 96px desktop (reduced for better rhythm)
    <section id="features" className="relative bg-white py-16 sm:py-24 scroll-mt-20">
      <StoreContainer>
        <div className="mx-auto max-w-2xl text-center">
          <span className="aurora-pill text-xs">{t('landing.features.eyebrow', 'لماذا Haa؟')}</span>
          <h2 className="mt-6 text-[32px] font-bold leading-[1.15] tracking-[-0.02em] text-text-primary sm:text-[44px]">
            {t('landing.features.title', 'ركّز على منتجاتك، واترك التقنية علينا')}
          </h2>
        </div>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ id, icon: Icon, stat, title, desc, gradient, shadow }) => (
            <li
              key={id}
              className="aurora-card group relative overflow-hidden rounded-2xl border border-white/40 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-white/60 hover:shadow-lg"
            >
              <div aria-hidden="true" className={`absolute -end-16 -top-16 h-48 w-48 rounded-pill bg-gradient-to-br ${gradient} opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40`} />
              <span className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg ${shadow}`}>
                <Icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <div className="relative mt-8 text-sm font-bold uppercase tracking-wider text-primary-600">{stat}</div>
              <h3 className="relative mt-4 text-[18px] font-bold tracking-[-0.01em] text-text-primary">{title}</h3>
              <p className="relative mt-4 text-[15px] leading-[1.6] text-text-secondary">{desc}</p>
            </li>
          ))}
        </ul>
      </StoreContainer>
    </section>
  );
}
