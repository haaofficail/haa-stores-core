import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

describe('Quality Pass 1 — Item 6: requirePermission on dashboard.ts and ai-agent.ts', () => {
  describe('dashboard.ts', () => {
    it('must use requirePermission on the /summary endpoint', () => {
      const content = readFileSync(
        resolve(projectRoot, 'apps/api/src/routes/dashboard.ts'),
        'utf-8',
      );
      expect(content).toMatch(/dashboardRouter\.get\(['"]\/summary['"].*requirePermission/);
    });

    it('dashboard:view permission must be a valid Permission type', () => {
      const content = readFileSync(
        resolve(projectRoot, 'apps/api/src/routes/dashboard.ts'),
        'utf-8',
      );
      expect(content).toMatch(/requirePermission\(['"]dashboard:view['"]\)/);
    });
  });

  describe('ai-agent.ts', () => {
    const content = readFileSync(
      resolve(projectRoot, 'apps/api/src/routes/ai-agent.ts'),
      'utf-8',
    );

    it('must import requirePermission from @haa/auth-core', () => {
      expect(content).toMatch(/import.*requirePermission.*from.*@haa\/auth-core/);
    });

    it('GET /daily-summary must require ai:read', () => {
      expect(content).toMatch(/get\(['"]\/daily-summary['"].*requirePermission\(['"]ai:read['"]\)/s);
    });

    it('GET /weekly-summary must require ai:read', () => {
      expect(content).toMatch(/get\(['"]\/weekly-summary['"].*requirePermission\(['"]ai:read['"]\)/s);
    });

    it('GET /sales-decline must require ai:read', () => {
      expect(content).toMatch(/get\(['"]\/sales-decline['"].*requirePermission\(['"]ai:read['"]\)/s);
    });

    it('GET /product-suggestions must require ai:read', () => {
      expect(content).toMatch(/get\(['"]\/product-suggestions['"].*requirePermission\(['"]ai:read['"]\)/s);
    });

    it('GET /promotions must require ai:read', () => {
      expect(content).toMatch(/get\(['"]\/promotions['"].*requirePermission\(['"]ai:read['"]\)/s);
    });

    it('GET /abandoned-carts must require ai:read', () => {
      expect(content).toMatch(/get\(['"]\/abandoned-carts['"].*requirePermission\(['"]ai:read['"]\)/s);
    });

    it('GET /wallet must require ai:read', () => {
      expect(content).toMatch(/get\(['"]\/wallet['"].*requirePermission\(['"]ai:read['"]\)/s);
    });

    it('POST /product-title must require ai:execute', () => {
      expect(content).toMatch(/post\(['"]\/product-title['"].*requirePermission\(['"]ai:execute['"]\)/s);
    });

    it('POST /product-description must require ai:execute', () => {
      expect(content).toMatch(/post\(['"]\/product-description['"].*requirePermission\(['"]ai:execute['"]\)/s);
    });

    it('POST /generate-products must require ai:execute', () => {
      expect(content).toMatch(/post\(['"]\/generate-products['"].*requirePermission\(['"]ai:execute['"]\)/s);
    });

    it('POST /chat must require ai:execute', () => {
      expect(content).toMatch(/post\(['"]\/chat['"].*requirePermission\(['"]ai:execute['"]\)/s);
    });

    it('POST /execute must require ai:execute (mutation)', () => {
      expect(content).toMatch(/post\(['"]\/execute['"].*requirePermission\(['"]ai:execute['"]\)/s);
    });
  });

  describe('Permission type and catalog', () => {
    it('Permission type must include ai:read', () => {
      const content = readFileSync(
        resolve(projectRoot, 'packages/shared/src/types/orders.ts'),
        'utf-8',
      );
      expect(content).toMatch(/'ai:read'/);
    });

    it('Permission type must include ai:execute', () => {
      const content = readFileSync(
        resolve(projectRoot, 'packages/shared/src/types/orders.ts'),
        'utf-8',
      );
      expect(content).toMatch(/'ai:execute'/);
    });

    it('PERMISSION_CATALOG must include ai:read entry', () => {
      const content = readFileSync(
        resolve(projectRoot, 'packages/shared/src/permissions.ts'),
        'utf-8',
      );
      expect(content).toMatch(/key:\s*'ai:read'/);
    });

    it('PERMISSION_CATALOG must include ai:execute entry', () => {
      const content = readFileSync(
        resolve(projectRoot, 'packages/shared/src/permissions.ts'),
        'utf-8',
      );
      expect(content).toMatch(/key:\s*'ai:execute'/);
    });
  });
});
