/**
 * PaymentSection — Saudi payment methods showcase
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor, sprint 6/13).
 * Big SAMA riyal symbol + 4 payment-method cards (mada, Apple Pay/STC Pay,
 * Tabby/Tamara, Visa/Mastercard) + signup CTA.
 * Static payment logos served from /assets/payment-logos/.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { StoreContainer } from '@/components/ui';

export function PaymentSection(_props: { t: import('./types').TFn }) {
  const payments = [
    { title: 'بطاقات مدى والمدفوعات الحكومية', desc: 'مدى — شبكة المدفوعات الوطنية. تقبل البطاقات البنكية والمدفوعات الحكومية بالريال السعودي', logos: ['mada.svg'], color: 'from-success to-success' },
    { title: 'المحافظ الرقمية', desc: 'Apple Pay و STC Pay — أسرع وسيلة دفع بدون لمس بطاقة', logos: ['apple-pay.svg', 'stc-pay.svg'], color: 'from-primary-500 to-primary-600' },
    { title: 'اشتر الآن وادفع لاحقًا', desc: 'تابي وتمارا — قسّم مشترياتك على 3 دفعات بدون فوائد', logos: ['tabby.svg', 'tamara.svg'], color: 'from-primary-500 to-primary-600' },
    { title: 'بطاقات ائتمانية وتقليدي', desc: 'فيزا وماستركارد — خيارات تناسب الجميع', logos: ['visa.svg', 'mastercard.svg'], color: 'from-warning to-warning' },
  ];
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden" aria-labelledby="payment-title">
      <div aria-hidden="true" className="pointer-events-none absolute -end-32 -top-32 h-96 w-96 rounded-pill bg-success-soft/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -start-32 -bottom-32 h-96 w-96 rounded-pill bg-success-soft/30 blur-3xl" />
      <StoreContainer>
        <div className="mx-auto max-w-3xl text-center">
          <span className="aurora-pill text-xs">{'الدفع السعودي'}</span>
          {/* Hero icon - big SAMA */}
          <div className="mt-8 flex justify-center">
            <div className="relative flex items-center justify-center">
              <img src="/assets/saudi-riyal-symbol.svg" alt="" loading="lazy" className="relative h-32 w-auto sm:h-40 lg:h-48" aria-hidden="true" style={{ filter: 'brightness(0.12) saturate(0.8)' }} />
            </div>
          </div>
          <div className="mt-6">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-text-secondary sm:text-[15px]">{'تقبل الدفع بـ'}</p>
            <p className="mt-1 text-[44px] font-bold leading-[1.1] tracking-[-0.03em] text-text-primary sm:text-[60px] lg:text-[76px]">{'الريال السعودي'}</p>
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-[17px] leading-[1.6] text-text-secondary sm:text-[19px]">
            {'مدى، Apple Pay، فيزا، ماستركارد، STC Pay، تابي، تمارا — كلها تعمل بالريال السعودي بدون عمولات خفية.'}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {payments.map(({ title, desc, logos, color }) => (
            <article
              key={title}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg sm:p-7"
            >
              <div aria-hidden="true" className={`absolute -end-8 -top-8 h-20 w-20 rounded-pill bg-gradient-to-br ${color} opacity-5 blur-xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-15`} />
              <div className={`h-3 w-3 rounded-pill bg-gradient-to-br ${color} opacity-40`} aria-hidden="true" />
              <h3 className="mt-4 text-[15px] font-bold leading-[1.3] text-text-primary sm:text-[16px]">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-text-secondary">{desc}</p>
              <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4 pb-1">
                {logos.map((logo) => (
                  <img key={logo} src={`/assets/payment-logos/${logo}`} alt="" className="w-auto opacity-70 transition-opacity group-hover:opacity-100" loading="lazy" style={{ height: '20px' }} />
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/signup?ref=how-it-works"
            className="group inline-flex min-h-[52px] items-center gap-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-8 text-[16px] font-bold text-white shadow-lg shadow-primary-500/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:!text-white"
          >
            {'أطلق متجرك بالريال السعودي'}
            <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
          </Link>
        </div>
      </StoreContainer>
    </section>
  );
}
