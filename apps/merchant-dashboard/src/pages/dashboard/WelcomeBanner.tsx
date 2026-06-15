// WelcomeBanner — the "تهانينا! متجرك جاهز" celebration card
// extracted from DashboardHome.tsx (Quality Pass 2 — Item 2.6, Step 17).
//
// Renders a one-time celebration banner shown right after the merchant
// completes onboarding. Includes a party-popper icon, title +
// description, and a "close" button that dismisses it both in
// localStorage and in the parent's state.
//
// Visual fidelity preserved 1:1:
// - container: emerald→teal gradient bg, rounded-2xl, big shadow
// - decorative blur circles in the corners (white/10 + white/5)
// - party-popper icon in a white/20 backdrop-blurred tile
// - close button: ghost variant, white/80 text, white/10 hover bg
// - font sizing: title bold-base, description emerald-50 sm

import { PartyPopper } from "lucide-react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";

type Props = {
  t: TFunction;
  onDismiss: () => void;
};

export function WelcomeBanner({ t, onDismiss }: Props) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-2xl shadow-emerald-500/30">
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-32 -translate-y-32 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-24 translate-y-24 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <PartyPopper className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-base">
              {t("dashboard.firstWelcomeTitle", "تهانينا! متجرك جاهز")}
            </h2>
            <p className="text-emerald-50 text-sm">
              {t(
                "dashboard.firstWelcomeDesc",
                "يمكنك الآن البدء في إدارة متجرك ومتابعة الطلبات",
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/80 hover:text-white hover:bg-white/10 h-10 text-sm rounded-xl"
          onClick={onDismiss}
        >
          {t("common.close", "إغلاق")}
        </Button>
      </div>
    </div>
  );
}
