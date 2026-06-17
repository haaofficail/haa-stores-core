// QuickStatsGrid — the "إحصائيات سريعة" tiles (brands / tags /
// categories / products / orders) extracted from DashboardHome.tsx
// (Quality Pass 2 — Item 2.6, Step 19).
//
// Renders a 3-col grid of small stat tiles. Items with count = 0 are
// hidden (filter applied inline). Each tile has a gradient icon
// plus a count + label.
//
// Visual fidelity preserved 1:1:
// - container: bg-white/80, blur backdrop, white border, rounded-2xl
// - grid: grid-cols-3, gap-2
// - tile: flex-col, gradient icon tile (h-3) + count (bold) + label
//   (11px neutral-500)
// - color palette per type: blue (brands), purple (tags),
//   amber (categories), emerald (products), rose (orders)

import { Tag, Layers, Package, ShoppingCart, List } from "lucide-react";
import type { TFunction } from "i18next";

type Props = {
  brandsCount: number;
  tagsCount: number;
  categoriesCount: number;
  productsCount: number;
  ordersCount: number;
  t: TFunction;
};

export function QuickStatsGrid({
  brandsCount,
  tagsCount,
  categoriesCount,
  productsCount,
  ordersCount,
  t,
}: Props) {
  const items = [
    {
      icon: Tag,
      label: t("common.brands", "ماركات"),
      count: brandsCount,
      color: "from-blue-400 to-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: Layers,
      label: t("common.tags", "تاجات"),
      count: tagsCount,
      color: "from-purple-400 to-purple-600",
      bg: "bg-purple-50",
    },
    {
      icon: Package,
      label: t("common.categories", "تصنيفات"),
      count: categoriesCount,
      color: "from-amber-400 to-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: ShoppingCart,
      label: t("common.products", "منتجات"),
      count: productsCount,
      color: "from-emerald-400 to-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: List,
      label: t("common.orders", "طلبات"),
      count: ordersCount,
      color: "from-rose-400 to-rose-600",
      bg: "bg-rose-50",
    },
  ].filter((item) => item.count > 0);
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-4">
      <h3 className="font-bold text-sm text-neutral-900 mb-3">
        {t("dashboard.quickStats", "إحصائيات سريعة")}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl ${item.bg} border border-transparent transition-colors`}
            >
              <div
                className={`p-1.5 rounded-lg bg-gradient-to-br ${item.color} text-white shadow-sm`}
              >
                <Icon className="h-3 w-3" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-neutral-900 leading-none">
                  {item.count}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {item.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
