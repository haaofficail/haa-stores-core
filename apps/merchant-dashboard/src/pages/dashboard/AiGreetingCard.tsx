// AiGreetingCard — the compact "المساعد الذكي" banner extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 13).
//
// Renders a one-line AI greeting with a bot icon and an "AI" badge.
// Hidden when the parent provides no greeting text.
//
// Visual fidelity preserved 1:1:
// - container: blue→indigo→violet gradient bg, blue-200/50 border,
//   rounded-2xl, shadow-card
// - bot icon: blue→indigo gradient tile, shadow-blue-500/25
// - "AI" badge: blue-100 bg, blue-600 text, sparkles icon
// - greeting text: small (text-xs), neutral-600

import { Bot, Sparkles } from "lucide-react";
import type { TFunction } from "i18next";

type Props = {
  greeting: string | null;
  t: TFunction;
};

export function AiGreetingCard({ greeting, t }: Props) {
  if (!greeting) return null;
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-indigo-50 to-violet-50 rounded-2xl p-4 border border-primary-200/50 shadow-card">
      <div className="relative flex items-start gap-2.5">
        <div className="p-2 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-primary-500/25 shrink-0">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-sm font-bold text-primary-900">
              {t("dashboard.aiAssistant", "المساعد الذكي")}
            </span>
            <span className="flex items-center gap-1 text-xs text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded-full font-medium">
              <Sparkles className="h-2.5 w-2.5" />
              {t("dashboard.aiPowered", "AI")}
            </span>
          </div>
          <p className="text-xs text-neutral-600">{greeting}</p>
        </div>
      </div>
    </div>
  );
}
