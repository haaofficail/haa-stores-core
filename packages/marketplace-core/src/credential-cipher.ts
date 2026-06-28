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
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ENC_RE = /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/i;
const ENC_LIKE_RE = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i;

function fromFixedHex(value: string, label: string, expectedBytes: number): Buffer {
  if (!/^[0-9a-f]+$/i.test(value) || value.length !== expectedBytes * 2) {
    throw new Error(`Invalid encrypted credential ${label}`);
  }
  return Buffer.from(value, 'hex');
}

function getKey(): Buffer | null {
  const key = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (!key) return null;
  if (!/^[0-9a-f]+$/i.test(key) || key.length !== KEY_LENGTH * 2) {
    throw new Error('PAYMENT_CREDENTIALS_ENCRYPTION_KEY must be a 32-byte hex key');
  }
  return Buffer.from(key, 'hex');
}

/** يُرجع true لو القيمة المخزّنة نص مشفّر (iv:tag:cipher). */
export function isEncryptedCredential(value: unknown): boolean {
  return typeof value === 'string' && ENC_RE.test(value);
}

/** تشفير كائن الاعتماد للتخزين. بلا مفتاح → يُرجع الكائن كما هو (legacy). */
export function encryptCredentials(creds: unknown): unknown {
  const key = getKey();
  if (!key || creds == null) return creds;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
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
    if (ENC_LIKE_RE.test(stored)) {
      throw new Error('Invalid encrypted credential format');
    }
    try { return JSON.parse(stored) as T; } catch { return stored as unknown as T; }
  }
  const key = getKey();
  if (!key) throw new Error('PAYMENT_CREDENTIALS_ENCRYPTION_KEY required to read encrypted channel credentials');
  const [ivHex, tagHex, enc] = stored.split(':');
  const iv = fromFixedHex(ivHex, 'iv', IV_LENGTH);
  const tag = fromFixedHex(tagHex, 'auth tag', AUTH_TAG_LENGTH);
  if (!/^[0-9a-f]+$/i.test(enc) || enc.length % 2 !== 0) {
    throw new Error('Invalid encrypted credential ciphertext');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);
  let dec = decipher.update(enc, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return JSON.parse(dec) as T;
}
