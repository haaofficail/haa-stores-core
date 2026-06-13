import type { ShippingProviderCode, ShippingMode } from "@haa/shared";
import type { ShippingProvider } from "./provider.js";
import { ManualShippingProvider } from "./manual.js";
import { HaaMockShippingProvider } from "./mock.js";
import { OtoShippingProvider } from "./oto.js";

export function createShippingProvider(
  providerCode?: ShippingProviderCode,
  mode?: ShippingMode,
): ShippingProvider {
  const resolvedProvider =
    providerCode ??
    (process.env.SHIPPING_PROVIDER as ShippingProviderCode) ??
    "manual";
  const resolvedMode =
    mode ?? (process.env.SHIPPING_MODE as ShippingMode) ?? "manual";

  if (resolvedMode === "live") {
    throw new Error(
      "SHIPPING_MODE=live is not allowed. " +
        "Live shipping is blocked until the Shipping Review Gate. " +
        "Set SHIPPING_MODE=manual or mock or sandbox for now.",
    );
  }

  if (resolvedProvider === "haa_mock") {
    return new HaaMockShippingProvider();
  }

  if (resolvedProvider === "oto") {
    return new OtoShippingProvider();
  }

  return new ManualShippingProvider();
}

export function getShippingProviderStatus(): {
  activeProvider: ShippingProviderCode;
  activeMode: ShippingMode;
  otoConfigured: boolean;
  otoAvailable: boolean;
  liveBlocked: boolean;
} {
  const mode = (process.env.SHIPPING_MODE as ShippingMode) || "manual";
  const provider =
    (process.env.SHIPPING_PROVIDER as ShippingProviderCode) || "manual";
  const hasOtoKeys = !!(process.env.OTO_MARKETPLACE_TOKEN || process.env.OTO_API_KEY || process.env.OTO_ACCESS_TOKEN || process.env.OTO_SANDBOX_API_KEY);

  return {
    activeProvider: provider,
    activeMode: mode,
    otoConfigured: hasOtoKeys,
    otoAvailable: provider === "oto" && hasOtoKeys,
    liveBlocked: true,
  };
}
