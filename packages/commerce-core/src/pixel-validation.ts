/**
 * Browser-safe pixel payload validator.
 *
 * Keep this module free of DB, Node, and service imports. Storefront imports
 * it through the `@haa/commerce-core/pixel-validation` subpath so Vite does
 * not pull the full commerce-core server bundle into the browser build.
 */

/**
 * Provider allowlist - each entry maps a known pixel provider to a
 * signature regex that MUST appear inside any <script> the frontend
 * receives for that provider. The frontend re-validates the script body
 * against this allowlist before cloning it into the live DOM.
 *
 * Why this exists: Pixel IDs are already sanitized in `buildScripts`,
 * but the surrounding <script> template is hand-written. If a future
 * edit accidentally injects an unsanitized field, an admin writes
 * directly to `storePixels`, or the response is tampered with in
 * transit, this signature check is the second line of defense.
 *
 * To add a new provider: add the regex here, stamp the matching
 * HAA-PIXEL-PROVIDER marker in `buildScripts`, and re-run the
 * `pixel-provider-allowlist` test suite.
 */
export const PIXEL_PROVIDER_SIGNATURES: Readonly<Record<string, RegExp>> = Object.freeze({
  meta: /\bfbq\s*\(|\bconnect\.facebook\.net\/en_US\/fbevents\.js/,
  tiktok: /\bttq\.|TiktokAnalyticsObject|\banalytics\.tiktok\.com\/i18n\/pixel\/events\.js/,
  snapchat: /\bsnaptr\s*\(|sc-static\.net\/scevent\.min\.js/,
  twitter: /\btwq\s*\(|static\.ads-twitter\.com\/uwt\.js/,
  ga4: /\bgtag\s*\(|googletagmanager\.com\/gtag\/js|dataLayer\.push/,
  gtm: /\bdataLayer\b|googletagmanager\.com\/gtm\.js/,
  pinterest: /\bpintrk\s*\(|s\.pinimg\.com\/ct\/core\.js/,
});

export interface PixelValidationResult {
  safe: boolean;
  scriptCount: number;
  /** Present when safe=false. */
  reason?: string;
  /** Names of providers detected by signature match (in document order). */
  matchedProviders: string[];
}

/**
 * Frontend-style validator: confirms every <script> tag in `html`
 * matches at least one provider signature from PIXEL_PROVIDER_SIGNATURES.
 * Pure function - safe to call from tests without a DOM.
 *
 * Usage (frontend):
 *   const result = validatePixelScripts(html);
 *   if (!result.safe) { console.warn(...); return; }
 *
 * The optional `providerHint` lets callers pass a previously-detected
 * provider name (from the HAA-PIXEL-PROVIDER marker) to skip re-scanning
 * all signatures. If omitted, all signatures are checked.
 */
export function validatePixelScripts(
  html: string,
  providerHint?: string,
): PixelValidationResult {
  if (!html) return { safe: true, scriptCount: 0, matchedProviders: [] };

  // Extract every <script ...>...</script> block. We deliberately do
  // NOT use innerHTML/DOMParser here so this validator runs identically
  // in node (vitest) and in the browser.
  //
  // The opening tag is captured separately so we can detect src-loaded
  // scripts (e.g. GA4's `gtag/js?id=...` loader). src-loaded scripts
  // are exempt from the signature check because their executable code
  // is fetched from a known URL, not embedded inline.
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const signaturesToCheck = providerHint
    ? { [providerHint]: PIXEL_PROVIDER_SIGNATURES[providerHint] }
    : PIXEL_PROVIDER_SIGNATURES;

  let scriptCount = 0;
  const matched = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html)) !== null) {
    scriptCount += 1;
    const openTag = m[1] ?? '';
    const body = m[2] ?? '';

    // src-loaded scripts (e.g. GA4 gtag/js loader) pull executable
    // code from a known provider URL. Inline body is empty so it
    // would fail signature matching, but the URL itself is the
    // authority. We still match against signatures that include the
    // URL for defense in depth.
    const hasSrc = /\bsrc\s*=\s*["'][^"']+["']/i.test(openTag);

    let matchedHere = false;
    if (hasSrc) {
      for (const [name, sig] of Object.entries(signaturesToCheck)) {
        if (!sig) continue;
        // For src scripts, signature check covers the open tag too.
        if (sig.test(openTag) || sig.test(body)) {
          matched.add(name);
          matchedHere = true;
          break;
        }
      }
    } else {
      for (const [name, sig] of Object.entries(signaturesToCheck)) {
        if (!sig) continue;
        if (sig.test(body)) {
          matched.add(name);
          matchedHere = true;
          break;
        }
      }
    }
    if (!matchedHere) {
      return {
        safe: false,
        scriptCount,
        matchedProviders: Array.from(matched),
        reason: 'script body has no matching provider signature',
      };
    }
  }
  return { safe: true, scriptCount, matchedProviders: Array.from(matched) };
}
