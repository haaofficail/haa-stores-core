/**
 * Branded HTML email template for the Haa Stores platform.
 *
 * Every transactional email the platform sends — landing-contact
 * notifications, OTP codes, welcome, password reset, etc. — wraps
 * its body in this template so all messages share one identity.
 *
 * The HTML is intentionally table-based and inline-styled because
 * email clients (Outlook, Gmail mobile, ProtonMail, etc.) strip or
 * ignore <style> blocks and modern CSS. The 600px-wide container
 * + system fonts pattern is the industry-standard transactional
 * email shape; do not "modernise" it without testing in Litmus.
 *
 * Design choices:
 * - RTL document; Arabic-first.
 * - Brand-primary (#5c9cd5) accent stripe at the top.
 * - Logo from the public storefront — single canonical URL.
 * - Body content is injected as raw HTML — callers MUST escape any
 *   user-supplied strings via `escapeHtml()` before passing.
 * - Footer carries the platform name, support email, and a clear
 *   "this is a transactional message" line so recipients understand
 *   they cannot reply-to-unsubscribe.
 */

const BRAND_PRIMARY = '#5c9cd5';
const BRAND_PRIMARY_DARK = '#3a7ab4';
const BRAND_BG = '#f5f7fa';
const TEXT_PRIMARY = '#0f172a';
const TEXT_SECONDARY = '#475569';
const BORDER = '#e2e8f0';

const DEFAULT_LOGO_URL = 'https://haastores.com/assets/haa-stores-logo.png';
const DEFAULT_PLATFORM_NAME = 'هاء متاجر';
const DEFAULT_SUPPORT_EMAIL = 'hello@haastores.com';

export type HaaEmailOptions = {
  /** Plain-text title that becomes the H1 inside the email. */
  title: string;
  /** Pre-escaped HTML body. Callers escape user-supplied strings themselves. */
  bodyHtml: string;
  /** Optional preheader (preview text shown next to subject in inbox lists). */
  preheader?: string;
  /** Optional secondary CTA — { label, href } renders a primary button. */
  cta?: { label: string; href: string };
  /** Override the platform name shown in header/footer. */
  platformName?: string;
  /** Override the logo URL. Use a full https URL (email clients block relative paths). */
  logoUrl?: string;
  /** Override the support email shown in the footer. */
  supportEmail?: string;
  /** Optional small fine-print line at the bottom (e.g. legal notice). */
  footerNote?: string;
};

/**
 * Renders a transactional email body wrapped in the Haa-branded
 * template. Returns the full HTML document (`<!doctype html> ...`)
 * ready to hand to a mail provider's `html` field.
 */
export function renderHaaEmail(opts: HaaEmailOptions): string {
  const platformName = opts.platformName ?? DEFAULT_PLATFORM_NAME;
  const logoUrl = opts.logoUrl ?? DEFAULT_LOGO_URL;
  const supportEmail = opts.supportEmail ?? DEFAULT_SUPPORT_EMAIL;
  const preheader = opts.preheader ?? '';

  const ctaBlock = opts.cta
    ? `
        <tr>
          <td style="padding: 8px 32px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
              <tr>
                <td align="center">
                  <a href="${opts.cta.href}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 32px; background: ${BRAND_PRIMARY}; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 12px; font-size: 16px; box-shadow: 0 2px 8px rgba(92, 156, 213, 0.3);">
                    ${escapeHtml(opts.cta.label)}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : '';

  const footerNoteBlock = opts.footerNote
    ? `<p style="margin: 12px 0 0; font-size: 11px; color: ${TEXT_SECONDARY}; line-height: 1.6;">${opts.footerNote}</p>`
    : '';

  // The preheader is a zero-height paragraph that email clients pick
  // up as the inbox preview snippet. Padded with hidden whitespace so
  // it isn't followed by random body content in Gmail's snippet column.
  const preheaderBlock = preheader
    ? `<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${escapeHtml(preheader)}${' '.repeat(60)}</div>`
    : '';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin: 0; padding: 0; background: ${BRAND_BG}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: ${TEXT_PRIMARY}; line-height: 1.6;">
  ${preheaderBlock}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; background: ${BRAND_BG};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 10px 28px -14px rgba(15, 23, 42, 0.1);">
          <!-- Brand stripe -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_PRIMARY}, ${BRAND_PRIMARY_DARK}); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <!-- Header with logo -->
          <tr>
            <td style="padding: 32px 32px 0; text-align: center;">
              <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(platformName)}" width="140" style="max-width: 140px; height: auto; display: inline-block;">
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td style="padding: 24px 32px 8px; text-align: right;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: ${TEXT_PRIMARY}; line-height: 1.35;">${escapeHtml(opts.title)}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 8px 32px 24px; text-align: right; font-size: 15px; color: ${TEXT_PRIMARY}; line-height: 1.7;">
              ${opts.bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="border-top: 1px solid ${BORDER}; height: 0; line-height: 0; font-size: 0;">&nbsp;</div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px; text-align: center; font-size: 12px; color: ${TEXT_SECONDARY}; line-height: 1.7;">
              <p style="margin: 0; font-weight: 600; color: ${TEXT_PRIMARY};">${escapeHtml(platformName)}</p>
              <p style="margin: 6px 0 0;">
                للاستفسار: <a href="mailto:${escapeHtml(supportEmail)}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${escapeHtml(supportEmail)}</a>
              </p>
              <p style="margin: 12px 0 0; font-size: 11px; color: ${TEXT_SECONDARY};">
                هذه رسالة آلية — يُرجى عدم الرد عليها مباشرة.
              </p>
              ${footerNoteBlock}
            </td>
          </tr>
        </table>
        <!-- Brand mark below the card -->
        <p style="margin: 16px 0 0; font-size: 11px; color: ${TEXT_SECONDARY};">
          © ${new Date().getFullYear()} ${escapeHtml(platformName)} · المملكة العربية السعودية
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Escape user-supplied strings before they're injected into the
 * `bodyHtml` field of `renderHaaEmail`. Standard 5-character
 * HTML escape; same shape as the existing helper in landing.ts.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
