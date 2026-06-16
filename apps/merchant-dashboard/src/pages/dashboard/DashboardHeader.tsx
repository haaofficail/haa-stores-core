// DashboardHeader — top header bar extracted from DashboardHome.tsx
// (Quality Pass 2 — Item 2.6, Step 6).
//
// Renders: mobile menu trigger (no-op for now — layout handles it),
// title + last-updated timestamp, notifications button with red dot
// when there are danger/warning alerts, and a refresh button.
//
// Visual fidelity preserved 1:1:
// - left side: lg:hidden menu button, then h1 title + small "now"
//   timestamp below it (uses formatTimeAgo)
// - right side: bell with conditional red dot, refresh button

import { Menu, Bell, RotateCw } from "lucide-react";
import type { TFunction } from "i18next";
import { formatTimeAgo } from "./constants";

type Alert = { type: string };

type Props = {
  t: TFunction;
  visibleAlerts: Alert[];
  onRefresh: () => void;
};

export function DashboardHeader({ t, visibleAlerts, onRefresh }: Props) {
  const hasUrgent = visibleAlerts.filter(
    (a) => a.type === "danger" || a.type === "warning",
  ).length > 0;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors shrink-0"
          onClick={() => {
            /* sidebar toggle handled by layout */
          }}
        >
          <Menu className="h-5 w-5 text-neutral-700" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-neutral-900 truncate">
            {t("dashboard.title", "لوحة التحكم")}
          </h1>
          <p className="text-xs text-neutral-400 truncate">
            {formatTimeAgo(t, new Date())}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="p-2 rounded-xl hover:bg-neutral-100 transition-colors relative"
          title={t("common.notifications", "الإشعارات")}
        >
          <Bell className="h-5 w-5 text-neutral-600" />
          {hasUrgent && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </button>
        <button
          type="button"
          className="p-2 rounded-xl hover:bg-neutral-100 transition-colors"
          onClick={onRefresh}
          title={t("common.refresh", "تحديث")}
        >
          <RotateCw className="h-4 w-4 text-neutral-600" />
        </button>
      </div>
    </div>
  );
}
