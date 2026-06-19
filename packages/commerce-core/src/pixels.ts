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
   */
  buildScripts(config: PixelConfig): PixelScripts {
    if (!config.isActive) return { headScripts: '', bodyScripts: '' };

    const head: string[] = [];
    const body: string[] = [];

    // ── Google Tag Manager ───────────────────────────────────────
    if (config.gtmContainerId) {
      const id = sanitize(config.gtmContainerId);
      head.push(`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');</script>
<!-- End Google Tag Manager -->`);
      body.push(`<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`);
    }

    // ── Google Analytics 4 ───────────────────────────────────────
    if (config.ga4MeasurementId && !config.gtmContainerId) {
      const id = sanitize(config.ga4MeasurementId);
      head.push(`<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`);
    }

    // ── Meta (Facebook) Pixel ────────────────────────────────────
    if (config.metaPixelId) {
      const id = sanitize(config.metaPixelId);
      head.push(`<!-- Meta Pixel -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/></noscript>`);
    }

    // ── TikTok Pixel ─────────────────────────────────────────────
    if (config.tiktokPixelId) {
      const id = sanitize(config.tiktokPixelId);
      head.push(`<!-- TikTok Pixel -->
<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${id}');ttq.page();}(window,document,'ttq');</script>`);
    }

    // ── Snapchat Pixel ───────────────────────────────────────────
    if (config.snapchatPixelId) {
      const id = sanitize(config.snapchatPixelId);
      head.push(`<!-- Snapchat Pixel -->
<script>(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','${id}');snaptr('track','PAGE_VIEW');</script>`);
    }

    // ── Twitter/X Pixel ──────────────────────────────────────────
    if (config.twitterPixelId) {
      const id = sanitize(config.twitterPixelId);
      head.push(`<!-- Twitter Pixel -->
<script>!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');twq('config','${id}');</script>`);
    }

    // ── Pinterest Tag ────────────────────────────────────────────
    if (config.pinterestTagId) {
      const id = sanitize(config.pinterestTagId);
      head.push(`<!-- Pinterest Tag -->
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
