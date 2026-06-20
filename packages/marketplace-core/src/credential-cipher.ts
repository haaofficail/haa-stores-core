import crypto from 'crypto';

/**
 * تشفير بيانات اعتماد القنوات (Salla/Noon/Amazon/Zid) at-rest — يعالج QA INT1
 * (كانت مخزّنة plaintext: مفتاح Noon RSA، Amazon AWS secret، OAuth tokens).
 * يستخدم نفس خوارزمية/مفتاح بوّابات الدفع (AES-256-GCM, PAYMENT_CREDENTIALS_ENCRYPTION_KEY).
 *
 * متوافق مع القديم (آمن للترحيل بلا migration إجبارية):
 *  - الكتابة: تُشفّر عند توفّر المفتاح، وإلا تُخزّن كما هي (سلوك قديم — لا regression).
 *  - القراءة: تفكّ التشفير لو النص بصيغة مشفّرة، وإلا تُرجع الكائن القديم (plaintext) كما هو.
 */
const ALGORITHM = 'aes-256-gcm';
const ENC_RE = /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/i;

function getKey(): Buffer | null {
  const key = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  return key ? Buffer.from(key, 'hex') : null;
}

/** يُرجع true لو القيمة المخزّنة نص مشفّر (iv:tag:cipher). */
export function isEncryptedCredential(value: unknown): boolean {
  return typeof value === 'string' && ENC_RE.test(value);
}

/** تشفير كائن الاعتماد للتخزين. بلا مفتاح → يُرجع الكائن كما هو (legacy). */
export function encryptCredentials(creds: unknown): unknown {
  const key = getKey();
  if (!key || creds == null) return creds;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let enc = cipher.update(JSON.stringify(creds), 'utf8', 'hex');
  enc += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${enc}`;
}

/** فكّ تشفير الاعتماد المخزّن. يدعم الكائن القديم (plaintext) والنص المشفّر. */
export function decryptCredentials<T = unknown>(stored: unknown): T | null {
  if (stored == null) return null;
  if (typeof stored !== 'string') return stored as T; // كائن plaintext قديم
  if (!isEncryptedCredential(stored)) {
    try { return JSON.parse(stored) as T; } catch { return stored as unknown as T; }
  }
  const key = getKey();
  if (!key) throw new Error('PAYMENT_CREDENTIALS_ENCRYPTION_KEY required to read encrypted channel credentials');
  const [ivHex, tagHex, enc] = stored.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let dec = decipher.update(enc, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return JSON.parse(dec) as T;
}
