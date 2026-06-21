/**
 * fetch مرن لتكاملات السوق (QA INT2/INT3/INT4).
 *
 * - INT2: مهلة عبر AbortController (افتراضي 15s) — يمنع التعليق على مزوّد بطيء.
 * - INT3: يحترم 429 + رأس Retry-After، ويعيد المحاولة بتراجع أُسّي.
 * - INT4: إعادة محاولة محافِظة — 429 لأي طريقة (الطلب لم يُعالَج)، أما
 *   أخطاء الشبكة/5xx فلغير المتغيّرة فقط (GET/HEAD/PUT/DELETE) لتفادي
 *   ازدواج عمليات POST/PATCH غير الآمنة لإعادة التشغيل.
 */
export interface ResilientFetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  /** أقصى انتظار لكل تراجع (سقف لـ Retry-After الضخم) */
  maxBackoffMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_BACKOFF_MS = 30_000;
const IDEMPOTENT = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** حلّل Retry-After (ثوانٍ أو HTTP-date) إلى ميلي ثانية، أو null */
function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const when = Date.parse(value);
  if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
  return null;
}

export async function resilientFetch(
  url: string,
  init: RequestInit = {},
  opts: ResilientFetchOptions = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const maxBackoffMs = opts.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
  const method = (init.method ?? 'GET').toUpperCase();
  const retriableMethod = IDEMPOTENT.has(method);

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      // 429: أعد المحاولة لأي طريقة (الطلب لم يُعالَج)
      if (res.status === 429 && attempt < maxRetries) {
        const retryAfter = parseRetryAfter(res.headers.get('retry-after'));
        const backoff = retryAfter ?? Math.min(maxBackoffMs, 2 ** attempt * 1000 + Math.floor(Math.random() * 250));
        await sleep(Math.min(backoff, maxBackoffMs));
        continue;
      }

      // 5xx: أعد المحاولة للطرق غير المتغيّرة فقط
      if (res.status >= 500 && retriableMethod && attempt < maxRetries) {
        await sleep(Math.min(maxBackoffMs, 2 ** attempt * 1000 + Math.floor(Math.random() * 250)));
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      // مهلة/خطأ شبكة: أعد المحاولة للطرق غير المتغيّرة فقط
      if (retriableMethod && attempt < maxRetries) {
        await sleep(Math.min(maxBackoffMs, 2 ** attempt * 1000 + Math.floor(Math.random() * 250)));
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error('resilientFetch: exhausted retries');
}
