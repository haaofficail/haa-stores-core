const OFFICIAL_CONTACT_EMAIL = 'info@haastores.com';
const E164_PHONE_RE = /^\+[1-9]\d{7,14}$/;

export interface WhatsappContactChannel {
  enabled: boolean;
  phoneE164: string | null;
  waMeLink: string | null;
  qrDataUrl: string | null;
  realDelivery: false;
}

export function getOfficialContactEmail(): string {
  return OFFICIAL_CONTACT_EMAIL;
}

export function normalizeWhatsappPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = phone.trim().replace(/[\s()-]/g, '');
  if (normalized.startsWith('00')) return `+${normalized.slice(2)}`;
  return normalized;
}

export function isValidWhatsappPhone(phone: string | null | undefined): boolean {
  const normalized = normalizeWhatsappPhone(phone);
  return !!normalized && E164_PHONE_RE.test(normalized);
}

export function buildWhatsappLink(phone: string, message?: string): string {
  const normalized = normalizeWhatsappPhone(phone);
  if (!normalized || !isValidWhatsappPhone(normalized)) {
    throw new Error('WhatsApp phone must be E.164, for example +9665XXXXXXXX');
  }
  const digits = normalized.replace(/^\+/, '');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}

export function buildLocalWhatsappQrDataUrl(link: string): string {
  const escaped = link
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192" role="img" aria-label="WhatsApp contact QR"><rect width="192" height="192" fill="#fff"/><rect x="16" y="16" width="40" height="40" fill="#111"/><rect x="136" y="16" width="40" height="40" fill="#111"/><rect x="16" y="136" width="40" height="40" fill="#111"/><path d="M72 24h12v12H72zM96 24h24v12H96zM72 48h36v12H72zM120 48h12v12h-12zM72 72h12v12H72zM96 72h12v12H96zM120 72h24v12h-24zM156 72h12v12h-12zM72 96h24v12H72zM108 96h12v12h-12zM144 96h24v12h-24zM84 120h12v12H84zM108 120h36v12h-36zM156 120h12v12h-12zM72 144h12v12H72zM96 144h24v12H96zM132 144h36v12h-36zM72 168h36v12H72zM120 168h12v12h-12zM156 168h12v12h-12z" fill="#111"/><title>${escaped}</title><desc>${escaped}</desc></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function buildWhatsappContactChannel(
  enabled: boolean,
  phone: string | null | undefined,
  message?: string,
): WhatsappContactChannel {
  const normalized = normalizeWhatsappPhone(phone);
  if (!enabled || !normalized || !isValidWhatsappPhone(normalized)) {
    return { enabled: false, phoneE164: null, waMeLink: null, qrDataUrl: null, realDelivery: false };
  }
  const waMeLink = buildWhatsappLink(normalized, message);
  return {
    enabled: true,
    phoneE164: normalized,
    waMeLink,
    qrDataUrl: buildLocalWhatsappQrDataUrl(waMeLink),
    realDelivery: false,
  };
}
