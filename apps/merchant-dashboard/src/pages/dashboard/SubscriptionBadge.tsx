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
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getRemainingDays } from "./constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const days = getRemainingDays(subscription.currentPeriodEnd);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-white/80 border border-neutral-200/50 shadow-sm w-fit min-h-11 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            aria-label={t('subscriptions.viewPlan', 'تفاصيل الباقة')}
          >
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
              ? "bg-primary-50 text-primary-600"
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
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs space-y-2 p-3">
          <div className="space-y-1">
            <p className="text-xs font-bold text-neutral-900">
              {subscription.planName} —{' '}
              {t('subscriptions.remainingDays', '{{count}} يوم').replace(
                '{{count}}',
                String(days),
              )}
            </p>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {days <= 7
                ? t('subscriptions.trialEndingSoon', 'الفترة التجريبية تنتهي قريباً. رقّ خطتك لتجنّب إيقاف المتجر.')
                : days <= 30
                  ? t('subscriptions.trialEnding', 'تنتهي الفترة الحالية خلال شهر. يمكنك الترقية الآن.')
                  : t('subscriptions.activeHint', 'باقتك نشطة. يمكنك إدارة الفوترة من الإعدادات.')}
            </p>
          </div>
          <Link
            to="/settings/subscription"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary-500 px-3 text-xs font-bold text-white hover:bg-primary-600 transition-colors"
          >
            {t('subscriptions.upgrade', 'ترقية الباقة')}
          </Link>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
