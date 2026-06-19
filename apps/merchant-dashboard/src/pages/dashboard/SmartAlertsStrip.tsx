// SmartAlertsStrip — the compact "critical only" alert chips extracted
// from DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 16).
//
// Renders up to 3 critical alerts (danger + warning only) as small
// inline chips. Each chip has an icon, title, short description, and
// a dismiss button.
//
// Visual fidelity preserved 1:1:
// - container: bg-white/80, blur backdrop, white border, rounded-2xl
// - chip layout: flex flex-wrap, gap-1.5
// - chip styling: per-type border + bg (red/amber for danger/warning,
//   blue/emerald for info/success — only the first two render here)
// - icon: type-colored, h-3, shrink-0
// - dismiss button: hover black/5 bg, X icon h-2.5
// - dismissing state: opacity-0 scale-95 transition

import { X } from "lucide-react";

export type SmartAlert = {
  id: string;
  type: "danger" | "warning" | "info" | "success";
  icon: React.ElementType;
  title: string;
  description: string;
};

type Props = {
  alerts: SmartAlert[];
  dismissingIds: Set<string>;
  onDismiss: (id: string) => void;
};

const BORDER_MAP: Record<SmartAlert["type"], string> = {
  danger: "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  info: "border-primary-200 bg-primary-50",
  success: "border-emerald-200 bg-emerald-50",
};

const ICON_MAP: Record<SmartAlert["type"], string> = {
  danger: "text-red-500",
  warning: "text-amber-500",
  info: "text-primary-500",
  success: "text-emerald-500",
};

export function SmartAlertsStrip({ alerts, dismissingIds, onDismiss }: Props) {
  const critical = alerts
    .filter((a) => a.type === "danger" || a.type === "warning")
    .slice(0, 3);
  if (critical.length === 0) return null;
  return (
    <div className="rounded-2xl border border-white/50 bg-white/80 backdrop-blur-xl shadow-card p-3">
      <div className="flex flex-wrap gap-1.5">
        {critical.map((alert) => {
          const isDismissing = dismissingIds.has(alert.id);
          return (
            <div
              key={alert.id}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border backdrop-blur-sm transition-all duration-300
                    ${
                      BORDER_MAP[alert.type] || "border-neutral-100 bg-neutral-50"
                    } ${isDismissing ? "opacity-0 scale-95" : ""}`}
            >
              <alert.icon
                className={`h-3 w-3 shrink-0 ${
                  ICON_MAP[alert.type] || "text-neutral-500"
                }`}
              />
              <span className="text-xs font-bold text-neutral-900 whitespace-nowrap">
                {alert.title}
              </span>
              <span className="text-xs text-neutral-500 truncate max-w-[160px]">
                {alert.description}
              </span>
              <button
                onClick={() => onDismiss(alert.id)}
                className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
              >
                <X className="h-2.5 w-2.5 text-neutral-400" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
