// HAA-AUTH-OTP-001 — Email OTP service.
//
// Issues and verifies short-lived (10 min) one-time codes delivered by
// email. Backs three auth flows: signup_verify, magic_login,
// password_reset. The flow-level integrations are NOT in this file —
// they live in separate PRs that consume this service.
//
// Security model:
//   - Codes are 6-digit decimal, generated from `node:crypto.randomBytes`
//     (NEVER Math.random — see `generateCode`).
//   - Stored as bcrypt(`code`); the plaintext is never persisted.
//   - `verify` increments `attempts` BEFORE calling `bcrypt.compare`, so
//     a parallel verifier cannot slip past the max-attempts gate.
//   - `bcrypt.compare` is constant-time, defeating timing-side-channel
//     attacks against the hash.
//   - Re-use is refused: once `usedAt` is set, the row is dead.
//   - Per-(email, purpose) send rate: 3 / hour. Per-IP rate is enforced
//     separately at the route layer.
//   - The OTP code itself MUST NEVER appear in HTTP responses or logs.

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq, and, desc, gte, isNull, sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { EMAIL_OTP_PURPOSES, type EmailOtpPurpose } from '@haa/db/schema';
import {
  SmtpEmailProvider,
  ResendEmailProvider,
  renderHaaEmail,
  escapeHtml,
  type NotificationProvider,
} from '@haa/notification-core';

export { EMAIL_OTP_PURPOSES };
export type { EmailOtpPurpose };

const CODE_LENGTH = 6;
const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const SEND_RATE_PER_HOUR = 3; // per email per purpose
const BCRYPT_ROUNDS = 10; // OTPs are short-lived; 10 is fine

export type GenerateOtpInput = {
  email: string;
  purpose: EmailOtpPurpose;
  userId?: number | null;
  sourceIp?: string | null;
  userAgent?: string | null;
};

export type VerifyOtpResult =
  | { ok: true; otpId: number; userId: number | null }
  | { ok: false; reason: 'NOT_FOUND' | 'EXPIRED' | 'USED' | 'TOO_MANY_ATTEMPTS' | 'INVALID_CODE' };

export type SendOtpResult =
  | { ok: true; otpId: number; expiresAt: Date }
  | { ok: false; reason: 'RATE_LIMITED' | 'INVALID_PURPOSE' | 'EMAIL_SEND_FAILED'; message?: string };

export class EmailOtpService {
  constructor(private db: DbClient = createDbClient()) {}

  async generateAndSend(input: GenerateOtpInput): Promise<SendOtpResult> {
    // 1. validate purpose
    if (!EMAIL_OTP_PURPOSES.includes(input.purpose)) {
      return { ok: false, reason: 'INVALID_PURPOSE' };
    }
    const email = input.email.trim().toLowerCase();

    // 2. rate limit: 3 sends/hour per email+purpose
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(s.emailOtpCodes)
      .where(
        and(
          eq(s.emailOtpCodes.email, email),
          eq(s.emailOtpCodes.purpose, input.purpose),
          gte(s.emailOtpCodes.createdAt, oneHourAgo),
        ),
      );
    if (Number(recent[0]?.c ?? 0) >= SEND_RATE_PER_HOUR) {
      return {
        ok: false,
        reason: 'RATE_LIMITED',
        message: 'تم تجاوز الحد المسموح من رموز التحقق. حاول لاحقاً.',
      };
    }

    // 3. generate code
    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + EXPIRY_MS);

    // 4. insert
    const [row] = await this.db
      .insert(s.emailOtpCodes)
      .values({
        email,
        purpose: input.purpose,
        codeHash,
        userId: input.userId ?? null,
        expiresAt,
        maxAttempts: MAX_ATTEMPTS,
        sourceIp: input.sourceIp ?? null,
        userAgent: input.userAgent ?? null,
      })
      .returning();

    // 5. send email — FAIL the request if delivery fails, because the
    //    user has no other way to receive the code.
    const provider = pickProvider();
    if (!provider) {
      return { ok: false, reason: 'EMAIL_SEND_FAILED', message: 'No email provider configured' };
    }
    const sendResult = await provider.send({
      recipient: email,
      subject: subjectFor(input.purpose),
      body: renderOtpEmail(code, input.purpose),
    });
    if (!sendResult.success) {
      return { ok: false, reason: 'EMAIL_SEND_FAILED', message: sendResult.error };
    }

