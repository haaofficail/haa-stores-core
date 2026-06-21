// Custom-domain host detection for the storefront SPA (QA Custom Domain).
// Mirrors @haa/shared/custom-domain (kept inline — storefront has no @haa/shared dep).

const PLATFORM_BASE = 'haastores.com';

/** Is the current host the platform itself (haastores.com, *.haastores.com, localhost)? */
export function isPlatformHost(host: string = window.location.hostname): boolean {
  const h = (host || '').toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  if (!h) return true; // fail safe → treat as platform (no custom-domain bootstrap)
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true; // raw IP (dev/preview)
  return h === PLATFORM_BASE || h.endsWith(`.${PLATFORM_BASE}`);
}

/** True when the SPA is being served on a merchant's own custom domain. */
export function isCustomDomainHost(host?: string): boolean {
  return !isPlatformHost(host);
}
