// Audit Logging Depth — Quality Pass 3, Item 3
//
// Source-grep tests for audit-logging coverage in the most
// critical mutating routes (orders, products, wallet).
//
// Recon (pre-change): none of orders.ts, products.ts, or
// wallet.ts had any audit.record() calls. This is a significant
// gap — order status changes, refunds, product CRUD, and
// payout requests are all sensitive operations that need
// an audit trail for compliance and incident investigation.
//
// This commit adds audit calls to the highest-impact paths:
//   - orders: PATCH /:orderId/status and POST /:orderId/refund
//   - products: POST /, PATCH /:productId, DELETE /:productId
//   - wallet: POST /payouts/request

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const ordersPath = resolve(projectRoot, 'apps/api/src/routes/orders.ts');
const productsPath = resolve(projectRoot, 'apps/api/src/routes/products.ts');
const walletPath = resolve(projectRoot, 'apps/api/src/routes/wallet.ts');

const orders = readFileSync(ordersPath, 'utf-8');
const products = readFileSync(productsPath, 'utf-8');
const wallet = readFileSync(walletPath, 'utf-8');

describe('Audit Logging Depth (Quality Pass 3, Item 3)', () => {
  describe('orders.ts', () => {
    it('imports AuditLogService', () => {
      expect(orders).toMatch(/AuditLogService.*from '@haa\/integration-core'/);
    });

    it('records an audit entry on order status change', () => {
      // The PATCH /:orderId/status handler should call audit.record
      // with action 'order_status_changed'
      expect(orders).toContain('order_status_changed');
      expect(orders).toMatch(/AuditLogService\(\)\.record[\s\S]{0,300}order_status_changed/);
    });

    it('records an audit entry on refund', () => {
      // The POST /:orderId/refund handler should call audit.record
      // with action 'refund_processed'
      expect(orders).toContain('refund_processed');
      expect(orders).toMatch(/AuditLogService\(\)\.record[\s\S]{0,300}refund_processed/);
    });
  });

  describe('products.ts', () => {
    it('imports AuditLogService', () => {
      expect(products).toMatch(/AuditLogService.*from '@haa\/integration-core'/);
    });

    it('records an audit entry on product create', () => {
      expect(products).toContain('product_created');
      expect(products).toMatch(/AuditLogService\(\)\.record[\s\S]{0,300}product_created/);
    });

    it('records an audit entry on product update', () => {
      expect(products).toContain('product_updated');
      expect(products).toMatch(/AuditLogService\(\)\.record[\s\S]{0,300}product_updated/);
    });

    it('records an audit entry on product delete (archive)', () => {
      // The action vocabulary uses 'product_archived' (see
      // packages/shared/src/types/orders.ts)
      expect(products).toContain('product_archived');
      expect(products).toMatch(/AuditLogService\(\)\.record[\s\S]{0,300}product_archived/);
    });
  });

  describe('wallet.ts', () => {
    it('imports AuditLogService', () => {
      expect(wallet).toMatch(/AuditLogService.*from '@haa\/integration-core'/);
    });

    it('records an audit entry on payout request', () => {
      // The AuditAction type includes 'payout_requested' (added
      // in this commit to packages/shared/src/types/orders.ts).
      expect(wallet).toContain('payout_requested');
      expect(wallet).toMatch(/AuditLogService\(\)\.record/);
    });
  });
});
