import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_VERSION = 'admin-upload-integrity-v1';
const SHA256_RE = /^[a-f0-9]{64}$/;

export interface AdminUploadIntegrityInput {
  key: string;
  sha256: string;
  fileMimeType: string;
}

export interface AdminUploadIntegrityVerificationInput extends AdminUploadIntegrityInput {
  signature: string;
}

function uploadIntegritySecret(): string {
  return process.env.STORAGE_SIGNING_SECRET || process.env.JWT_SECRET || 'insecure-dev-only';
}

function canonicalPayload(input: AdminUploadIntegrityInput): string {
  return JSON.stringify([
    SIGNATURE_VERSION,
    input.key,
    input.sha256.toLowerCase(),
    input.fileMimeType,
  ]);
}

export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function signAdminUploadIntegrity(input: AdminUploadIntegrityInput): string {
  const digest = createHmac('sha256', uploadIntegritySecret())
    .update(canonicalPayload(input))
    .digest('hex');
  return `${SIGNATURE_VERSION}:${digest}`;
}

export function verifyAdminUploadIntegrity(input: AdminUploadIntegrityVerificationInput): boolean {
  const sha256 = input.sha256.toLowerCase();
  if (!input.key || !SHA256_RE.test(sha256) || !input.fileMimeType || !input.signature) {
    return false;
  }
  const expected = signAdminUploadIntegrity({ key: input.key, sha256, fileMimeType: input.fileMimeType });
  try {
    return timingSafeEqual(Buffer.from(input.signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function assertAdminUploadIntegrity(input: AdminUploadIntegrityVerificationInput): void {
  if (!verifyAdminUploadIntegrity(input)) {
    throw new Error('UPLOAD_INTEGRITY_SIGNATURE_INVALID');
  }
}
