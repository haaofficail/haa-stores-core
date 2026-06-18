/**
 * AboutSection — "تعرف علينا" section with stats grid
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor, sprint 4/13).
 * Headline + description + 4-stat grid + "اعرف أكثر" link.
 * Uses `Link` from react-router for the about-page CTA.
 */
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; ArrowLeft icon as plain JSX
import { ArrowLeft } from 'lucide-react';
import { StoreContainer } from '@/components/ui';

export function AboutSection() {
  const stats = [
    { num: '١٠٠٠+', label: 'متجر نشط' },
    { num: '٥٠٠٠٠+', label: 'طلب شهريًا' },
    { num: '١٠٠٪', label: 'سعودي ١٠٠٪' },
    { num: 'دقيقة', label: 'وانطلق متجرك' },
  ];
  return (
    <section id="about" className="relative py-16 sm:py-24 overflow-hidden" aria-labelledby="about-title">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -end-16 -top-16 h-80 w-80 rounded-full bg-blue-100/30 blur-3xl" />
        <div className="absolute -start-16 -bottom-16 h-80 w-80 rounded-full bg-emerald-100/20 blur-3xl" />
      </div>
      <StoreContainer>
        <div className="mx-auto max-w-4xl text-center">
          <span className="aurora-pill text-xs">{'منصة سعودية'}</span>
          <h2 id="about-title" className="mt-6 text-[40px] font-bold leading-[1.15] tracking-[-0.03em] text-text-primary sm:text-[52px] lg:text-[64px]">
            {'هاء — متجرك الإلكتروني في دقيقة'}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.7] text-text-secondary sm:text-[19px]">
            {'هاء منصة سعودية ١٠٠٪ تمنح التجار متجرًا إلكترونيًا جاهزًا بالثيمات، بوابات الدفع السعودية (مدى، STC Pay، تابي، تمارا)، وشحن مدمج. لا برمجة، لا تصميم، ولا تعقيدات.'}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {stats.map(({ num, label }) => (
            <div key={label} className="rounded-2xl border border-white/20 bg-white/40 p-5 text-center backdrop-blur-sm sm:p-6">
              <p className="text-[28px] font-bold text-text-primary sm:text-[34px]">{num === 'دقيقة' ? (
                <><span className="text-blue-600">١</span> {num}</>
              ) : num}
              </p>
              <p className="mt-1 text-sm font-medium text-text-secondary">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
          >
            {'اعرف أكثر عن هاء'}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </StoreContainer>
    </section>
  );
}
