// AiGreetingCard — the compact "المساعد الذكي" banner extracted from
// DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 13).
//
// Renders a one-line AI greeting with a bot icon and an "AI" badge.
// Hidden when the parent provides no greeting text.
//
// Brand fidelity: all gradients stay on the Haa primary scale (no indigo
// or violet) — the platform brand is a single blue (#5c9cd5). Mixing in
// indigo/violet produced a "two brands" perception on dashboard chrome.

import { Bot, Sparkles } from "lucide-react";
import type { TFunction } from "i18next";

type Props = {
  greeting: string | null;
  t: TFunction;
};

export function AiGreetingCard({ greeting, t }: Props) {
  if (!greeting) return null;
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-primary-100/60 to-primary-50 rounded-2xl p-4 border border-primary-200/50 shadow-card">
      <div className="relative flex items-start gap-2.5">
        <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl text-white shadow-lg shadow-primary-500/25 shrink-0">
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
