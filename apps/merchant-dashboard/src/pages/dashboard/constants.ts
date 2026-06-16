// Pure helpers and constants extracted from DashboardHome.tsx (lines 1-257).
// Quality Pass 2 — Item 2.6: Step 1 of incremental decomposition.
//
// These have NO React/JSX dependencies and can be unit-tested in isolation.
// They are imported by HomePage.tsx (the new orchestrator) and by any future
// extracted sub-components.

export const CHART_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
] as const;

export function getRemainingDays(endDate: string | null): number {
  if (!endDate) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000),
  );
}

export function formatTimeAgo(
  t: (key: string, options?: any) => string,
  date: string | Date,
): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("time.now", "الآن");
  if (diffMin < 60)
    return t("time.minutesAgo", "منذ {{count}} دقيقة").replace(
      "{{count}}",
      String(diffMin),
    );
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)
    return t("time.hoursAgo", "منذ {{count}} ساعة").replace(
      "{{count}}",
      String(diffHr),
    );
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7)
    return t("time.daysAgo", "منذ {{count}} يوم").replace(
      "{{count}}",
      String(diffDay),
    );
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

type SeasonEvent = { key: string; title: string; icon: string; date: Date };
export function getUpcomingSeason(): { event: SeasonEvent; daysUntil: number } | null {
  const now = new Date();
  const y = now.getFullYear();
  const events: SeasonEvent[] = [
    { key: "valentine", title: "عيد الحب", icon: "heart", date: new Date(y, 1, 14) },
    { key: "ramadan", title: "رمضان", icon: "moon", date: new Date(y, 1, 18) },
    { key: "eid-fitr", title: "عيد الفطر", icon: "star", date: new Date(y, 2, 20) },
    { key: "eid-adha", title: "عيد الأضحى", icon: "star", date: new Date(y, 5, 27) },
    { key: "back-to-school", title: "العودة للمدارس", icon: "book", date: new Date(y, 7, 25) },
    { key: "national-day", title: "اليوم الوطني", icon: "flag", date: new Date(y, 8, 23) },
    { key: "white-friday", title: "الجمعة البيضاء", icon: "shopping-bag", date: new Date(y, 10, 27) },
  ];
  for (const event of events) {
    const diff = Math.ceil((event.date.getTime() - now.getTime()) / 86400000);
    if (diff >= 0 && diff <= 45) return { event, daysUntil: diff };
  }
  return null;
}

export const orderStatusColors: Record<string, string> = {
  draft: "bg-neutral-200 text-neutral-700",
  checkout_started: "bg-neutral-200 text-neutral-700",
  pending_payment: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  ready_to_ship: "bg-indigo-100 text-indigo-700",
  ready_for_pickup: "bg-emerald-100 text-emerald-700",
  shipped: "bg-blue-100 text-blue-700",
  picked_up: "bg-emerald-100 text-emerald-700",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-amber-100 text-amber-700",
  refunded: "bg-red-100 text-red-700",
  partially_refunded: "bg-amber-100 text-amber-700",
  returned_to_sender: "bg-amber-100 text-amber-700",
};

export const arabicStatusLabels: Record<string, string> = {
  draft: "مسودة",
  pending_payment: "في انتظار الدفع",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
  ready_to_ship: "جاهز للشحن",
  ready_for_pickup: "جاهز للاستلام",
  shipped: "تم الشحن",
  picked_up: "تم الاستلام",
  delivered: "تم التوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
  returned: "مرتجع",
  refunded: "مسترد",
  partially_refunded: "مسترد جزئياً",
  returned_to_sender: "مرتجع للمرسل",
};

export const arabicPaymentLabels: Record<string, string> = {
  unpaid: "غير مدفوع",
  pending: "بانتظار التحصيل",
  paid: "مدفوع",
  refunded: "مسترد",
  partially_refunded: "مسترد جزئياً",
};

export function getNextActionLabel(order: {
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
  fulfillmentType: string | null;
}): string {
  if (order.status === "pending_payment") return "بانتظار الدفع";
  if (order.status === "confirmed") return "تأكيد الطلب";
  if (order.status === "processing") return "تجهيز الطلب";
  if (order.status === "ready_to_ship" && order.fulfillmentType !== "local_pickup")
    return "شحن الطلب";
  if (order.status === "ready_for_pickup" && order.fulfillmentType === "local_pickup")
    return "استلام من الفرع";
  if (
    order.status === "delivered" &&
    order.paymentMethod === "cash_on_delivery" &&
    order.paymentStatus === "pending"
  )
    return "تحصيل COD";
  if (
    order.status === "picked_up" &&
    order.paymentMethod === "cash_on_delivery" &&
    order.paymentStatus === "pending"
  )
    return "تحصيل COD";
  if (order.status === "shipped") return "متابعة الشحن";
  return "—";
}
