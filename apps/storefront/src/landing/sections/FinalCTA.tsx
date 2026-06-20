/**
 * FinalCTA — full-bleed glassy gradient "join now" call-to-action
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor, sprint 12/13).
 * Animated gradient orbs + floating particles + dual CTA (signup + contact)
 * + trust pills (zero commission, free subdomain, 60s setup).
 * The HighlightNumbers helper is local to this section.
 */
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; lucide icons as plain JSX
import {
  ArrowLeft,
  CreditCard,
  Globe,
  MessageCircle,
  Rocket,
} from 'lucide-react';
import { getClaim } from '@/lib/landing-claims';
import { StoreContainer } from '@/components/ui';
import type { TFn } from './types';

/**
 * HighlightNumbers — splits text and applies amber-gradient to numeric tokens.
 * Local helper used only by FinalCTA's subtitle + trust pill.
 */
function HighlightNumbers({ text, size = 'inherit' }: { text: string; size?: string }) {
  const parts = text.split(/(\d[\d,]*\+?)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\d[\d,]*\+?$/.test(part)
          ? <span key={i} className={`inline-block bg-gradient-to-br from-amber-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(251,191,36,0.4)] ${size}`}>{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

export function FinalCTA({ t }: { t: TFn }) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 8,
    duration: Math.random() * 6 + 6,
  }));
  return (
    <section className="relative py-16 sm:py-24">
      <StoreContainer>
        <div className="aurora-cta relative overflow-hidden rounded-[2.5rem] px-6 py-16 text-center shadow-2xl sm:px-12 sm:py-20">
          {/* Animated gradient orbs */}
          <div aria-hidden="true" className="absolute -end-32 -top-32 h-96 w-96 rounded-pill bg-blue-400/40 blur-3xl animate-pulse motion-reduce:animate-none" style={{ animationDuration: '6s' }} />
          <div aria-hidden="true" className="absolute -bottom-32 -start-32 h-96 w-96 rounded-pill bg-indigo-400/30 blur-3xl animate-pulse motion-reduce:animate-none" style={{ animationDuration: '8s' }} />
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-violet-400/20 blur-3xl animate-pulse motion-reduce:animate-none" style={{ animationDuration: '10s' }} />
          {/* Floating particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              aria-hidden="true"
              className="absolute rounded-pill bg-white/20 aurora-float"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                animation: `auroraFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}
          <div aria-hidden="true" className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
          <div className="relative mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-eyebrow text-white/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-pill bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)] animate-pulse motion-reduce:animate-none" />
              {t('landing.finalCta.eyebrow', 'جاهز تبدأ؟')}
            </span>
            <h2 className="mt-7 leading-[1.15] tracking-[-0.03em]">
              <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-0">
                <span className="text-[32px] font-bold text-white/90 sm:text-[40px] lg:text-[48px]">{'انضم لـ'}</span>
                <span className="text-[72px] font-extrabold bg-gradient-to-br from-amber-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(251,191,36,0.5)] sm:text-[96px] lg:text-[120px] xl:text-[140px]">
                  {getClaim('merchantCount').text || 'مجتمع Haa'}
                </span>
                <span className="text-[32px] font-bold text-white/90 sm:text-[40px] lg:text-[48px]">
                  {getClaim('merchantCount').status === 'verified' ? 'تاجر سعودي' : 'من التجار'}
                </span>
              </div>
              <div className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-white/70 sm:text-[28px] lg:text-[32px]">
                {getClaim('merchantCount').status === 'verified' ? 'يبيعون على Haa اليوم' : 'وابدأ تجارتك الإلكترونية'}
              </div>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[18px] leading-[1.6] text-white/85 sm:text-[20px]">
              <HighlightNumbers text={t('landing.finalCta.subtitle', 'سجّل كتاجر مجانًا. لا حاجة لبطاقة بنكية. ألغِ في أي وقت بدون أسئلة.')} size="text-[1.15em]" />
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                to="/signup?ref=final-cta"
                className="group inline-flex h-14 min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-white px-8 text-[17px] font-semibold text-blue-700 shadow-xl transition-all motion-reduce:transition-none duration-300 hover:scale-[1.04] hover:shadow-2xl sm:w-auto"
              >
                {t('landing.finalCta.primaryCta', 'سجّل كتاجر — مجانًا')}
                <ArrowLeft className="h-5 w-5 transition-transform motion-reduce:transition-none duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </Link>
              <Link
                to="/signup"
                className="group inline-flex h-14 min-h-[56px] w-full items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 text-[17px] font-semibold text-white backdrop-blur-sm transition-all motion-reduce:transition-none duration-300 hover:scale-[1.04] hover:bg-white/20 hover:!text-white sm:w-auto"
              >
                <MessageCircle className="h-5 w-5 transition-transform motion-reduce:transition-none duration-300 group-hover:scale-110" />
                {t('landing.finalCta.secondaryCta', 'تواصل مع المبيعات')}
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-white/80">
              <li className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm transition-all motion-reduce:transition-none hover:bg-white/20 hover:text-white">
                <CreditCard className="h-4 w-4 text-amber-300" />
                {t('landing.finalCta.g1', getClaim('zeroCommission').text)}
              </li>
              <li className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm transition-all motion-reduce:transition-none hover:bg-white/20 hover:text-white">
                <Globe className="h-4 w-4 text-blue-300" />
                {t('landing.finalCta.g2', 'دومين فرعي مجاني')}
              </li>
              <li className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm transition-all motion-reduce:transition-none hover:bg-white/20 hover:text-white">
                <Rocket className="h-4 w-4 text-indigo-300" />
                <HighlightNumbers text={t('landing.finalCta.g3', 'إعداد في 60 ثانية')} size="text-[1.1em]" />
              </li>
            </ul>
          </div>
        </div>
      </StoreContainer>
    </section>
  );
}
