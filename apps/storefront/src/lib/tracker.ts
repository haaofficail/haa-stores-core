const SESSION_KEY = 'haa_session_id';
const UTM_KEY = 'haa_utm_data';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

interface UtmData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

function parseUtmFromUrl(): UtmData {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: UtmData = {};
    const source = params.get('utm_source');
    if (source) utm.utmSource = source.slice(0, 255);
    const medium = params.get('utm_medium');
    if (medium) utm.utmMedium = medium.slice(0, 255);
    const campaign = params.get('utm_campaign');
    if (campaign) utm.utmCampaign = campaign.slice(0, 255);
    const content = params.get('utm_content');
    if (content) utm.utmContent = content.slice(0, 255);
    const term = params.get('utm_term');
    if (term) utm.utmTerm = term.slice(0, 255);
    return utm;
  } catch {
    return {};
  }
}

function getUtmData(): UtmData {
  try {
    const stored = sessionStorage.getItem(UTM_KEY);
    if (stored) {
      return JSON.parse(stored) as UtmData;
    }
    const parsed = parseUtmFromUrl();
    if (Object.keys(parsed).length > 0) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return {};
  }
}

export interface TrackEventOptions {
  productId?: number;
  cartId?: string;
  orderId?: number;
  path?: string;
  referrer?: string;
  deviceType?: string;
  metadata?: Record<string, unknown>;
}

async function send(slug: string, eventType: string, options: TrackEventOptions = {}): Promise<void> {
  try {
    const sessionId = getSessionId();
    const utm = getUtmData();
    const payload: Record<string, unknown> = {
      eventType,
      sessionId,
      ...options,
      ...utm,
    };
    if (!payload.path) {
      payload.path = window.location.pathname + window.location.search;
    }
    if (!payload.referrer) {
      payload.referrer = document.referrer || undefined;
    }
    const url = `${BASE_URL}/s/${slug}/events`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Silently fail — do not break user experience
  }
}

export const tracker = {
  trackPageView(slug: string) {
    send(slug, 'page_view');
  },

  trackProductView(slug: string, productId: number) {
    send(slug, 'view_product', { productId });
  },

  trackAddToCart(slug: string, productId: number, cartId?: string, metadata?: Record<string, unknown>) {
    send(slug, 'add_to_cart', { productId, cartId, metadata });
  },

  trackRemoveFromCart(slug: string, productId: number, cartId?: string) {
    send(slug, 'remove_from_cart', { productId, cartId });
  },

  trackBeginCheckout(slug: string, cartId: string) {
    send(slug, 'begin_checkout', { cartId });
  },

  trackPurchase(slug: string, orderId: number, cartId?: string, metadata?: Record<string, unknown>) {
    send(slug, 'purchase', { orderId, cartId, metadata });
  },

  trackSearch(slug: string, query: string) {
    send(slug, 'search', { metadata: { query } });
  },

  trackCouponApplied(slug: string, couponCode: string, cartId?: string) {
    send(slug, 'coupon_applied', { cartId, metadata: { couponCode } });
  },

  trackShare(slug: string, productId: number, shareType: string) {
    send(slug, 'product_share', { productId, metadata: { shareType } });
  },

  // ─── Heartbeat ───

  _heartbeatTimer: null as ReturnType<typeof setInterval> | null,
  _heartbeatSlug: '',

  startHeartbeat(slug: string) {
    this._heartbeatSlug = slug;
    if (this._heartbeatTimer) return;
    const hb = () => this.sendHeartbeat();
    hb();
    this._heartbeatTimer = setInterval(hb, 20000);
  },

  stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  },

  async sendHeartbeat() {
    try {
      const slug = this._heartbeatSlug;
      if (!slug) return;
      const sessionId = getSessionId();
      const utm = getUtmData();

      let currentProductId: number | undefined;
      const productMatch = window.location.pathname.match(/\/products\/(\d+)/);
      if (productMatch) currentProductId = parseInt(productMatch[1], 10);

      let currentPageType: string = 'unknown';
      const p = window.location.pathname;
      if (p === '/' || p === '/home') currentPageType = 'home';
      else if (p.startsWith('/products/')) currentPageType = 'product';
      else if (p.startsWith('/categories/') || p.startsWith('/category/')) currentPageType = 'category';
      else if (p.startsWith('/cart')) currentPageType = 'cart';
      else if (p.startsWith('/checkout')) currentPageType = 'checkout';
      else if (p.startsWith('/search')) currentPageType = 'search';
      else if (p.startsWith('/order/confirmation') || p.startsWith('/order-confirmation')) currentPageType = 'order_confirmation';

      const screenSize = window.innerWidth < 768 ? 'small' : window.innerWidth < 1280 ? 'medium' : 'large';
      let os = 'unknown';
      if (navigator.userAgent.includes('Android')) os = 'Android';
      else if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) os = 'iOS';
      else if (navigator.userAgent.includes('Mac')) os = 'macOS';
      else if (navigator.userAgent.includes('Windows')) os = 'Windows';

      let browser = 'unknown';
      if (navigator.userAgent.includes('SamsungBrowser')) browser = 'Samsung Internet';
      else if (navigator.userAgent.includes('Edg')) browser = 'Edge';
      else if (navigator.userAgent.includes('Chrome')) browser = 'Chrome';
      else if (navigator.userAgent.includes('Safari')) browser = 'Safari';

      let deviceType = 'desktop';
      if (/Mobile|Android|iPhone|iP(?:od|hone)/.test(navigator.userAgent)) deviceType = 'mobile';
      else if (/iPad|Tablet/.test(navigator.userAgent)) deviceType = 'tablet';

      const payload: Record<string, unknown> = {
        sessionId,
        currentPath: window.location.pathname + window.location.search,
        currentPageType,
        isInCheckout: currentPageType === 'checkout',
        deviceType,
        os,
        browser,
        screenSize,
        ...utm,
      };
      if (currentProductId) payload.currentProductId = currentProductId;

      const url = `${BASE_URL}/s/${slug}/heartbeat`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Silently fail — do not break user experience
    }
  },
};
