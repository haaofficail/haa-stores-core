// Resolve the public storefront origin from the merchant dashboard.
//
// The merchant dashboard lives at `merchant.<apex>` and the storefront lives
// at `<apex>`, so by default we derive the storefront origin by stripping the
// leading `merchant.` subdomain from the current host. This keeps staging and
// production correct without per-environment build config, and avoids the
// `http://localhost:5174` value leaking onto deployed builds when the
// `VITE_STOREFRONT_URL` env var is absent.
//
// Resolution order:
//   1. VITE_STOREFRONT_URL (explicit override; dev sets it to :5174)
//   2. derive from window.location host (strip `merchant.` → apex)
//   3. local dev fallback (:5173 dashboard → :5174 storefront)
//   4. last-resort 'http://localhost:5174' (SSR/no-window only)
//
// Extracted from OnboardingWizard.getStorefrontOrigin so every "open the
// storefront / marketplace" link shares one safe implementation.

export function getStorefrontOrigin(): string {
  const override = import.meta.env.VITE_STOREFRONT_URL;
  if (override) {
    return String(override).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.host) {
    const host = window.location.host;
    if (host.startsWith('merchant.')) {
      return `${window.location.protocol}//${host.slice('merchant.'.length)}`;
    }
    return window.location.origin.replace(/:5173$/, ':5174');
  }
  return 'http://localhost:5174';
}
