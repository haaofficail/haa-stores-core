import { randomUUID, createHmac, createHash, timingSafeEqual } from 'crypto';
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
// Batch 4C: PDF is accepted only when an explicit financial-document upload
// path opts in. Product images and normal media uploads stay image-only.
const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface ValidateFileOptions {
  allowPdf?: boolean;
}

type SignatureCheck = { offset: number; bytes: Uint8Array };

const MAGIC_SIGNATURES: Record<string, SignatureCheck[]> = {
  'image/jpeg': [{ offset: 0, bytes: new Uint8Array([0xff, 0xd8, 0xff]) }],
  'image/png':  [{ offset: 0, bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }],
  'image/webp': [
    { offset: 0, bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46]) },
    { offset: 8, bytes: new Uint8Array([0x57, 0x45, 0x42, 0x50]) },
  ],
  // %PDF magic header.
  'application/pdf': [{ offset: 0, bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) }],
};

function matchesSignature(buffer: Buffer, check: SignatureCheck): boolean {
  if (buffer.length < check.offset + check.bytes.length) return false;
  return check.bytes.every((byte, i) => buffer[check.offset + i] === byte);
}

function validateMagicBytes(buffer: Buffer, mimetype: string): boolean {
  const checks = MAGIC_SIGNATURES[mimetype];
  if (!checks) return false;
  return checks.every(check => matchesSignature(buffer, check));
}

export interface UploadResult {
  url: string;
  key: string;
  thumbUrl?: string;
  thumbKey?: string;
  sizeBytes?: number;
  sha256?: string;
}

export interface MediaAdapter {
  upload(buffer: Buffer, mimetype: string, productId: number, storeId: number): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  getDriverName(): string;
  validateFile(buffer: Buffer, mimetype: string, options?: ValidateFileOptions): string | null;
}

export type StorageDriver = 'local' | 's3';

function sanitizeKey(key: string): boolean {
  if (key.includes('..')) return false;
  if (key.startsWith('/')) return false;
  if (key.includes('\\')) return false;
  return true;
}

function allowedMimeTypes(options?: ValidateFileOptions): readonly string[] {
  return options?.allowPdf ? [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_DOCUMENT_MIME_TYPES] : ALLOWED_IMAGE_MIME_TYPES;
}

