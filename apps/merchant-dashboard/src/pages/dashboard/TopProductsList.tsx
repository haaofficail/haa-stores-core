// TopProductsList — the "أفضل المنتجات" card extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 18).
//
// Renders the top-N products ranked by revenue. Each row shows the
// rank badge (gold for #1, silver for #2, bronze for #3, neutral
// for the rest), product name, quantity sold, total revenue, and a
// percentage-of-total indicator. Includes a horizontal progress bar
// colored with the CHART_COLORS gradient.
//
// Visual fidelity preserved 1:1:
// - container: bg-white/80, blur backdrop, white border, rounded-2xl
// - header: title + small "by revenue" subtitle
// - row: rank badge + name + meta (qty / revenue / %)
// - progress bar: 2px tall, rounded, gradient fill from
//   CHART_COLORS[i] to CHART_COLORS[i+1]
// - empty state: neutral-400 text, "no data" message

import type { TFunction } from "i18next";
import { Package } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "./constants";
import { MerchantEmptyState } from "@/components/ui/MerchantEmptyState";

export type TopProduct = {
  productId: number;
  name: string;
  totalQuantity: number;
  totalRevenue: string | number;
};

type Props = {
  products: TopProduct[];
  t: TFunction;
};

function rankClass(i: number): string {
  if (i === 0) return "bg-amber-100 text-amber-700";
  if (i === 1) return "bg-neutral-100 text-neutral-600";
  if (i === 2) return "bg-orange-100 text-orange-700";
  return "bg-neutral-50 text-neutral-400";
}

export function TopProductsList({ products, t }: Props) {
  if (products.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-5">
        <h3 className="font-bold text-base text-neutral-900 mb-3 flex items-center gap-2">
          {t("dashboard.topProducts", "أفضل المنتجات")}
          <span className="text-xs font-normal text-neutral-400">
            {t("dashboard.byRevenue", "(حسب الإيرادات)")}
          </span>
        </h3>
        <MerchantEmptyState
          icon={Package}
          title={t("common.noData", "لا توجد بيانات كافية")}
          compact
        />
      </div>
    );
  }
  const maxRevenue = Math.max(...products.map((p) => Number(p.totalRevenue)));
  const totalRevenue = products.reduce(
    (s, p) => s + Number(p.totalRevenue),
    0,
  );
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-5">
      <h3 className="font-bold text-base text-neutral-900 mb-3 flex items-center gap-2">
        {t("dashboard.topProducts", "أفضل المنتجات")}
        <span className="text-xs font-normal text-neutral-400">
          {t("dashboard.byRevenue", "(حسب الإيرادات)")}
        </span>
      </h3>
      <div className="space-y-4">
        {products.map((p, i) => {
          const revenue = Number(p.totalRevenue);
          const pct = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
          return (
            <div key={p.productId}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${rankClass(
                      i,
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {p.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-neutral-400">
                    {p.totalQuantity} {t("common.sold", "مباع")}
                  </span>
                  <span className="text-xs font-bold text-neutral-900">
                    {formatNumber(revenue)} {t("common.sar", "ر.س")}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                  >
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(revenue / maxRevenue) * 100}%`,
                    background: `linear-gradient(to left, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[(i + 1) % CHART_COLORS.length]})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
