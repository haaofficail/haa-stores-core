// StoreReadinessBanner — the one-liner red banner extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 10).
//
// Renders a single horizontal alert button when the store has readiness
// issues (e.g. missing store info, unconfigured payment, etc.),
// showing the first issue title (or a count) plus a score badge.
//
// Click target: navigates to /settings.
//
// Visual fidelity preserved 1:1:
// - container: full-width button, red-50 bg, red-100 border, rounded-2xl
// - alert triangle icon (h-4, red-500)
// - title text (red-700, bold, truncate)
// - score badge (neutral pill, tabular-nums)
// - chevron icon

import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronDown } from "lucide-react";
import type { TFunction } from "i18next";

type Readiness = {
  score: number;
  issues: Array<{ title: string }>;
};

type Props = {
  readiness: Readiness | null | undefined;
  t: TFunction;
};

export function StoreReadinessBanner({ readiness, t }: Props) {
  const navigate = useNavigate();
  if (!readiness || readiness.issues.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => navigate("/settings")}
      className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors text-right"
    >
      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
      <span className="text-xs font-bold text-red-700 flex-1 truncate">
        {readiness.issues.length === 1
          ? readiness.issues[0].title
          : t(
              "dashboard.readiness.multipleIssues",
              "{{count}} مشاكل تحتاج حل",
            ).replace("{{count}}", String(readiness.issues.length))}
      </span>
      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 tabular-nums shrink-0">
        {readiness.score}%
      </span>
      <ChevronDown className="h-3 w-3 text-neutral-400 shrink-0" />
    </button>
  );
}
