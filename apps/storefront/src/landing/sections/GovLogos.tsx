const LOGOS = [
  { src: '/assets/payment-logos/ministry-of-commerce.svg', alt: 'وزارة التجارة', wide: true },
  { src: '/assets/payment-logos/citc.png', alt: 'هيئة الاتصالات وتقنية المعلومات' },
  { src: '/assets/payment-logos/zatca.svg', alt: 'هيئة الزكاة والضريبة والجمارك' },
  { src: '/assets/payment-logos/saudi-business-center.svg', alt: 'المركز السعودي للأعمال' },
];

export function GovLogos() {
  return (
    <section className="py-3">
      <div className="mx-auto max-w-[1180px] px-7">
        <p className="mb-5 text-center text-sm font-semibold text-text-tertiary">
          متوافق ومسجّل لدى الجهات الرسمية في المملكة
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {LOGOS.map(({ src, alt, wide }) => (
            <span
              key={alt}
              className="inline-flex h-[84px] w-[168px] items-center justify-center rounded-[18px] bg-surface-1 px-[22px] shadow-[0_1px_3px_rgba(0,0,0,.05),0_14px_34px_-22px_rgba(20,40,80,.22)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_8px_18px_rgba(0,0,0,.06),0_22px_46px_-22px_rgba(20,40,80,.3)]"
            >
              <img
                src={src}
                alt={alt}
                loading="lazy"
                className={`w-auto object-contain ${wide ? 'max-h-[50px] max-w-[144px]' : 'max-h-[56px] max-w-[124px]'}`}
              />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
