// MoreSection — the "المزيد" collapsible wrapper extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 22).
//
// Renders the entire "more" block: a click-to-expand header that
// toggles the `showMore` state, then two stacked children:
//   - RecentCustomersList
//   - QuickStatsGrid
//
// Visual fidelity preserved 1:1:
// - container: bg-white/80, blur backdrop, white border, rounded-2xl,
//   overflow-hidden
// - header: full-width button, hover neutral-50, ChevronDown rotates
//   on toggle (-rotate-90 when closed)
// - inner padding: px-4 sm:px-5 pb-4 sm:pb-5 space-y-4

import { ChevronDown } from "lucide-react";
import type { TFunction } from "i18next";
import { RecentCustomersList } from "./RecentCustomersList";
import { QuickStatsGrid } from "./QuickStatsGrid";

type Props = {
  showMore: boolean;
  onToggle: () => void;
  recentCustomers: any[];
  brandsCount: number;
  tagsCount: number;
  categoriesCount: number;
  productsCount: number;
  ordersCount: number;
  t: TFunction;
};

export function MoreSection({
  showMore,
  onToggle,
  recentCustomers,
  brandsCount,
  tagsCount,
  categoriesCount,
  productsCount,
  ordersCount,
  t,
}: Props) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-neutral-50 transition-colors"
      >
        <h3 className="font-bold text-sm sm:text-base text-neutral-900">
          {t("dashboard.more", "المزيد")}
        </h3>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition-transform ${showMore ? "" : "-rotate-90"}`}
        />
      </button>
      {showMore && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
          <RecentCustomersList customers={recentCustomers} t={t} />
          <QuickStatsGrid
            brandsCount={brandsCount}
            tagsCount={tagsCount}
            categoriesCount={categoriesCount}
            productsCount={productsCount}
            ordersCount={ordersCount}
            t={t}
          />
        </div>
      )}
    </div>
  );
}
