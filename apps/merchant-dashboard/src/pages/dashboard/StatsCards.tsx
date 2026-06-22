// StatsCards — the extended KPI grid (5 stat cards) extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 2).
//
// Renders the row of KPI cards (total sales, total orders, new orders,
// active products, wallet) below the primary 4-tile header.
//
// Visual fidelity is preserved 1:1 with the original inline JSX:
// - card layout (rounded-2xl, bg-white/80, blur backdrop, white border)
// - gradient icon tile with absolute-positioned bgGlow
// - trend badge (up/down/neutral) with matching color + arrow icon
// - tabular-nums value + suffix + label

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type StatCardData = {
  label: string;
  value: string;
  suffix: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  gradient: string;
  shadow: string;
  bgGlow: string;
  // Loosened to `string` so the parent can pass a literal value
  // ("up" | "down" | "neutral" | any other). The component only
  // branches on these three values; anything else renders as neutral.
  trend: string;
  trendValue: string;
};

type Props = {
  stats: StatCardData[];
  showOnMobile: boolean;
};

export function StatsCards({ stats, showOnMobile }: Props) {
  return (
    <div
      className={`grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-3 ${
        showOnMobile ? "" : "hidden sm:grid"
      }`}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-card"
        >
          <div
            className={`absolute top-0 right-0 w-20 h-20 ${s.bgGlow} rounded-full translate-x-10 -translate-y-10 blur-2xl`}
          />
          <div className="relative">
            <div className="flex items-start justify-between mb-2">
              <div
                className={`p-2 rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-lg ${s.shadow}`}
              >
                <s.icon className="h-3.5 w-3.5" />
              </div>
              {s.trendValue && (
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xl font-bold text-xs ${
                    s.trend === "up"
                      ? "text-emerald-600 bg-emerald-50"
                      : s.trend === "down"
                        ? "text-danger bg-danger-subtle"
                        : "text-neutral-500 bg-neutral-100"
                  }`}
                >
                  {s.trend === "up" ? (
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  ) : s.trend === "down" ? (
                    <ArrowDownRight className="h-2.5 w-2.5" />
                  ) : null}
                  {/* dir="ltr" keeps signed percentages from bidi-flipping
                      to "23%-" inside an RTL parent (audit P0-#1). */}
                  <span dir="ltr" className="tabular-nums">{s.trendValue}</span>
                </div>
              )}
            </div>
            <p className="text-xl font-bold text-neutral-900 tabular-nums leading-none mb-1.5">
              {s.value}
              <span
                className="text-xs font-medium text-neutral-400 ms-1.5"
              >
                {s.suffix}
              </span>
            </p>
            <p className="text-xs text-neutral-500 font-medium">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
