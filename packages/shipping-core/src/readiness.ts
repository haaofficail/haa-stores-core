// Shipping provider readiness state machine — DECISION-OS-013.
//
// Provider-agnostic readiness model that classifies each shipping provider
// into one of seven states. Pure computation against env + config + factory
// status — NO live API calls, NO credentials handled, NO secrets printed.
//
// States:
//   - not_configured     credentials missing
//   - mock_ready         the in-process mock (haa_mock) — always available
//   - sandbox_configured sandbox creds present, mode != live
//   - sandbox_verified   sandbox round-trip completed (tracked externally; flag fed in)
//   - live_locked        live capabilities advertised false until launch gate clears
//   - live_ready         live creds + signed off + owner GO + factory unblocked
//   - provider_error     the most recent health snapshot indicates a provider failure

import type { ShippingProviderCode, ShippingMode } from "@haa/shared";
import { getShippingProviderStatus } from "./factory.js";

export type ShippingReadinessState =
  | "not_configured"
  | "mock_ready"
  | "sandbox_configured"
  | "sandbox_verified"
  | "live_locked"
  | "live_ready"
  | "provider_error";

export interface ProviderReadiness {
  provider: ShippingProviderCode;
  state: ShippingReadinessState;
  mode: ShippingMode;
  reason: string;
  hasCredentials: boolean;
  liveBlocked: boolean;
  // Set true ONLY by external supervisors that have manually verified a
  // sandbox round-trip (creating a label, tracking it, cancelling). This
  // module does not flip the flag — it is fed in.
  sandboxVerified?: boolean;
  // Most recent transient error from the provider (e.g. timeout, 5xx).
  lastError?: string;
}

export interface ReadinessOptions {
  // Manual proofs that a provider's sandbox has been exercised end-to-end.
  // Source of truth lives outside this module (an ops doc or DB row).
  sandboxVerified?: Partial<Record<ShippingProviderCode, boolean>>;
  // Most recent failure per provider, fed from monitoring. Optional.
  lastErrors?: Partial<Record<ShippingProviderCode, string>>;
}

const PROVIDER_LIST: ShippingProviderCode[] = ["manual", "haa_mock", "oto", "aramex", "smsa"];

/**
 * Compute the readiness state for every known shipping provider.
 * Pure function — no I/O. Safe to call from API routes and dashboards.
 */
export function getShippingReadinessStates(
  options: ReadinessOptions = {},
): ProviderReadiness[] {
  const status = getShippingProviderStatus();
  const mode = status.activeMode;
  const liveBlocked = status.liveBlocked;

  const result: ProviderReadiness[] = [];

  for (const provider of PROVIDER_LIST) {
    const lastError = options.lastErrors?.[provider];
    const sandboxVerified = options.sandboxVerified?.[provider] ?? false;
    const hasCredentials = providerHasCredentials(provider, status);

    let state: ShippingReadinessState;
    let reason: string;

    if (lastError) {
      state = "provider_error";
      reason = `Most recent health snapshot reported an error: ${truncate(lastError)}`;
    } else if (provider === "haa_mock" || provider === "manual") {
      state = "mock_ready";
      reason = "In-process mock provider — always available, never calls a live API.";
    } else if (!hasCredentials) {
      state = "not_configured";
      reason = "Credentials are not set in the environment.";
    } else if (liveBlocked) {
      // Credentials present + live mode globally blocked → either sandbox or live_locked.
      if (mode === "sandbox") {
        state = sandboxVerified ? "sandbox_verified" : "sandbox_configured";
        reason = sandboxVerified
          ? "Sandbox credentials present and a sandbox round-trip has been verified."
          : "Sandbox credentials present; verification round-trip pending.";
      } else {
        state = "live_locked";
        reason = "Credentials present but live capabilities are blocked by policy (DECISION-OS-013).";
      }
    } else {
      // liveBlocked = false (would only flip in a future independent decision).
      state = sandboxVerified ? "live_ready" : "live_locked";
      reason = sandboxVerified
        ? "Credentials present, owner approval recorded, sandbox verified — ready for live use."
        : "Live unblocked but sandbox verification has not been recorded.";
    }

    result.push({
      provider,
      state,
      mode,
      reason,
      hasCredentials,
      liveBlocked,
      sandboxVerified,
      lastError,
    });
  }

  return result;
}

function providerHasCredentials(
  provider: ShippingProviderCode,
  status: ReturnType<typeof getShippingProviderStatus>,
): boolean {
  switch (provider) {
    case "manual":
    case "haa_mock":
      return true;
    case "oto":
      return status.otoConfigured;
    case "aramex":
      return status.aramexConfigured;
    case "smsa":
      return status.smsaConfigured;
    default:
      return false;
  }
}

function truncate(message: string, max = 200): string {
  if (message.length <= max) return message;
  return message.slice(0, max - 1) + "…";
}
