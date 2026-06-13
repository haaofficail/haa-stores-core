import type { PublicProduct } from '@/lib/api';

export function productJSONLD(product: PublicProduct, storeName: string, storeUrl: string): string {
  const price = Number(product.price);
  const image = product.images?.[0] || '';
  const availability = product.stockQuantity > 0 && product.status === 'active'
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    sku: product.sku || undefined,
    image: image || undefined,
    category: product.categoryName || undefined,
    brand: { '@type': 'Brand', name: storeName },
    offers: {
      '@type': 'Offer',
      url: `${storeUrl}/p/${product.slug}`,
      priceCurrency: 'SAR',
      price,
      priceValidUntil: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      availability,
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(product.rating != null ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 0,
      },
    } : {}),
  });
}

export function organizationJSONLD(name: string, logo: string, url: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: undefined,
      contactType: 'customer service',
    },
  });
}

export function breadcrumbJSONLD(items: { name: string; url: string }[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  });
}
