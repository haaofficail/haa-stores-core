// Landing page claims — TASK-0038 P0-#2 (marketing claims audit)
//
// Every numeric or specific claim on the landing page is gated by a
// feature flag with three states:
//
//   - 'verified'  → claim is backed by real data. Show as-is.
//   - 'unverified'→ claim is aspirational / placeholder. Show a
//                   qualified substitute (e.g., "انضم لمجتمع Haa"
//                   instead of "2,400+ تاجر سعودي").
//   - 'disabled'  → claim is removed entirely.
//
// Default for all production builds = 'unverified' until owner
// confirms each claim with data. Owner can flip to 'verified' via
// env var (VITE_LANDING_CLAIMS) or by editing this file.

export type ClaimStatus = 'verified' | 'unverified' | 'disabled';

type ClaimConfig = {
  status: ClaimStatus;
  // What to show when status != 'verified'
  fallback: string;
  // What to show when status == 'verified'
  verified: string;
};

function getGlobalStatus(): ClaimStatus {
  const env = (import.meta.env.VITE_LANDING_CLAIMS as string | undefined) ?? 'unverified';
  if (env === 'verified' || env === 'unverified' || env === 'disabled') {
    return env;
  }
  return 'unverified';
}

function getOverrides(): Record<string, ClaimStatus> {
  const env = (import.meta.env.VITE_LANDING_CLAIMS as string | undefined) ?? '';
  if (!env) return {};
  try {
    const parsed = JSON.parse(env);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, ClaimStatus>;
    }
  } catch {
    // not JSON — treat as global
  }
  return {};
}

function resolveStatus(localKey: string): ClaimStatus {
  // If env is a JSON object, use per-claim override if present.
  // Otherwise, env is a global keyword that overrides the per-claim
  // default. The per-claim default is the safe fallback (e.g.,
  // testimonials = 'disabled').
  const overrides = getOverrides();
  if (overrides[localKey]) return overrides[localKey];
  const global = getGlobalStatus();
  if (global !== 'unverified') return global; // explicit global override wins
  return DEFAULT_STATUS[localKey as keyof typeof LANDING_CLAIMS] ?? 'unverified';
}

export const LANDING_CLAIMS = {
  // "2,400+ تاجر سعودي يبيعون على Haa اليوم" — final CTA
  merchantCount: {
    fallback: 'انضم لمجتمع Haa',
    verified: '2,400+',
  } satisfies Omit<ClaimConfig, 'status'>,

  // "0% عمولة" — feature card + final CTA
  zeroCommission: {
    fallback: 'عمولة 0% على الباقة المجانية',
    verified: '0% عمولة',
  } satisfies Omit<ClaimConfig, 'status'>,

  // "مجاني للأبد" — pricing teaser
  freeForever: {
    fallback: 'باقة مجانية متاحة',
    verified: 'مجاني للأبد',
  } satisfies Omit<ClaimConfig, 'status'>,

  // "4 ثيمات احترافية" — feature card + how-it-works step 3
  themeCount: {
    fallback: 'ثيمات جاهزة للتخصيص',
    verified: '4 ثيمات احترافية',
  } satisfies Omit<ClaimConfig, 'status'>,

  // Live activity ticker (line 330-419) — events listed as 'const'
  liveTicker: {
    fallback: '',
    verified: 'enabled',
  } satisfies Omit<ClaimConfig, 'status'>,

  // Testimonials (3 fake names: خالد السبيعي، نورة العتيبي، ...)
  testimonials: {
    fallback: '',
    verified: 'enabled',
  } satisfies Omit<ClaimConfig, 'status'>,

  // Government trust logos (وزارة التجارة, Maroof, ZATCA, etc.)
  // TASK-0038 audit P0-#9: each logo's right-to-use must be verified.
  // Until MoCI registration (G1) + Maroof (G2/G3) + ZATCA (G2) are
  // all approved, the logos MUST NOT display.
  // Default 'disabled' (not just 'unverified') because there is no
  // honest middle ground for government-issued logos — you either
  // have the right to use them or you don't.
  govLogos: {
    fallback: '',
    verified: 'enabled',
  } satisfies Omit<ClaimConfig, 'status'>,
} as const;

// Default status per claim. The audit requires several claims to be
// 'disabled' by default (testimonials, live ticker, govLogos) because
// there is no qualified middle ground for them.
const DEFAULT_STATUS: Record<keyof typeof LANDING_CLAIMS, ClaimStatus> = {
  merchantCount: 'unverified',
  zeroCommission: 'unverified',
  freeForever: 'unverified',
  themeCount: 'unverified',
  liveTicker: 'disabled',
  testimonials: 'disabled',
  govLogos: 'disabled',
};

// Helper: returns the right text for a claim, applying its status.
export function getClaim(
  key: keyof typeof LANDING_CLAIMS,
): { text: string; status: ClaimStatus } {
  const claim = LANDING_CLAIMS[key];
  const status = resolveStatus(key);
  if (status === 'disabled') {
    return { text: '', status: 'disabled' };
  }
  if (status === 'verified') {
    return { text: claim.verified, status: 'verified' };
  }
  return { text: claim.fallback, status: 'unverified' };
}

// Helper for boolean gates (live ticker, testimonials)
export function isClaimEnabled(key: keyof typeof LANDING_CLAIMS): boolean {
  return resolveStatus(key) === 'verified';
}
