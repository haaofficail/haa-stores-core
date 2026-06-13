import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Truck, RefreshCw } from 'lucide-react';

type AnyRecord = Record<string, any>;

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getDescription(product: AnyRecord): string {
  return (
    product?.descriptionAr ||
    product?.description ||
    product?.shortDescription ||
    ''
  );
}

function getSpecs(product: AnyRecord, propsBag: AnyRecord): Array<[string, string]> {
  const raw =
    propsBag.specifications ||
    product.specifications ||
    product.metadata?.specifications ||
    product.attributes ||
    [];

  if (Array.isArray(raw)) {
    return raw
      .map((item: any) => {
        const key = item.nameAr || item.name || item.label || item.key;
        const value = item.valueAr || item.value || item.text;
        return key && value ? [String(key), String(value)] : null;
      })
      .filter(Boolean) as Array<[string, string]>;
  }

  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]);
  }

  return [];
}

function getReviews(product: AnyRecord, propsBag: AnyRecord): AnyRecord[] {
  return asArray(propsBag.reviews || product.reviews);
}

export function LuxuryProductTabs({
  product,
  propsBag,
}: {
  product: AnyRecord;
  propsBag: AnyRecord;
}) {
  const { t } = useTranslation();
  const description = getDescription(product);
  const specs = getSpecs(product, propsBag);
  const reviews = getReviews(product, propsBag);

  const hasDetails = Boolean(description);
  const hasSpecs = specs.length > 0;

  const trustItems = useMemo(() => [
    { icon: Truck, label: t('product.shipping', 'شحن موثوق'), desc: t('product.shippingDesc', 'يتم تأكيد خيارات الشحن قبل إتمام الطلب') },
    { icon: Shield, label: t('product.securePayment', 'دفع آمن'), desc: t('product.securePaymentDesc', 'معلوماتك محمية بتقنية التشفير') },
    { icon: RefreshCw, label: t('product.easyReturns', 'استرجاع سهل'), desc: t('product.easyReturnsDesc', 'استرجاع خلال المدة المحددة') },
  ], [t]);

  if (!hasDetails && !hasSpecs) return null;

  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:divide-x lg:divide-[#e8ded4]/60">
      {/* Column 1 — Details */}
      <div className="py-6 lg:px-8 lg:py-0">
        <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#8a7e72]">
          {t('product.details', 'التفاصيل')}
        </h3>
        {hasDetails ? (
          <div className="text-sm font-light leading-7 text-[#6b635b]">
            {description}
          </div>
        ) : (
          <p className="text-sm font-light italic text-[#8a7e72]">
            {t('product.noDetails', 'لا توجد تفاصيل إضافية')}
          </p>
        )}
      </div>

      {/* Column 2 — Specs */}
      <div className="py-6 lg:px-8 lg:py-0">
        <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#8a7e72]">
          {t('product.specs', 'المواصفات')}
        </h3>
        {hasSpecs ? (
          <dl className="space-y-3">
            {specs.map(([key, value]) => (
              <div key={key} className="grid grid-cols-[100px_1fr] gap-2">
                <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#8a7e72]">
                  {key}
                </dt>
                <dd className="text-sm font-light text-[#1a1a1a]">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm font-light italic text-[#8a7e72]">
            {t('product.noSpecs', 'لا توجد مواصفات متاحة')}
          </p>
        )}
      </div>

      {/* Column 3 — Reviews or Trust */}
      <div className="py-6 lg:px-8 lg:py-0">
        {reviews.length > 0 ? (
          <>
            <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#8a7e72]">
              {t('product.reviews', 'التقييمات')} ({reviews.length})
            </h3>
            <div className="space-y-4">
              {reviews.slice(0, 3).map((review, index) => (
                <article key={review.id || index} className="border-b border-[#e8ded4]/40 pb-4 last:border-b-0 last:pb-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[11px] font-medium text-[#1a1a1a]">
                      {review.name || review.customerName || t('product.customer', 'عميل')}
                    </span>
                    {review.rating ? (
                      <span className="text-[11px] text-[#a65d4e]" aria-label={`${review.rating} من 5`}>
                        {'★'.repeat(Math.round(Number(review.rating)))}
                        {'☆'.repeat(5 - Math.round(Number(review.rating)))}
                      </span>
                    ) : null}
                  </div>
                  {review.comment || review.text ? (
                    <p className="text-sm font-light leading-6 text-[#6b635b]">
                      {review.comment || review.text}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#8a7e72]">
              {t('product.trustedExperience', 'تجربة شراء موثوقة')}
            </h3>
            <div className="space-y-4">
              {trustItems.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#a65d4e] stroke-[1.5]" />
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">{item.label}</p>
                    <p className="text-xs font-light text-[#8a7e72]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
