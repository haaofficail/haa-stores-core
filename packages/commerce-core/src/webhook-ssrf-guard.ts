/**
 * SSRF guard for outbound (merchant-configured) webhook delivery.
 *
 * A merchant with `settings:update` can register an arbitrary URL that the
 * platform then fetches on every subscribed event, storing the response body
 * for them to read back. Without a guard that is a textbook SSRF: a merchant
 * can point an endpoint at `http://169.254.169.254/...` (cloud metadata),
 * `http://localhost:6379/` (internal Redis), or any RFC-1918 host and
 * exfiltrate the response via the delivery log.
 *
 * Defense (two layers):
 *   1. Config time (create/update endpoint) — `assertWebhookUrlAllowed`:
 *      synchronous shape + literal-host check. Rejects non-http(s) schemes,
 *      embedded credentials, and literal private/loopback/link-local hosts.
 *   2. Delivery time — `assertWebhookTargetResolvesPublic`: resolves the
 *      hostname via DNS and re-checks EVERY address, defeating DNS-rebinding
 *      (a hostname that is public at config time but private at delivery).
 *
 * Local development can opt out with `WEBHOOK_ALLOW_PRIVATE_HOSTS=true`.
 */

import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

export class WebhookUrlNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookUrlNotAllowedError';
  }
}

function privateHostsAllowed(): boolean {
  return process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS === 'true';
}

/** Parse a dotted-quad IPv4 string into its four octets, or null. */
function ipv4Octets(ip: string): [number, number, number, number] | null {
  if (isIP(ip) !== 4) return null;
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return parts as [number, number, number, number];
}

/** True if an IPv4 address is in a private / reserved / non-routable range. */
function isBlockedIpv4(ip: string): boolean {
  const o = ipv4Octets(ip);
  if (!o) return false;
  const [a, b] = o;
  if (a === 0) return true; // 0.0.0.0/8 (incl. unspecified)
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. 169.254.169.254 metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmark
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false;
}

/** True if an IPv6 address is loopback / unspecified / ULA / link-local, or an
 *  IPv4-mapped/embedded address whose IPv4 is itself blocked. */
function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().split('%')[0]; // strip zone id
  if (lower === '::1' || lower === '::') return true; // loopback / unspecified
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
    return true; // fe80::/10 link-local
  }
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 unique-local
  // IPv4-mapped (::ffff:a.b.c.d) and NAT64 (64:ff9b::a.b.c.d) — extract the
  // trailing dotted-quad and classify it as IPv4.
  const v4 = lower.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4 && isBlockedIpv4(v4[1])) return true;
  return false;
}

/** True if a literal IP string is in a blocked range (IPv4 or IPv6). */
export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isBlockedIpv4(ip);
  if (kind === 6) return isBlockedIpv6(ip);
  return false;
}

/** Hostnames that must never be resolved/fetched regardless of DNS. */
function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (h === 'localhost') return true;
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  return false;
}

/**
 * Config-time guard: validate the URL shape and reject literal private hosts.
 * Throws {@link WebhookUrlNotAllowedError} on rejection. Returns the parsed URL.
 */
export function assertWebhookUrlAllowed(rawUrl: string): URL {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new WebhookUrlNotAllowedError('Webhook URL is not a valid URL.');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new WebhookUrlNotAllowedError('Webhook URL must use http or https.');
  }
  if (u.username || u.password) {
    throw new WebhookUrlNotAllowedError('Webhook URL must not contain embedded credentials.');
  }
  if (privateHostsAllowed()) return u;

  const host = u.hostname.replace(/^\[|\]$/g, ''); // unwrap [::1]
  if (isBlockedHostname(host)) {
    throw new WebhookUrlNotAllowedError('Webhook URL host is not allowed.');
  }
  if (isIP(host) && isBlockedIp(host)) {
    throw new WebhookUrlNotAllowedError('Webhook URL must not target a private or reserved IP address.');
  }
  return u;
}

/**
 * Delivery-time guard: resolve the hostname and reject if ANY resolved address
 * is private/reserved. Defeats DNS-rebinding where a hostname is public at
 * config time but resolves to a private IP at delivery. Throws on rejection.
 */
export async function assertWebhookTargetResolvesPublic(rawUrl: string): Promise<URL> {
  const u = assertWebhookUrlAllowed(rawUrl);
  if (privateHostsAllowed()) return u;

  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return u; // already classified by assertWebhookUrlAllowed

  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new WebhookUrlNotAllowedError('Webhook URL host could not be resolved.');
  }
  if (addrs.length === 0) {
    throw new WebhookUrlNotAllowedError('Webhook URL host did not resolve to any address.');
  }
  for (const a of addrs) {
    if (isBlockedIp(a.address)) {
      throw new WebhookUrlNotAllowedError('Webhook URL resolves to a private or reserved address.');
    }
  }
  return u;
}
