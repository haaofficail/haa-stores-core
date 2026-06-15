// NextActionBanner — the "Action Center" callout strip extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 5).
//
// Renders a horizontal strip of clickable action tiles (COD collection,
// ready to ship, ready for pickup, etc.) — the most important items
// that need merchant attention right now.
//
// Visual fidelity preserved 1:1:
// - container: bg-white/80, blur backdrop, white border, rounded-2xl
// - header: title + subtitle + optional "view all" button
// - mobile: horizontal scroll row of flex items
// - desktop: 3/5-col grid (md:grid-cols-5)
// - each tile: pill on mobile, full card on desktop, colored border
//   matching the item's bg, with a count + label
//
// The parent's useMemo already builds acItems with stable shape
// (key, count, label, color, bg, textColor, link), so we just pass
// that array through.

import { useNavigate } from "react-router-dom";
import type { TFunction } from "i18next";

export type ActionCenterItem = {
  key: string;
  count: number;
  label: string;
  color: string;
  bg: string;
  textColor: string;
  link: string;
};

type Props = {
  items: ActionCenterItem[];
  t: TFunction;
};

export function NextActionBanner({ items, t }: Props) {
  const navigate = useNavigate();
  if (items.length === 0) return null;
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-sm sm:text-base text-neutral-900">
            {t("dashboard.actionCenter.title", "مركز الإجراءات")}
          </h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {t(
              "dashboard.actionCenter.subtitle",
              "أهم الأشياء التي تحتاج تصرفك الآن",
            )}
          </p>
        </div>
        {items.length > 3 && (
          <button
            onClick={() => navigate("/orders")}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {t("dashboard.actionCenter.viewAll", "عرض الكل")}
          </button>
        )}
      </div>
      {/* Mobile: flex row, overflow scroll; Desktop: full grid */}
      <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 md:grid-cols-5 sm:overflow-visible sm:pb-0">
        {(items.length <= 3 ? items : items.slice(0, 3)).map((item) => (
          <button
            key={item.key}
            onClick={() => navigate(item.link)}
            className="shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border sm:flex-col sm:items-start sm:p-4 transition-all hover:shadow-sm"
            style={{
              borderColor:
                item.bg === "bg-amber-50"
                  ? "#fde68a"
                  : item.bg === "bg-indigo-50"
                    ? "#c7d2fe"
                    : item.bg === "bg-violet-50"
                      ? "#ddd6fe"
                      : item.bg === "bg-blue-50"
                        ? "#bfdbfe"
                        : "#fecaca",
            }}
          >
            <span
              className={`text-lg sm:text-2xl font-bold tabular-nums leading-none ${item.textColor}`}
            >
              {item.count}
            </span>
            <div className="text-right sm:mt-1">
              <p className={`text-xs sm:text-sm font-bold ${item.textColor}`}>
                {item.label}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
