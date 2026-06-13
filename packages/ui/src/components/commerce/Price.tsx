'use client'

interface PriceProps {
  price: number | string
  compareAtPrice?: number | string | null
  currency?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { current: 'var(--typography-body-size)', original: 'var(--typography-footnote-size)', badge: '11px' },
  md: { current: 'var(--typography-title3-size)', original: 'var(--typography-callout-size)', badge: '11px' },
  lg: { current: 'var(--typography-title1-size)', original: 'var(--typography-title3-size)', badge: '12px' },
}

export function Price({ price, compareAtPrice, currency = '', size = 'md' }: PriceProps) {
  const hasDiscount = compareAtPrice && Number(compareAtPrice) > Number(price)
  const discountPercent = hasDiscount ? Math.round((1 - Number(price) / Number(compareAtPrice)) * 100) : 0
  const s = sizeMap[size]

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-1)', flexWrap: 'wrap' }}>
      <span style={{ fontSize: s.current, fontWeight: 700, color: 'var(--text-primary)' }}>
        {Number(price).toFixed(2)} {currency}
      </span>
      {hasDiscount && (
        <>
          <span style={{ fontSize: s.original, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
            {Number(compareAtPrice).toFixed(2)} {currency}
          </span>
          <span
            style={{
              fontSize: s.badge,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--color-danger-subtle, rgba(220, 38, 38, 0.1))',
              color: 'var(--color-danger)',
            }}
          >
            {discountPercent}% خصم
          </span>
        </>
      )}
    </div>
  )
}