function validateMediaFile(buffer: Buffer, mimetype: string, options?: ValidateFileOptions): string | null {
  const allowedTypes = allowedMimeTypes(options);
  if (!allowedTypes.includes(mimetype)) {
    return `Unsupported file type: ${mimetype}. Allowed: ${allowedTypes.join(', ')}`;
  }
  if (!validateMagicBytes(buffer, mimetype)) {
    return `File content does not match declared type ${mimetype}`;
  }
  if (buffer.length > MAX_FILE_SIZE) {
    return `File size ${(buffer.length / 1024 / 1024).toFixed(1)}MB exceeds maximum ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }
  return null;
}

function extensionForMime(mimetype: string): string {
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype === 'image/webp') return 'webp';
  if (mimetype === 'image/png') return 'png';
  return 'jpg';
}

function isPdf(mimetype: string): boolean {
  return mimetype === 'application/pdf';
}

function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function generateStorageKey(storeId: number, productId: number, mimetype: string): string {
  const ext = extensionForMime(mimetype);
  const uuid = randomUUID();
  if (storeId === 0) {
    return `admin/${uuid}.${ext}`;
  }
  const folder = productId === 0 ? 'uploads' : `products/${productId}`;
  return `stores/${storeId}/${folder}/${uuid}.${ext}`;
}

export function isAdminStore(storeId: number): boolean {
  return storeId === 0;
}

export function isProductImage(productId: number): boolean {
  return productId > 0;
}

function storageSecret(): string {
  return process.env.STORAGE_SIGNING_SECRET || process.env.JWT_SECRET || 'insecure-dev-only';
}

export function signLocalStoragePath(rawUrl: string, expiresSec = 300): string {
  const path = rawUrl.replace(/^\/storage\//, '');
  const expires = Math.floor(Date.now() / 1000) + expiresSec;
  const payload = `${path}:${expires}`;
  const sig = createHmac('sha256', storageSecret()).update(payload).digest('hex').slice(0, 16);
  return `${rawUrl}?expires=${expires}&sig=${sig}`;
}

export function verifyLocalStoragePath(path: string, expires: number, sig: string): boolean {
  if (Date.now() / 1000 > expires) return false;
  const payload = `${path}:${expires}`;
  const expected = createHmac('sha256', storageSecret()).update(payload).digest('hex').slice(0, 16);
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export class LocalStorageAdapter implements MediaAdapter {
  private basePath: string;
  private baseUrl: string;

  constructor(basePath?: string, baseUrl?: string) {
    const projectRoot = process.cwd();
    this.basePath = basePath ?? join(projectRoot, 'storage');
    this.baseUrl = baseUrl ?? '/storage';
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  getDriverName(): string {
    return 'local';
  }

  validateFile(buffer: Buffer, mimetype: string, options?: ValidateFileOptions): string | null {
    return validateMediaFile(buffer, mimetype, options);
  }

  async upload(buffer: Buffer, _mimetype: string, productId: number, storeId: number): Promise<UploadResult> {
    const key = generateStorageKey(storeId, productId, _mimetype);
    if (!sanitizeKey(key)) throw new Error('Invalid storage key');

    const filePath = join(this.basePath, key);
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    if (isPdf(_mimetype)) {
      writeFileSync(filePath, buffer);
      return {
        url: `${this.baseUrl}/${key}`,
        key,
        sizeBytes: buffer.length,
        sha256: sha256Hex(buffer),
      };
    }

    const ext = extensionForMime(_mimetype);
    const thumbKey = key.replace(`.${ext}`, `.thumb.${ext}`);

    // Optimize original — 2048px max, quality 85, sharpen after resize
    const optimized = await sharp(buffer)
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
      .sharpen({ sigma: 0.5, m1: 0.5, m2: 0.5, x1: 0, y2: 5, y3: 20 })
      [ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg']({ quality: 85, mozjpeg: true })
      .toBuffer();

    writeFileSync(filePath, optimized);

    // Generate thumbnail (200px width)
    const thumbBuffer = await sharp(buffer)
      .resize(200, 200, { fit: 'cover' })
      [ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg']({ quality: 70 })
      .toBuffer();

    const thumbPath = join(this.basePath, thumbKey);
    writeFileSync(thumbPath, thumbBuffer);

    return {
      url: `${this.baseUrl}/${key}`,
      key,
      thumbUrl: `${this.baseUrl}/${thumbKey}`,
      thumbKey,
      sizeBytes: optimized.length,
      sha256: sha256Hex(optimized),
    };
  }

  async delete(key: string): Promise<void> {
    if (!sanitizeKey(key)) throw new Error('Invalid storage key');
    const filePath = join(this.basePath, key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    const thumbPath = join(this.basePath, key.replace(/\.(jpg|png|webp)$/, '.thumb.$1'));
    if (existsSync(thumbPath)) {
      unlinkSync(thumbPath);
    }
  }

  getPublicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

export class S3StorageAdapter implements MediaAdapter {
  private client: S3Client;

  constructor(
    private endpoint: string,
    private region: string,
    private bucket: string,
    private accessKeyId: string,
    private secretAccessKey: string,
    private publicBaseUrl: string,
  ) {
    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  getDriverName(): string {
    return 's3';
  }

  validateFile(buffer: Buffer, mimetype: string, options?: ValidateFileOptions): string | null {
    return validateMediaFile(buffer, mimetype, options);
  }

  async upload(buffer: Buffer, mimetype: string, productId: number, storeId: number): Promise<UploadResult> {
    const key = generateStorageKey(storeId, productId, mimetype);
    if (!sanitizeKey(key)) throw new Error('Invalid storage key');

    if (isPdf(mimetype)) {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }));

      return { url: `${this.publicBaseUrl}/${key}`, key, sizeBytes: buffer.length, sha256: sha256Hex(buffer) };
    }

    const ext = extensionForMime(mimetype);
    const thumbKey = key.replace(`.${ext}`, `.thumb.${ext}`);

    const optimized = await sharp(buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      [ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg']({ quality: 80 })
      .toBuffer();

    const thumbBuffer = await sharp(buffer)
      .resize(200, 200, { fit: 'cover' })
      [ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg']({ quality: 70 })
      .toBuffer();

    await Promise.all([
      this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: optimized,
        ContentType: mimetype,
      })),
      this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: mimetype,
      })),
    ]);

    const url = `${this.publicBaseUrl}/${key}`;
    const thumbUrl = `${this.publicBaseUrl}/${thumbKey}`;
    return { url, key, thumbUrl, thumbKey, sizeBytes: optimized.length, sha256: sha256Hex(optimized) };
  }

  async delete(key: string): Promise<void> {
    if (!sanitizeKey(key)) throw new Error('Invalid storage key');
    const thumbKey = key.replace(/\.(jpg|png|webp)$/, '.thumb.$1');
    await Promise.all([
      this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })),
      this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: thumbKey })),
    ]);
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }
}

export function createMediaAdapter(driver?: string): MediaAdapter {
  const type = (driver ?? process.env.STORAGE_DRIVER ?? 'local') as StorageDriver;
  if (type === 'local') {
    return new LocalStorageAdapter();
  }
  if (type === 's3') {
    const required = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_BASE_URL'];
    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Missing required env var for S3 storage: ${key}`);
      }
    }
    return new S3StorageAdapter(
      process.env.S3_ENDPOINT!,
      process.env.S3_REGION!,
      process.env.S3_BUCKET!,
      process.env.S3_ACCESS_KEY_ID!,
      process.env.S3_SECRET_ACCESS_KEY!,
      process.env.S3_PUBLIC_BASE_URL!,
    );
  }
  throw new Error(`Unknown storage driver: ${type}. Use 'local' or 's3'.`);
}
