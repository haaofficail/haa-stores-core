import { eq } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

export interface PixelConfig {
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  snapchatPixelId?: string | null;
  twitterPixelId?: string | null;
  ga4MeasurementId?: string | null;
  gtmContainerId?: string | null;
  pinterestTagId?: string | null;
  isActive: boolean;
}

export interface PixelScripts {
  /** Inject in <head> — GA4, GTM, Meta, TikTok, Snapchat, Twitter, Pinterest */
  headScripts: string;
  /** Inject before </body> — GTM noscript iframe */
  bodyScripts: string;
}

/**
 * Provider allowlist — each entry maps a known pixel provider to a
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
 * Pure function — safe to call from tests without a DOM.
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
    // would fail signature matching — but the URL itself is the
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

export class PixelService {
  constructor(private db: DbClient = createDbClient()) {}

  async getConfig(storeId: number): Promise<PixelConfig | null> {
    const [row] = await this.db.select().from(s.storePixels)
      .where(eq(s.storePixels.storeId, storeId)).limit(1);
    if (!row) return null;
    return {
      metaPixelId: row.metaPixelId,
      tiktokPixelId: row.tiktokPixelId,
      snapchatPixelId: row.snapchatPixelId,
      twitterPixelId: row.twitterPixelId,
      ga4MeasurementId: row.ga4MeasurementId,
      gtmContainerId: row.gtmContainerId,
      pinterestTagId: row.pinterestTagId,
      isActive: row.isActive,
    };
  }

  async upsertConfig(storeId: number, config: Partial<PixelConfig>): Promise<PixelConfig> {
    const existing = await this.db.select().from(s.storePixels)
      .where(eq(s.storePixels.storeId, storeId)).limit(1);

    if (existing.length > 0) {
      const [updated] = await this.db.update(s.storePixels)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(s.storePixels.storeId, storeId))
        .returning();
      return this.mapRow(updated);
    }

    const [created] = await this.db.insert(s.storePixels)
      .values({ storeId, isActive: true, ...config })
      .returning();
    return this.mapRow(created);
  }

  /**
   * Generate pixel <script> tags ready to inject into storefront HTML.
   * All IDs are sanitized to alphanumeric/dash/underscore only.
   * Each <script> block is preceded by an HAA-PIXEL-PROVIDER comment
   * marker naming the provider, so the frontend allowlist can pinpoint
   * which signature to check.
   */
  buildScripts(config: PixelConfig): PixelScripts {
    if (!config.isActive) return { headScripts: '', bodyScripts: '' };

    const head: string[] = [];
    const body: string[] = [];

    // ── Google Tag Manager ───────────────────────────────────────
    if (config.gtmContainerId) {
      const id = sanitize(config.gtmContainerId);
      head.push(`<!-- HAA-PIXEL-PROVIDER: gtm -->
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');</script>
<!-- End Google Tag Manager -->`);
      body.push(`<!-- HAA-PIXEL-PROVIDER: gtm-noscript -->
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`);
    }

    // ── Google Analytics 4 ───────────────────────────────────────
    if (config.ga4MeasurementId && !config.gtmContainerId) {
      const id = sanitize(config.ga4MeasurementId);
      head.push(`<!-- HAA-PIXEL-PROVIDER: ga4 -->
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`);
    }

    // ── Meta (Facebook) Pixel ────────────────────────────────────
    if (config.metaPixelId) {
      const id = sanitize(config.metaPixelId);
      head.push(`<!-- HAA-PIXEL-PROVIDER: meta -->
<!-- Meta Pixel -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/></noscript>`);
    }

    // ── TikTok Pixel ─────────────────────────────────────────────
    if (config.tiktokPixelId) {
      const id = sanitize(config.tiktokPixelId);
      head.push(`<!-- HAA-PIXEL-PROVIDER: tiktok -->
<!-- TikTok Pixel -->
<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${id}');ttq.page();}(window,document,'ttq');</script>`);
    }

    // ── Snapchat Pixel ───────────────────────────────────────────
    if (config.snapchatPixelId) {
      const id = sanitize(config.snapchatPixelId);
      head.push(`<!-- HAA-PIXEL-PROVIDER: snapchat -->
<!-- Snapchat Pixel -->
<script>(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','${id}');snaptr('track','PAGE_VIEW');</script>`);
    }

    // ── Twitter/X Pixel ──────────────────────────────────────────
    if (config.twitterPixelId) {
      const id = sanitize(config.twitterPixelId);
      head.push(`<!-- HAA-PIXEL-PROVIDER: twitter -->
<!-- Twitter Pixel -->
<script>!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');twq('config','${id}');</script>`);
    }

    // ── Pinterest Tag ────────────────────────────────────────────
    if (config.pinterestTagId) {
      const id = sanitize(config.pinterestTagId);
      head.push(`<!-- HAA-PIXEL-PROVIDER: pinterest -->
<!-- Pinterest Tag -->
<script>!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");pintrk('load','${id}');pintrk('page');</script>`);
    }

    return { headScripts: head.join('\n'), bodyScripts: body.join('\n') };
  }

  private mapRow(row: typeof s.storePixels.$inferSelect): PixelConfig {
    return {
      metaPixelId: row.metaPixelId,
      tiktokPixelId: row.tiktokPixelId,
      snapchatPixelId: row.snapchatPixelId,
      twitterPixelId: row.twitterPixelId,
      ga4MeasurementId: row.ga4MeasurementId,
      gtmContainerId: row.gtmContainerId,
      pinterestTagId: row.pinterestTagId,
      isActive: row.isActive,
    };
  }
}

function sanitize(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-]/g, '');
}