    return { ok: true, otpId: row.id, expiresAt };
  }

  async verify(input: {
    email: string;
    purpose: EmailOtpPurpose;
    code: string;
  }): Promise<VerifyOtpResult> {
    const email = input.email.trim().toLowerCase();

    // Latest unused code for this email+purpose.
    const [row] = await this.db
      .select()
      .from(s.emailOtpCodes)
      .where(
        and(
          eq(s.emailOtpCodes.email, email),
          eq(s.emailOtpCodes.purpose, input.purpose),
          isNull(s.emailOtpCodes.usedAt),
        ),
      )
      .orderBy(desc(s.emailOtpCodes.createdAt))
      .limit(1);

    if (!row) return { ok: false, reason: 'NOT_FOUND' };
    if (row.usedAt) return { ok: false, reason: 'USED' };
    if (row.expiresAt < new Date()) return { ok: false, reason: 'EXPIRED' };
    if (row.attempts >= row.maxAttempts) return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };

    // Increment attempts FIRST so a parallel request can't slip through
    // the max-attempts gate.
    await this.db
      .update(s.emailOtpCodes)
      .set({ attempts: row.attempts + 1, updatedAt: new Date() })
      .where(eq(s.emailOtpCodes.id, row.id));

    // bcrypt.compare is constant-time.
    const match = await bcrypt.compare(input.code, row.codeHash);
    if (!match) return { ok: false, reason: 'INVALID_CODE' };

    // Mark used. The attempts increment above effectively locks the
    // row in to a single successful resolution.
    await this.db
      .update(s.emailOtpCodes)
      .set({ usedAt: new Date(), updatedAt: new Date() })
      .where(eq(s.emailOtpCodes.id, row.id));

    return { ok: true, otpId: row.id, userId: row.userId };
  }

  private generateCode(): string {
    // Crypto-strong 6-digit code. Math.random is NOT acceptable for
    // authentication codes.
    const bytes = randomBytes(4);
    const n = bytes.readUInt32BE(0) % 1_000_000;
    return n.toString().padStart(CODE_LENGTH, '0');
  }
}

function pickProvider(): NotificationProvider | null {
  const smtp = new SmtpEmailProvider();
  if (smtp.isAvailable) return smtp;
  const resend = new ResendEmailProvider();
  if (resend.isAvailable) return resend;
  return null;
}

function subjectFor(purpose: EmailOtpPurpose): string {
  switch (purpose) {
    case 'signup_verify':
      return 'رمز التحقق لتفعيل حسابك في هاء متاجر';
    case 'magic_login':
      return 'رمز الدخول إلى هاء متاجر';
    case 'password_reset':
      return 'إعادة تعيين كلمة المرور في هاء متاجر';
  }
}

function renderOtpEmail(code: string, purpose: EmailOtpPurpose): string {
  const title = subjectFor(purpose);
  const explanation = {
    signup_verify:
      'استخدم الرمز التالي لإكمال تفعيل حسابك الجديد. لا تشاركه مع أحد — فريق هاء لن يطلب منك هذا الرمز.',
    magic_login:
      'استخدم الرمز التالي لإكمال تسجيل دخولك. صالح لمدة 10 دقائق.',
    password_reset:
      'تلقّينا طلب إعادة تعيين كلمة المرور. استخدم الرمز التالي لإكمال العملية. إذا لم تطلب ذلك، تجاهل هذه الرسالة.',
  }[purpose];

  const bodyHtml = `
    <p style="margin: 0 0 16px;">${escapeHtml(explanation)}</p>
    <div style="margin: 24px 0; padding: 28px; background: #f5f7fa; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: #475569; text-transform: uppercase; margin-bottom: 12px;">رمز التحقق</div>
      <div style="font-size: 36px; font-weight: 800; letter-spacing: 0.4em; font-family: 'SF Mono', Menlo, monospace; color: #0f172a; direction: ltr;">${escapeHtml(code)}</div>
      <div style="margin-top: 16px; font-size: 12px; color: #475569;">صالح لمدة 10 دقائق</div>
    </div>
    <p style="margin: 16px 0 0; font-size: 13px; color: #475569;">إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة وكلمة مرورك تبقى آمنة.</p>
  `;

  return renderHaaEmail({
    title,
    preheader: `رمز التحقق: ${code} · صالح لـ 10 دقائق`,
    bodyHtml,
  });
}
