/**
 * Order helpers — constants + small UI primitives used by Orders.tsx.
 *
 * Extracted from Orders.tsx (T2.5). These have no business logic of their own
 * — just lookup tables and presentational wrappers. Keeping them in a separate
 * file reduces Orders.tsx's top-level noise by ~110 LOC.
 */
import {
  CheckCircle2,
  Clock,
  Loader2,
  Truck,
  XCircle,
} from 'lucide-react';

export const orderStatusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  draft: 'secondary', checkout_started: 'secondary', pending_payment: 'warning',
  confirmed: 'default', processing: 'default', ready_to_ship: 'default',
  ready_for_pickup: 'success',
  shipped: 'default', picked_up: 'success', delivered: 'success', completed: 'success',
  cancelled: 'destructive', returned: 'warning', refunded: 'destructive',
  partially_refunded: 'warning', returned_to_sender: 'warning',
};

export const paymentStatusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  unpaid: 'warning', pending: 'warning', paid: 'success', refunded: 'destructive', partially_refunded: 'warning',
};

export const fulfillmentColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  unfulfilled: 'warning', partial: 'default', fulfilled: 'success',
};

export const badgeClasses: Record<string, string> = {
  success: 'bg-emerald-500 text-white',
  warning: 'bg-amber-500 text-white',
  destructive: 'bg-red-500 text-white',
  default: 'bg-neutral-200 text-neutral-700',
  secondary: 'bg-neutral-200 text-neutral-700',
};

export const arabicStatusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending_payment: 'في انتظار الدفع',
  confirmed: 'مؤكد',
  processing: 'قيد التجهيز',
  ready_to_ship: 'جاهز للشحن',
  ready_for_pickup: 'جاهز للاستلام',
  shipped: 'تم الشحن',
  picked_up: 'تم الاستلام',
  delivered: 'تم التوصيل',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  returned: 'مرتجع',
  refunded: 'مسترد',
  partially_refunded: 'مسترد جزئياً',
  returned_to_sender: 'مرتجع للمرسل',
};

export const arabicPaymentLabels: Record<string, string> = {
  unpaid: 'غير مدفوع',
  pending: 'بانتظار التحصيل',
  paid: 'مدفوع',
  refunded: 'مسترد',
  partially_refunded: 'مسترد جزئياً',
};

export const arabicFulfillmentLabels: Record<string, string> = {
  unfulfilled: 'لم يتم التجهيز',
  partial: 'تجهيز جزئي',
  fulfilled: 'تم التجهيز',
};

export function getArabicLabel(status: string | null | undefined): string | undefined {
  if (!status) return undefined;
  const s = String(status).toLowerCase().trim();
  const parts = s.split(':');
  const clean = parts[parts.length - 1];
  return arabicPaymentLabels[clean] || arabicFulfillmentLabels[clean] || arabicStatusLabels[clean];
}

export const statusIcons: Record<string, React.ReactNode> = {
  delivered: <CheckCircle2 className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
  refunded: <XCircle className="h-4 w-4" />,
  processing: <Loader2 className="h-4 w-4" />,
  ready_for_pickup: <CheckCircle2 className="h-4 w-4" />,
  shipped: <Truck className="h-4 w-4" />,
  picked_up: <CheckCircle2 className="h-4 w-4" />,
  pending_payment: <Clock className="h-4 w-4" />,
};

export function StatusBadge({ status, colors, icon, label }: { status: string; colors: Record<string, string>; icon?: React.ReactNode; label?: string }) {
  const variant = colors[status] ?? 'default';
  const cls = badgeClasses[variant];
  const getDisplayLabel = (st: string, lbl?: string) => {
    return getArabicLabel(st) || lbl || st;
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium ${cls}`}>
      {icon}
      {getDisplayLabel(status, label)}
    </span>
  );
}

export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-neutral-100 rounded-2xl p-4 space-y-4">
      <h4 className="font-bold text-sm text-neutral-900">{title}</h4>
      {children}
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="text-start max-w-[60%] text-neutral-900">{children}</span>
    </div>
  );
}
