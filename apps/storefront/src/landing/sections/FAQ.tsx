const ITEMS: [string, string][] = [
  ['هل أحتاج خبرة تقنية لإنشاء متجري؟', 'إطلاقًا. كل شيء بالسحب والإفلات بدون أي برمجة — تختار ثيمًا، تضيف منتجاتك، وتنشر متجرك في دقائق.'],
  ['ما وسائل الدفع المدعومة؟', 'مدى، Apple Pay، STC Pay، فيزا وماستركارد، بالإضافة للتقسيط عبر تابي وتمارا — كلها مفعّلة وجاهزة.'],
  ['هل يمكنني الإلغاء في أي وقت؟', 'نعم، بضغطة واحدة وبدون أي التزام. الباقة المجانية تبقى مجانية دائمًا للبدء.'],
  ['هل متجري متوافق مع الأنظمة السعودية؟', 'نعم، المنصة متوافقة مع متطلبات هيئة الزكاة والضريبة ووزارة التجارة، مع فوترة إلكترونية مدمجة.'],
  ['كيف يصل منتجي للعميل؟', 'عبر تكامل مباشر مع أرامكس وسمسا وريدبوكس — تطبع بوليصة الشحن وتتبّع الطلب آليًا من لوحة واحدة.'],
  ['هل يظهر متجري في سوق هاء الموحّد؟', 'نعم، منتجاتك تظهر تلقائيًا في سوق هاء أمام آلاف العملاء يوميًا، فتصلك مبيعات إضافية بلا أي جهد تسويقي.'],
  ['هل أستطيع ربط نطاقي الخاص؟', 'بالتأكيد. تربط نطاقك (.com أو .sa) بمتجرك بخطوات بسيطة، أو تستخدم نطاقًا فرعيًا مجانيًا على haastores.com.'],
  ['ما المدة لاستلام أرباحي؟', 'تُحوّل أرباحك إلى محفظتك فور تأكيد الطلب، وتسحبها إلى حسابك البنكي في أي وقت خلال أيام عمل قليلة.'],
];

export function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-24">
      <div className="mx-auto max-w-[1180px] px-7">
        <div className="mb-12 text-center">
          <div className="text-sm font-extrabold tracking-widest text-[var(--color-primary-600)]">الأسئلة الشائعة</div>
          <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            كل ما تريد معرفته
          </h2>
        </div>
        <div className="mx-auto flex max-w-[760px] flex-col gap-3">
          {ITEMS.map(([q, a], i) => (
            <details
              key={q}
              open={i === 0}
              className="group rounded-2xl bg-gradient-to-br from-[color-mix(in_srgb,var(--color-primary-500)_3%,var(--surface-1))] to-[var(--surface-1)] px-[22px] shadow-[0_8px_24px_-16px_rgba(20,40,80,.16)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-[18px] text-base font-bold text-text-primary [&::-webkit-details-marker]:hidden">
                <span>{q}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="h-5 w-5 flex-shrink-0 text-[var(--color-primary-500)] transition-transform duration-300 group-open:rotate-45"
                >
                  <line x1="10" y1="2" x2="10" y2="18" />
                  <line x1="2" y1="10" x2="18" y2="10" />
                </svg>
              </summary>
              <p className="pb-5 text-base leading-[1.7] text-text-secondary">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
