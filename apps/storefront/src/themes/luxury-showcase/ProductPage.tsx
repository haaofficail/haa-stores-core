import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ProductPageProps } from '@haa/storefront-themes';
import LuxuryProductCard from './components/LuxuryProductCard';
import LuxuryProductGallerySlider from './components/sliders/LuxuryProductGallerySlider';
import { LuxuryProductInfoPanel } from './components/LuxuryProductInfoPanel';
import { LuxuryProductTabs } from './components/LuxuryProductTabs';
import { LUXURY_THEME_CLASS } from './luxuryTokens';

type AnyRecord = Record<string, any>;

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getProductName(product: AnyRecord): string {
  return product?.nameAr || product?.name || product?.title || '';
}

function getProductCategory(product: AnyRecord): string {
  return (
    product?.category?.nameAr ||
    product?.category?.name ||
    product?.categoryName ||
    product?.category ||
    ''
  );
}

function getProductDescription(product: AnyRecord): string {
  return (
    product?.shortDescription ||
    product?.descriptionAr ||
    product?.description ||
    product?.summary ||
    ''
  );
}

function getRelatedProducts(props: AnyRecord): AnyRecord[] {
  const candidates = [
    ...asArray(props.relatedProducts),
    ...asArray(props.alsoBought),
    ...asArray(props.crossSellProducts),
    ...asArray(props.recentlyViewed),
  ].filter(Boolean);

  const seen = new Set<string | number>();
  const result: AnyRecord[] = [];

  for (const item of candidates) {
    const id = item.id ?? item.slug ?? item.name;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(item);
    if (result.length >= 4) break;
  }

  return result;
}

export function LuxuryShowcaseProductPage(props: ProductPageProps) {
  const { t, i18n } = useTranslation();
  const p = props as AnyRecord;
  const product = (p.product || {}) as AnyRecord;
  const store = (p.store || {}) as AnyRecord;
  const slug = p.slug || store.slug || '';

  const name = getProductName(product);
  const category = getProductCategory(product);
  const description = getProductDescription(product);

  const relatedProducts = getRelatedProducts(p);

  return (
    <main
      id="main-content"
      dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
      className={LUXURY_THEME_CLASS}
      style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)', color: 'var(--lux-text, #2B2520)' }}
    >
      <div
        className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8"
        style={{ maxWidth: 'var(--container-max-width, 1440px)' }}
      >
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-2 text-[11px] font-light tracking-wide"
          style={{ color: 'var(--lux-muted, #756B61)' }}
        >
          <Link to={`/s/${slug}`} className="transition hover:text-[var(--lux-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]">
            {t('store.home')}
          </Link>
          <span>/</span>
          {category ? (
            <>
              <span>{category}</span>
              <span>/</span>
            </>
          ) : null}
          <span className="line-clamp-1" style={{ color: 'var(--lux-text, #2B2520)' }}>{name}</span>
        </nav>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.75fr)] lg:items-start lg:gap-8">
          <LuxuryProductGallerySlider product={product} />

          <LuxuryProductInfoPanel
            product={product}
            propsBag={p}
            name={name}
            category={category}
            description={description}
          />
        </section>

        <section className="mt-2 lg:mt-4">
          <LuxuryProductTabs product={product} propsBag={p} />
        </section>

        {relatedProducts.length > 0 ? (
          <section className="mt-10 border-t pt-6 lg:mt-12 lg:pt-8" style={{ borderColor: 'var(--lux-border, #E6D8C6)' }}>
            <h2 className="mb-4 text-lg font-light tracking-tight lg:text-xl" style={{ color: 'var(--lux-text, #2B2520)' }}>
              {t('product.relatedTitle', 'قد يعجبك أيضًا')}
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.map((item) => (
                <LuxuryProductCard
                  key={item.id || item.slug || item.name}
                  product={item as any}
                  slug={slug}
                  onAddToCart={p.onAddToCart}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
