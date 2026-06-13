'use client'

export interface ProductData {
  id: number
  name: string
  slug: string
  price: string
  compareAtPrice: string | null
  images: string[]
  categoryName?: string | null
  stockQuantity: number
  trackInventory: boolean
  status: string
}

interface ProductCardProps {
  product: ProductData
  renderLink?: (product: ProductData, children: React.ReactNode) => React.ReactNode
}

export function ProductCard({ product, renderLink }: ProductCardProps) {
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
  const isLowStock = product.trackInventory && product.stockQuantity > 0 && product.stockQuantity <= 5
  const isOutOfStock = product.trackInventory && product.stockQuantity === 0

  const content = (
    <div
      style={{
        background: 'var(--surface-1)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
        transition: 'all var(--duration-fast) var(--ease-spring-snappy)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          aspectRatio: '1 / 1',
          background: 'var(--surface-2)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
        )}

        <div style={{ position: 'absolute', top: 'var(--spacing-1)', insetInlineEnd: 'var(--spacing-1)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {hasDiscount && (
            <span
              style={{
                padding: '2px 8px',
                background: 'var(--color-danger)',
                color: 'var(--text-on-color, #fff)',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: 'var(--radius-pill)',
              }}
            >
              تخفيض
            </span>
          )}
          {isLowStock && (
            <span
              style={{
                padding: '2px 8px',
                background: 'var(--color-warning)',
                color: 'var(--text-on-color, #fff)',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: 'var(--radius-pill)',
              }}
            >
              كمية محدودة
            </span>
          )}
        </div>

        {isOutOfStock && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                background: 'var(--surface-1, #fff)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              غير متوفر
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: 'var(--spacing-2) var(--spacing-3)' }}>
        {product.categoryName && (
          <p style={{ fontSize: '11px', color: 'var(--color-primary-500)', fontWeight: 500, marginBottom: 4 }}>
            {product.categoryName}
          </p>
        )}
        <h3
          style={{
            fontSize: 'var(--typography-footnote-size)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {product.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-1)', marginTop: 'var(--spacing-1)' }}>
          <span style={{ fontSize: 'var(--typography-callout-size)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {Number(product.price).toFixed(2)} ر.س
          </span>
          {hasDiscount && (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
              {Number(product.compareAtPrice).toFixed(2)} ر.س
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (renderLink) {
    return renderLink(product, content)
  }

  return content
}
