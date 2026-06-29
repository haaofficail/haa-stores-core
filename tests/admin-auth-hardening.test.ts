import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  decryptAdminTotpSecret,
  encryptAdminTotpSecret,
  generateAdminTotpCode,
  generateAdminTotpSecret,
  verifyAdminTotpCode,
} from '../packages/auth-core/src/admin-totp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const files = {
  adminTotp: resolve(projectRoot, 'packages/auth-core/src/admin-totp.ts'),
  adminAuthService: resolve(projectRoot, 'packages/auth-core/src/admin-auth-service.ts'),
  adminAuthMiddleware: resolve(projectRoot, 'packages/auth-core/src/admin.ts'),
  usersSchema: resolve(projectRoot, 'packages/db/src/schema/users.ts'),
  migration: resolve(projectRoot, 'packages/db/src/migrations/0090_admin_totp.sql'),
  snapshot: resolve(projectRoot, 'packages/db/src/migrations/meta/0090_snapshot.json'),
  journal: resolve(projectRoot, 'packages/db/src/migrations/meta/_journal.json'),
  apiAuthRoute: resolve(projectRoot, 'apps/api/src/routes/admin/auth.ts'),
  apiAdminIndex: resolve(projectRoot, 'apps/api/src/routes/admin/index.ts'),
  loginPage: resolve(projectRoot, 'apps/admin-dashboard/src/pages/Login.tsx'),
  securityPage: resolve(projectRoot, 'apps/admin-dashboard/src/pages/Security.tsx'),
  app: resolve(projectRoot, 'apps/admin-dashboard/src/App.tsx'),
  apiClient: resolve(projectRoot, 'apps/admin-dashboard/src/lib/api.ts'),
};

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('TASK-0125 admin auth hardening', () => {
  it('implements TOTP with crypto primitives and encrypted secret envelopes', () => {
    const content = read(files.adminTotp);
    expect(content).toMatch(/createHmac/);
    expect(content).toMatch(/timingSafeEqual/);
    expect(content).toMatch(/aes-256-gcm/);
    expect(content).toMatch(/ADMIN_TOTP_ENCRYPTION_KEY/);
    expect(content).toMatch(/isAdminTotpSchemaReadinessError/);
    expect(content).not.toMatch(/Math\.random/);

    process.env.ADMIN_TOTP_ENCRYPTION_KEY = '0'.repeat(64);
    const secret = generateAdminTotpSecret();
    const code = generateAdminTotpCode(secret);
    const wrongCode = code === '000000' ? '000001' : '000000';
    expect(verifyAdminTotpCode({ secret, code })).toBe(true);
    expect(verifyAdminTotpCode({ secret, code: wrongCode })).toBe(false);

    const encrypted = encryptAdminTotpSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptAdminTotpSecret(encrypted)).toBe(secret);
  });

  it('adds encrypted admin TOTP columns with migration, journal, and snapshot coverage', () => {
    expect(read(files.usersSchema)).toMatch(/adminTotpSecretEncrypted:\s*text\('admin_totp_secret_encrypted'\)/);
    expect(read(files.usersSchema)).toMatch(/adminTotpPendingSecretEncrypted:\s*text\('admin_totp_pending_secret_encrypted'\)/);
    expect(read(files.usersSchema)).toMatch(/adminTotpEnabledAt:\s*timestamp\('admin_totp_enabled_at'\)/);

    const migration = read(files.migration);
    expect(migration).toMatch(/ADD COLUMN "admin_totp_secret_encrypted" text/);
    expect(migration).toMatch(/users_admin_totp_enabled_idx/);
    expect(migration).not.toMatch(/admin_totp_secret"\s+text/);

    expect(read(files.journal)).toMatch(/0090_admin_totp/);
    expect(read(files.snapshot)).toMatch(/admin_totp_secret_encrypted/);
    expect(read(files.snapshot)).toMatch(/users_admin_totp_enabled_idx/);
  });

  it('keeps admin auth independent and adds password reset plus TOTP endpoints', () => {
    const route = read(files.apiAuthRoute);
    expect(route).toMatch(/requestAdminPasswordResetRoute/);
    expect(route).toMatch(/confirmAdminPasswordResetRoute/);
    expect(route).toMatch(/adminTotpStatusRoute/);
    expect(route).toMatch(/startAdminTotpEnrollmentRoute/);
    expect(route).toMatch(/READINESS_UNAVAILABLE/);
    expect(route).toMatch(/twoFactorRequired/);
    expect(route).not.toMatch(/AuthFlowService/);
    expect(route).not.toMatch(/@haa\/commerce-core/);

    const service = read(files.adminAuthService);
    expect(service).toMatch(/ADMIN_BASE_USER_SELECT/);
    expect(service).toMatch(/getLoginTotpState/);
    expect(service).toMatch(/requestPasswordReset/);
    expect(service).toMatch(/confirmPasswordReset/);
    expect(service).toMatch(/admin_password_reset_requested/);
    expect(service).toMatch(/password_reset_completed/);
    expect(service).toMatch(/twoFactorVerified:\s*twoFactorEnabled/);
  });

  it('guards sensitive admin mutations with verified TOTP when an admin has enabled it', () => {
    const middleware = read(files.adminAuthMiddleware);
    expect(middleware).toMatch(/requireAdminTwoFactorIfEnabled/);
    expect(middleware).toMatch(/ADMIN_2FA_REQUIRED/);
    expect(middleware).toMatch(/ADMIN_2FA_READINESS_UNAVAILABLE/);
    expect(middleware).toMatch(/isAdminTotpSchemaReadinessError/);

    const index = read(files.apiAdminIndex);
    expect(index).toMatch(/login\/password-reset\/request/);
    expect(index).toMatch(/login\/password-reset\/confirm/);
    expect(index).toMatch(/rateLimiter/);
    expect(index).toMatch(/security\/totp\/status/);
    expect(index).toMatch(/security\/totp\/enroll/);
    expect(index.match(/requireAdminTwoFactorIfEnabled\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(20);
    expect(index).toMatch(/reveal-iban'[\s\S]*requireAdminTwoFactorIfEnabled\(\)/);
    expect(index).toMatch(/second-approve'[\s\S]*requireAdminTwoFactorIfEnabled\(\)/);
    expect(index).toMatch(/manual-payouts\/:payoutId\/approve'[\s\S]*requireAdminTwoFactorIfEnabled\(\)/);
    expect(index).toMatch(/marketplace\/products\/:id\/review'[\s\S]*requireAdminTwoFactorIfEnabled\(\)/);
    expect(index).toMatch(/stores\/:storeId\/payment-settings'[\s\S]*requireAdminTwoFactorIfEnabled\(\)/);
  });

  it('exposes admin dashboard UI for TOTP login, password reset, and account security', () => {
    expect(read(files.loginPage)).toMatch(/twoFactor/);
    expect(read(files.loginPage)).toMatch(/requestAdminPasswordReset/);
    expect(read(files.loginPage)).toMatch(/confirmAdminPasswordReset/);
    expect(read(files.loginPage)).toMatch(/one-time-code/);

    expect(read(files.securityPage)).toMatch(/getAdminTotpStatus/);
    expect(read(files.securityPage)).toMatch(/isTotpReady/);
    expect(read(files.securityPage)).toMatch(/startAdminTotpEnrollment/);
    expect(read(files.securityPage)).toMatch(/confirmAdminTotpEnrollment/);
    expect(read(files.securityPage)).toMatch(/disableAdminTotp/);

    expect(read(files.app)).toMatch(/\/security\|أمان الحساب\|ShieldCheck/);
    expect(read(files.app)).toMatch(/path="\/security"/);
    expect(read(files.apiClient)).toMatch(/AdminLoginResult/);
    expect(read(files.apiClient)).toMatch(/getAdminTotpStatus/);
  });
});
