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
          aria-label={t("common.openMenuAria", "فتح قائمة التنقل")}
          className="lg:hidden p-2 -ms-2 rounded-xl hover:bg-neutral-100 transition-colors shrink-0"
          onClick={() => {
            /* sidebar toggle handled by layout */
          }}
        >
          <Menu className="h-5 w-5 text-neutral-700" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 truncate">
            {t("dashboard.title", "لوحة التحكم")}
          </h1>
          <p className="text-xs text-neutral-400 truncate">
            {formatTimeAgo(t, new Date())}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {/* Header icon buttons — hit area ≥ 44x44 (WCAG 2.5.5). */}
        <button
          type="button"
          aria-label={t("common.notifications", "الإشعارات")}
          className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-neutral-100 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400"
          title={t("common.notifications", "الإشعارات")}
        >
          <Bell className="h-5 w-5 text-neutral-600" />
          {hasUrgent && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          aria-label={t("common.refresh", "تحديث")}
          className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400"
          title={t("common.refresh", "تحديث")}
        >
          <RotateCw className="h-4 w-4 text-neutral-600" />
        </button>
      </div>
    </div>
  );
}
