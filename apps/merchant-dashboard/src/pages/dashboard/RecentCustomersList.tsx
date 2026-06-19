// RecentCustomersList — the "آخر العملاء" list extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 14).
//
// Renders up to 5 recent customers with their initial avatar, name,
// phone/email, total-orders count, and a tap-to-call link. Falls back
// to a neutral empty state when there's nothing to show.
//
// Visual fidelity preserved 1:1:
// - container: bg-white/80, blur backdrop, white border, rounded-2xl
// - header: title + view-all button (border-b separator)
// - each row: 7x7 indigo gradient avatar with initial, name + phone,
//   order count + tap-to-call icon
// - empty state: shopping-cart icon, neutral-100 box, neutral-500 text

import { useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import type { TFunction } from "i18next";
import { MerchantEmptyState } from "@/components/ui/MerchantEmptyState";

export type RecentCustomer = {
  id: number;
  name: string | null;
  phone?: string | null;
  email?: string | null;
  totalOrders?: number;
};

type Props = {
  customers: RecentCustomer[];
  t: TFunction;
};

export function RecentCustomersList({ customers, t }: Props) {
  const navigate = useNavigate();
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
        <h3 className="font-bold text-sm text-neutral-900">
          {t("dashboard.recentCustomers", "آخر العملاء")}
        </h3>
        <button
          className="text-xs text-primary-600 hover:text-primary-700 font-bold"
          onClick={() => navigate("/customers")}
        >
          {t("common.viewAll", "عرض الكل")}
        </button>
      </div>
      <div className="p-3">
        {customers.length === 0 ? (
          <MerchantEmptyState
            icon={ShoppingCart}
            title={t("dashboard.noCustomers", "لا يوجد عملاء")}
            compact
          />
        ) : (
          <div className="space-y-1">
            {customers.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 rounded-xl border border-neutral-100"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {c.name?.charAt(0) || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-neutral-400 truncate dir-ltr text-left">
                      {c.phone || c.email || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-neutral-400">
                    {c.totalOrders || 0}
                  </span>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="p-0.5 text-primary-500"
                      title={t("common.call", "اتصال")}
                    >
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
