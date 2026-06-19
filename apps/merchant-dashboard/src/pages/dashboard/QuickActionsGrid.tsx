// QuickActionsGrid — the "إجراءات سريعة" 4-button grid extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 15).
//
// Renders 4 quick action buttons:
//   - Add product (blue gradient, navigates to /products?create=true)
//   - View orders (neutral, navigates to /orders)
//   - Create coupon (neutral, navigates to /coupons)
//   - Open storefront (neutral, opens a new tab to /s/{slug} on the
//     storefront app; falls back to the current origin or localhost
//     when VITE_STOREFRONT_URL is not set)
//
// Visual fidelity preserved 1:1:
// - container: bg-white/80, blur backdrop, white border, rounded-2xl
// - grid: 2 cols on mobile, 4 cols on sm+
// - first button: blue gradient (highlighted as primary action)
// - other 3: neutral-100 with hover-neutral-200
// - all buttons: 4xl padding, hover lifts (-translate-y-0.5)

import { useNavigate } from "react-router-dom";
import { Plus, List, Percent, Globe } from "lucide-react";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction;
};

export function QuickActionsGrid({ t }: Props) {
  const navigate = useNavigate();
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-4">
      <h3 className="font-bold text-xs text-neutral-500 mb-3">
        {t("dashboard.quickActions.title", "إجراءات سريعة")}
      </h3>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        <button
          onClick={() => navigate("/products?create=true")}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-bold">
            {t("dashboard.quickActions.addProduct", "منتج")}
          </span>
        </button>
        <button
          onClick={() => navigate("/orders")}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-neutral-100 text-neutral-900 hover:bg-neutral-200 transition-all hover:-translate-y-0.5"
        >
          <List className="h-4 w-4" />
          <span className="text-sm font-bold">
            {t("dashboard.quickActions.viewOrders", "طلبات")}
          </span>
        </button>
        <button
          onClick={() => navigate("/coupons")}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-neutral-100 text-neutral-900 hover:bg-neutral-200 transition-all hover:-translate-y-0.5"
        >
          <Percent className="h-4 w-4" />
          <span className="text-sm font-bold">
            {t("dashboard.quickActions.createCoupon", "كوبون")}
          </span>
        </button>
        <button
          onClick={() => {
            const storeSlug =
              window.location.hostname === "localhost"
                ? "haa-demo"
                : window.location.pathname.split("/s/")[1]?.split("/")[0] ||
                  "haa-demo";
            const baseUrl =
              import.meta.env.VITE_STOREFRONT_URL ||
              (window.location.hostname === "localhost"
                ? "http://localhost:3000"
                : window.location.origin);
            window.open(`${baseUrl}/s/${storeSlug}`, "_blank");
          }}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-neutral-100 text-neutral-900 hover:bg-neutral-200 transition-all hover:-translate-y-0.5"
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm font-bold">
            {t("dashboard.quickActions.openStore", "المتجر")}
          </span>
        </button>
      </div>
    </div>
  );
}
