// AnalyticsSection — the collapsible "تحليلات" wrapper extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 21).
//
// Renders the entire analytics block: a click-to-expand header that
// toggles the `showAnalytics` state, then two rows of content:
//   - Charts row: SalesChart (col-span-3) + CategoryPieChart (col-span-2)
//   - Middle row: RecentSoldProducts (col-span-3) + TopProductsList
//     (col-span-2)
//
// Visual fidelity preserved 1:1:
// - container: bg-white/80, blur backdrop, white border, rounded-2xl,
//   overflow-hidden
// - header: full-width button, hover neutral-50, ChevronDown rotates
//   on toggle
// - inner padding: px-5 pb-5 space-y-5
// - grids: lg:grid-cols-5 (charts and middle rows)

import { ChevronDown } from "lucide-react";
import type { TFunction } from "i18next";
import { SalesChart } from "./SalesChart";
import { CategoryPieChart } from "./CategoryPieChart";
import { RecentSoldProducts } from "./RecentSoldProducts";
import { TopProductsList } from "./TopProductsList";

type Props = {
  showAnalytics: boolean;
  onToggle: () => void;
  salesData: any;
  orderStatusDist: Array<{ status: string; count: number }>;
  recentItems: any[];
  topProducts: any[];
  t: TFunction;
  i18nLanguage: string;
};

export function AnalyticsSection({
  showAnalytics,
  onToggle,
  salesData,
  orderStatusDist,
  recentItems,
  topProducts,
  t,
  i18nLanguage,
}: Props) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-neutral-50 transition-colors"
      >
        <h3 className="font-bold text-sm sm:text-base text-neutral-900">
          {t("dashboard.analytics", "تحليلات")}
        </h3>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition-transform ${showAnalytics ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {showAnalytics && (
        <div className="px-5 pb-5 space-y-5">
          {/* Charts Row */}
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <SalesChart
              salesData={salesData}
              t={t}
              i18nLanguage={i18nLanguage}
            />
            <CategoryPieChart orderStatusDist={orderStatusDist} t={t} />
          </div>

          {/* Middle Row: Recent Sold Products + Top Products */}
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <RecentSoldProducts orders={recentItems} t={t} />
            <div className="col-span-2 space-y-5">
              <TopProductsList products={topProducts} t={t} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
