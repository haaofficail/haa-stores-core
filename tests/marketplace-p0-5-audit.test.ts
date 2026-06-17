/**
 * TASK-0040 Track 1C — P0-5 Audit Logging on Admin Marketplace Moderation
 *
 * Bug: admin/marketplace.ts PATCH /marketplace/products/:id/review
 *      (line 58, marketplaceProductReviewRoute) and
 *      PATCH /marketplace/products/:id/feature
 *      (line 75, marketplaceProductFeatureRoute) perform UPDATEs but
 *      never call AuditLogService. Compare to:
 *      - orders.ts (audit on order_status_changed, refund_processed)
 *      - wallet.ts (audit on payout_requested)
 *      - policies.ts (audit on policy_published)
 *
 *      Without audit logs, there is NO forensic record of who approved
 *      or rejected marketplace products. MoCI consumer protection + PDPL
 *      Article 17 (accountability principle) violations.
 *
 * Fix: Add AuditLogService.record() calls to both handlers with structured
 *      meta: { productId, fromStatus, toStatus, note, actorAdminId } for
 *      review; { productId, featured, sortOrder } for feature. Extend
 *      AuditAction union with 'marketplace_product_review' +
 *      'marketplace_product_feature' + Arabic labels.
 *
 * This test codifies the contract:
 *   - AuditAction union contains the new actions
 *   - AUDIT_ACTION_LABELS has Arabic labels for them
 *   - admin/marketplace.ts imports AuditLogService
 *   - both handlers call AuditLogService().record() with the right action
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const ORDERS_TYPES = resolve(projectRoot, 'packages/shared/src/types/orders.ts');
const AUDIT_TYPES = resolve(projectRoot, 'packages/shared/src/types/audit.ts');
const ADMIN_MP = resolve(projectRoot, 'apps/api/src/routes/admin/marketplace.ts');

const ordersTypesSrc = readFileSync(ORDERS_TYPES, 'utf-8');
const auditTypesSrc = readFileSync(AUDIT_TYPES, 'utf-8');
const adminMpSrc = readFileSync(ADMIN_MP, 'utf-8');

describe('TASK-0040 Track 1C — P0-5 audit logging on admin marketplace moderation', () => {
  describe('AuditAction union extended', () => {
    it('contains marketplace_product_review action', () => {
      expect(ordersTypesSrc).toMatch(/'marketplace_product_review'/);
    });

    it('contains marketplace_product_feature action', () => {
      expect(ordersTypesSrc).toMatch(/'marketplace_product_feature'/);
    });
  });

  describe('AUDIT_ACTION_LABELS has Arabic labels for new actions', () => {
    it('has Arabic label for marketplace_product_review', () => {
      expect(auditTypesSrc).toMatch(
        /marketplace_product_review:\s*'[^']+'/,
      );
    });

    it('has Arabic label for marketplace_product_feature', () => {
      expect(auditTypesSrc).toMatch(
        /marketplace_product_feature:\s*'[^']+'/,
      );
    });
  });

  describe('admin/marketplace.ts — review handler', () => {
    it('imports AuditLogService', () => {
      expect(adminMpSrc).toMatch(/AuditLogService.*from '@haa\/integration-core'/);
    });

    it('records an audit entry on marketplace product review', () => {
      // Pattern: AuditLogService().record({ ... action: 'marketplace_product_review' ...
      // The record call must contain the action string.
      const recordBlock = adminMpSrc.match(
        /AuditLogService\(\)\.record\(\{[\s\S]{0,800}marketplace_product_review[\s\S]{0,800}\}/,
      );
      expect(recordBlock).not.toBeNull();
    });

    it('review audit captures entityId (productId) + fromStatus + toStatus', () => {
      const recordBlock = adminMpSrc.match(
        /AuditLogService\(\)\.record\(\{[\s\S]{0,800}marketplace_product_review[\s\S]{0,800}\}/,
      );
      expect(recordBlock).not.toBeNull();
      const block = recordBlock![0];
      // Convention from wallet.ts / policies.ts: entityId is the product id.
      expect(block).toContain('entityId');
      expect(block).toContain('entityType');
      expect(block).toContain('product');
      // old/new values must reference the review status.
      expect(block).toContain('haaMarketplaceReviewStatus');
    });
  });

  describe('admin/marketplace.ts — feature handler', () => {
    it('records an audit entry on marketplace product feature', () => {
      const recordBlock = adminMpSrc.match(
        /AuditLogService\(\)\.record\(\{[\s\S]{0,800}marketplace_product_feature[\s\S]{0,800}\}/,
      );
      expect(recordBlock).not.toBeNull();
    });

    it('feature audit captures entityId + featured state', () => {
      const recordBlock = adminMpSrc.match(
        /AuditLogService\(\)\.record\(\{[\s\S]{0,800}marketplace_product_feature[\s\S]{0,800}\}/,
      );
      expect(recordBlock).not.toBeNull();
      const block = recordBlock![0];
      expect(block).toContain('entityId');
      expect(block).toContain('haaMarketplaceFeatured');
    });
  });
});
