/**
 * ZATCA portal client — Phase 2 clearance & reporting.
 *
 * Prerequisites (one-time, manual):
 *  1. Register on https://fatoora.zatca.gov.sa/
 *  2. Generate CSR and obtain CSID (Compliance Certificate)
 *  3. Run compliance checks → obtain PCSID (Production Certificate)
 *  4. Set ZATCA_PCSID and ZATCA_PCSID_SECRET in env
 *
 * Env vars:
 *   ZATCA_BASE_URL        = https://gw-fatoora.zatca.gov.sa/e-invoicing/core (production)
 *                         = https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal (sandbox)
 *   ZATCA_PCSID           = production certificate (base64)
 *   ZATCA_PCSID_SECRET    = production certificate secret
 */

import type { ZatcaClearanceResult } from './types.js';

function getAuth(): string {
  const csid = process.env.ZATCA_PCSID;
  const secret = process.env.ZATCA_PCSID_SECRET;
  if (!csid || !secret) throw new Error('ZATCA_PCSID and ZATCA_PCSID_SECRET must be set for Phase 2');
  return Buffer.from(`${csid}:${secret}`).toString('base64');
}

function getBaseUrl(): string {
  return process.env.ZATCA_BASE_URL
    || 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal';
}

/**
 * Report a simplified invoice (B2C) to ZATCA.
 * No clearance needed — ZATCA returns acknowledgement.
 */
export async function reportInvoice(
  invoiceXml: string,
  invoiceHash: string,
  uuid: string,
): Promise<ZatcaClearanceResult> {
  const xmlB64 = Buffer.from(invoiceXml).toString('base64');

  const res = await fetch(`${getBaseUrl()}/invoices/reporting/single`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getAuth()}`,
      'Content-Type': 'application/json',
      'Accept-Version': 'V2',
      'Accept-Language': 'en',
    },
    body: JSON.stringify({
      invoiceHash,
      uuid,
      invoice: xmlB64,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { status: 'error', errors: [`ZATCA ${res.status}: ${text}`] };
  }

  const data = await res.json() as {
    reportingStatus?: string;
    validationResults?: { warningMessages?: Array<{ message: string }>; errorMessages?: Array<{ message: string }> };
  };

  return {
    status: data.reportingStatus === 'REPORTED' ? 'reported' : 'error',
    uuid,
    warnings: data.validationResults?.warningMessages?.map((w) => w.message),
    errors: data.validationResults?.errorMessages?.map((e) => e.message),
  };
}

/**
 * Clear a standard invoice (B2B) with ZATCA.
 * Required for invoices ≥ SAR 1,000 or B2B transactions.
 */
export async function clearInvoice(
  invoiceXml: string,
  invoiceHash: string,
  uuid: string,
): Promise<ZatcaClearanceResult> {
  const xmlB64 = Buffer.from(invoiceXml).toString('base64');

  const res = await fetch(`${getBaseUrl()}/invoices/clearance/single`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getAuth()}`,
      'Content-Type': 'application/json',
      'Accept-Version': 'V2',
      'Accept-Language': 'en',
      'Clearance-Status': '1',
    },
    body: JSON.stringify({
      invoiceHash,
      uuid,
      invoice: xmlB64,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { status: 'error', errors: [`ZATCA ${res.status}: ${text}`] };
  }

  const data = await res.json() as {
    clearanceStatus?: string;
    clearedInvoice?: string;
    validationResults?: { warningMessages?: Array<{ message: string }>; errorMessages?: Array<{ message: string }> };
  };

  return {
    status: data.clearanceStatus === 'CLEARED' ? 'cleared' : 'error',
    uuid,
    warnings: data.validationResults?.warningMessages?.map((w) => w.message),
    errors: data.validationResults?.errorMessages?.map((e) => e.message),
  };
}

export function isZatcaConfigured(): boolean {
  return !!(process.env.ZATCA_PCSID && process.env.ZATCA_PCSID_SECRET);
}
