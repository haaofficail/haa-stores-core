// SubscriptionBadge — the mobile-compact subscription status pill
// extracted from DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 7).
//
// Renders: plan name + status pill (active/trialing/cancelled/past_due)
// + remaining-days counter that color-codes based on urgency.
//
// Visual fidelity preserved 1:1:
// - container: w-fit pill, bg-white/80, neutral border, shadow-sm
// - crown icon: h-3, amber-500
// - status pill: rounded-full, [10px] text, color matches status
// - remaining-days: red ≤7d, amber ≤30d, emerald otherwise

import { Crown } from "lucide-react";
import type { TFunction } from "i18next";
import { cn } from "@/lib/utils";
import { getRemainingDays } from "./constants";

type Props = {
  subscription: {
    planName: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  t: TFunction;
};

export function SubscriptionBadge({ subscription, t }: Props) {
  if (!subscription) return null;
  return (
    <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-white/80 border border-neutral-200/50 shadow-sm w-fit">
      <Crown className="h-3 w-3 text-amber-500 shrink-0" />
      <span className="font-medium text-neutral-600">
        {subscription.planName}
      </span>
      <span
        className={cn(
          "font-bold px-1.5 py-0.5 rounded-full text-xs",
          subscription.status === "active"
            ? "bg-emerald-50 text-emerald-600"
            : subscription.status === "trialing"
              ? "bg-blue-50 text-blue-600"
              : "bg-red-50 text-red-600",
        )}
      >
        {subscription.status === "active"
          ? t("subscriptions.status_active", "نشط")
          : subscription.status === "trialing"
            ? t("subscriptions.status_trialing", "تجريبي")
            : subscription.status === "cancelled"
              ? t("subscriptions.status_cancelled", "ملغي")
              : subscription.status === "past_due"
                ? t("subscriptions.status_past_due", "متأخر")
                : subscription.status}
      </span>
      {(() => {
        const days = getRemainingDays(subscription.currentPeriodEnd);
        const color =
          days <= 7
            ? "text-red-600"
            : days <= 30
              ? "text-amber-600"
              : "text-emerald-600";
        return (
          <span className={`font-semibold ${color}`}>
            {t("subscriptions.remainingDays", "{{count}} يوم").replace(
              "{{count}}",
              String(days),
            )}
          </span>
        );
      })()}
    </div>
  );
}
