'use client'

export type OrderStatus =
  | 'draft' | 'checkout_started' | 'pending_payment' | 'confirmed'
  | 'processing' | 'ready_to_ship' | 'shipped' | 'delivered'
  | 'completed' | 'returned' | 'cancelled' | 'refunded'

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  draft:           { label: 'مسودة',        bg: 'var(--surface-2)', color: 'var(--text-secondary)' },
  checkout_started: { label: 'قيد الدفع',    bg: 'var(--color-info-subtle, #e0f2fe)', color: 'var(--color-info)' },
  pending_payment: { label: 'انتظار الدفع',  bg: 'var(--color-warning-subtle, #fef3c7)', color: 'var(--color-warning)' },
  confirmed:       { label: 'مؤكد',          bg: 'var(--color-success-subtle, #dcfce7)', color: 'var(--color-success)' },
  processing:      { label: 'قيد التجهيز',   bg: 'var(--color-primary-subtle, #e0f2fe)', color: 'var(--color-primary-500)' },
  ready_to_ship:   { label: 'جاهز للشحن',    bg: 'var(--surface-2)', color: 'var(--text-primary)' },
  shipped:         { label: 'تم الشحن',      bg: 'var(--color-primary-subtle, #dbeafe)', color: 'var(--color-primary-600)' },
  delivered:       { label: 'تم التوصيل',    bg: 'var(--color-success-subtle, #dcfce7)', color: 'var(--color-success)' },
  completed:       { label: 'مكتمل',         bg: 'var(--color-success-subtle, #dcfce7)', color: 'var(--color-success)' },
  returned:        { label: 'مرتجع',         bg: 'var(--color-warning-subtle, #fef3c7)', color: 'var(--color-warning)' },
  cancelled:       { label: 'ملغي',          bg: 'var(--color-danger-subtle, #fee2e2)', color: 'var(--color-danger)' },
  refunded:        { label: 'مسترجع',        bg: 'var(--color-danger-subtle, #fee2e2)', color: 'var(--color-danger)' },
}

interface OrderStatusBadgeProps {
  status: OrderStatus | string
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const cfg = statusConfig[status] || { label: status, bg: 'var(--surface-2)', color: 'var(--text-secondary)' }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  )
}
