// PrimaryKpiCards — the 2 always-visible KPI tiles extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 8).
//
// Renders the "primary 2" KPI tiles shown on every screen at the top
// of the dashboard (above the toggle that reveals the full 5-tile
// extended grid):
//   - Today's Sales (emerald gradient + optional sales trend badge)
//   - Actionable Orders (blue gradient + optional blue pulse dot)
//
// The full 5-tile grid lives in StatsCards.tsx; this file is only
// the always-visible pair.
//
// Visual fidelity preserved 1:1:
// - container: grid-cols-2, gap-3
// - each tile: bg-white/80, blur backdrop, white border, rounded-2xl
// - absolute bgGlow (20x20 colored circle, blurred)
// - icon: gradient tile + matching shadow
// - trend/pulse badge in the top-right corner

import { DollarSign, ShoppingCart, ArrowUpRight } from "lucide-react";
import type { TFunction } from "i18next";
import { formatNumber } from "@/lib/utils";

type Props = {
  todaySales: number;
  salesTrendLabel: string | null;
  actionableOrderTotal: number;
  t: TFunction;
};

export function PrimaryKpiCards({
  todaySales,
  salesTrendLabel,
  actionableOrderTotal,
  t,
}: Props) {
  return (
    <div className="grid gap-3 grid-cols-2">
      {/* Today's Sales */}
      <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-card">
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full translate-x-10 -translate-y-10 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
            {salesTrendLabel && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-xl font-bold text-xs text-emerald-600 bg-emerald-50">
                <ArrowUpRight className="h-2.5 w-2.5" />
                {/* dir="ltr" + tabular-nums isolates the percentage as an
                    LTR run so "-23%" doesn't render as "23%-" inside an
                    RTL parent (audit P0-#1). */}
                <span dir="ltr" className="tabular-nums">{salesTrendLabel}</span>
              </div>
            )}
          </div>
          <p className="text-xl font-bold text-neutral-900 tabular-nums leading-none mb-1.5">
            {formatNumber(todaySales)}
            <span
              className="text-xs font-medium text-neutral-400 ms-1.5"
            >
              {t("common.sar", "ر.س")}
            </span>
          </p>
          <p className="text-xs text-neutral-500 font-medium">
            {t("dashboard.todaySales", "مبيعات اليوم")}
          </p>
        </div>
      </div>
      {/* Actionable Orders */}
      <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-card">
        <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/5 rounded-full translate-x-10 -translate-y-10 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-400 via-primary-500 to-indigo-600 text-white shadow-lg shadow-primary-500/25">
              <ShoppingCart className="h-3.5 w-3.5" />
            </div>
            {actionableOrderTotal > 0 && (
              <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
            )}
          </div>
          <p className="text-xl font-bold text-neutral-900 tabular-nums leading-none mb-1.5">
            {actionableOrderTotal}
          </p>
          <p className="text-xs text-neutral-500 font-medium">
            {t("dashboard.actionableOrders", "طلبات تحتاج إجراء")}
          </p>
        </div>
      </div>
    </div>
  );
}
