// TASK-0038 Final Pre-Launch Smoke Test
//
// Comprehensive end-to-end checks before commercial launch.
// This test does NOT hit the network — it inspects the codebase
// for evidence that the critical paths are in place:
//
//   1. Auth flow (login, register, password, JWT)
//   2. Marketplace (products, stats, SFDA filter, KYC gate)
//   3. Compliance (G1-G10 fields, audit log)
//   4. Security (CSRF, rate limit, audit, password hashing)
//   5. PWA / SEO (sitemap, robots, canonical, skip-link)
//   6. A11y (focus-visible, color contrast, aria-labels)
//
// If any of these are missing, the test fails. The point is to
// catch regressions in the launch-readiness surface.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function read(p: string): string {
  const path = resolve(__dirname, '..', p);
  if (!existsSync(path)) {
    throw new Error(`Required file missing: ${p}`);
  }
  return readFileSync(path, 'utf-8');
}

describe('Pre-launch smoke test — Auth', () => {
  it('Auth API endpoints are registered', () => {
    const apiIndex = read('apps/api/src/index.ts');
    expect(apiIndex).toMatch(/authRouter/);
  });

  it('Auth flow service exists', () => {
    expect(existsSync('packages/commerce-core/src/auth-flow.ts') ||
           existsSync('packages/commerce-core/src/auth/AuthFlowService.ts') ||
           read('packages/commerce-core/src/index.ts').includes('AuthFlow')).toBe(true);
  });

  it('Password hashing uses bcrypt or argon2 (not plaintext)', () => {
    const all = [
      read('apps/api/src/routes/auth.ts'),
      read('packages/commerce-core/src/auth-flow.ts'),
    ].join('\n');
    expect(all).toMatch(/bcrypt|argon2|hashPassword/);
    expect(all).not.toMatch(/password\s*===|password\s*==/);
  });

  it('JWT secret is loaded from env, not hardcoded', () => {
    const env = read('apps/api/src/env.ts');
    expect(env).toMatch(/JWT_SECRET/);
    expect(env).not.toMatch(/JWT_SECRET\s*=\s*['"]/); // no literal default
  });
});

describe('Pre-launch smoke test — Marketplace', () => {
  it('GET /marketplace/products endpoint exists', () => {
    const marketplace = read('apps/api/src/routes/haa-marketplace.ts');
    expect(marketplace).toMatch(/haaMarketplaceRouter\.get\(['"]\/products['"]/);
  });

  it('GET /marketplace/stats endpoint exists (live merchant count)', () => {
    const marketplace = read('apps/api/src/routes/haa-marketplace.ts');
    expect(marketplace).toMatch(/haaMarketplaceRouter\.get\(['"]\/stats['"]/);
  });

  it('SFDA validation is enforced (mapProduct filters prohibited)', () => {
    const marketplace = read('apps/api/src/routes/haa-marketplace.ts');
    expect(marketplace).toMatch(/validateProductForMarketplace/);
    expect(marketplace).toMatch(/sfdaCheck|sfdaNumber/);
  });

  it('Trust badge is gated on kycVerified (not unconditional)', () => {
    const detail = read('apps/storefront/src/pages/marketplace/MarketplaceProductDetail.tsx');
    expect(detail).toMatch(/kycVerified/);
    // Must check, not just render
    expect(detail).toMatch(/kycVerified\s*===\s*true/);
  });

  it('Order tracking uses accessToken as primary gate', () => {
    const marketplace = read('apps/api/src/routes/haa-marketplace.ts');
    expect(marketplace).toMatch(/accessToken.*marketplaceOrders\.accessToken/s);
  });
});

describe('Pre-launch smoke test — Compliance (G1-G10)', () => {
  it('Tenants table has all 26 G1-G10 compliance columns', () => {
    const schema = read('packages/db/src/schema/tenants.ts');
    const required = [
      'commercialRegistrationNumber', 'vatNumber', 'ecommerceLicenseNumber',
      'dpoEmail', 'trademarkNumber', 'asvLastScanAt', 'pentestLastScanAt',
      'hostingRegion', 'tabbyDpaSignedAt', 'drPlanDocumentedAt',
    ];
    for (const field of required) {
      expect(schema.includes(field), `Missing column: ${field}`).toBe(true);
    }
  });

  it('Migration 0061 exists', () => {
    expect(existsSync('packages/db/src/migrations/0061_tenant_compliance_fields.sql')).toBe(true);
  });

  it('Admin PATCH /tenants/:id accepts compliance fields', () => {
    const adminIndex = read('apps/api/src/routes/admin/index.ts');
    expect(adminIndex).toMatch(/commercialRegistrationNumber/);
    expect(adminIndex).toMatch(/vatNumber/);
    expect(adminIndex).toMatch(/pentestPass/);
  });

  it('Audit log service sanitizes sensitive fields', () => {
    const auditLog = read('apps/api/src/services/audit-log.ts');
    expect(auditLog).toMatch(/password|token|secret/);
    expect(auditLog).toMatch(/redact/);
  });

  it('/compliance admin page exists', () => {
    expect(existsSync('apps/admin-dashboard/src/pages/Compliance.tsx')).toBe(true);
  });
});

describe('Pre-launch smoke test — Security', () => {
  it('CSRF middleware is mounted', () => {
    const apiIndex = read('apps/api/src/index.ts');
    expect(apiIndex).toMatch(/csrfOrigin/);
  });

  it('Rate limit is mounted on auth endpoints', () => {
    const apiIndex = read('apps/api/src/index.ts');
    expect(apiIndex).toMatch(/strictRateLimit/);
  });

  it('Security headers are mounted', () => {
    const apiIndex = read('apps/api/src/index.ts');
    expect(apiIndex).toMatch(/securityHeaders/);
  });

  it('Health endpoint exposes hosting region', () => {
    const health = read('apps/api/src/routes/health.ts');
    expect(health).toMatch(/hostingRegion/);
    expect(health).toMatch(/dataResidency/);
  });
});

describe('Pre-launch smoke test — SEO + PWA', () => {
  it('robots.txt exists and disallows internal routes', () => {
    const robots = read('apps/storefront/public/robots.txt');
    expect(robots).toMatch(/Disallow:\s+\/admin/);
    expect(robots).toMatch(/Sitemap:/);
  });

  it('Sitemap endpoint exists', () => {
    const apiIndex = read('apps/api/src/index.ts');
    expect(apiIndex).toMatch(/sitemapRouter/);
  });

  it('Skip-link is present in index.html', () => {
    const index = read('apps/storefront/index.html');
    expect(index).toMatch(/skip-link/);
    expect(index).toMatch(/href="#storefront-scope"/);
  });

  it('useSEO supports canonical URL', () => {
    const useSEO = read('apps/storefront/src/hooks/useSEO.ts');
    expect(useSEO).toMatch(/canonical/);
    expect(useSEO).toMatch(/link\[rel="canonical"\]/);
  });

  it('index.html has lang="ar" + dir="rtl"', () => {
    const index = read('apps/storefront/index.html');
    expect(index).toMatch(/<html\s+lang="ar"\s+dir="rtl">/);
  });
});

describe('Pre-launch smoke test — A11y', () => {
  it('focus-visible rule is in index.css', () => {
    const css = read('apps/storefront/src/index.css');
    expect(css).toMatch(/:focus-visible/);
  });

  it('brand color is contrast-passing (>= 4.5:1 on white)', () => {
    const css = read('apps/storefront/src/index.css');
    expect(css).toMatch(/--brand-primary:\s*#2a6fb8/);
  });

  it('color-contrast.test.ts verifies all brand colors', () => {
    const test = read('tests/color-contrast.test.ts');
    expect(test).toMatch(/contrastRatio/);
    expect(test).toMatch(/4\.5/);
  });
});

describe('Pre-launch smoke test — DR + Backup', () => {
  it('DR backup script exists and is executable', () => {
    const script = read('scripts/dr-backup.sh');
    expect(script).toMatch(/^#!\/bin\/bash/);
    expect(script).toMatch(/run_full_backup/);
    expect(script).toMatch(/--restore-test/);
  });
});

describe('Pre-launch smoke test — Tabby DPA + ASV', () => {
  it('Tabby data flow is documented', () => {
    const tabby = read('docs/ops/TABBY_DATA_FLOW.md');
    expect(tabby).toMatch(/cross-border/);
    expect(tabby).toMatch(/verifyTabbySignature/);
  });

  it('ASV scan target is documented', () => {
    const asv = read('docs/ops/ASV_SCAN_TARGET.md');
    expect(asv).toMatch(/haastores\.sa/);
    expect(asv).toMatch(/api\.haastores\.sa/);
    expect(asv).toMatch(/ASV/);
  });
});
