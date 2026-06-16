// ShowMoreKpiToggle — the mobile-only "عرض المزيد" / "عرض أقل" toggle
// extracted from DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 20).
//
// Renders a full-width button that flips the `showMoreKpi` state in
// the parent. The chevron rotates 180° when expanded.
//
// Visual fidelity preserved 1:1:
// - mobile only (sm:hidden)
// - full-width blue-50 button, blue-600 text
// - hover: blue-100
// - chevron: h-3, transition-transform, rotate-180 when expanded

import { ChevronDown } from "lucide-react";
import type { TFunction } from "i18next";

type Props = {
  showMore: boolean;
  onToggle: () => void;
  t: TFunction;
};

export function ShowMoreKpiToggle({ showMore, onToggle, t }: Props) {
  return (
    <div className="sm:hidden mt-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
      >
        {showMore
          ? t("common.showLess", "عرض أقل")
          : t("common.showMore", "عرض المزيد")}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${showMore ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}
