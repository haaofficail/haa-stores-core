import { eq, and, ne } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { resolveTxt, resolveCname } from 'node:dns/promises';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import {
  normalizeDomain,
  isValidCustomDomain,
  buildVerificationRecord,
  CUSTOM_DOMAIN_CNAME_TARGET,
} from '@haa/shared';

export type DnsLookup = {
  resolveTxt: (host: string) => Promise<string[][]>;
  resolveCname: (host: string) => Promise<string[]>;
};

const realDns: DnsLookup = { resolveTxt, resolveCname };

/**
 * طابِق سجلات DNS الخام مقابل المتوقّع (دالة نقية قابلة للاختبار).
 * TXT قد يأتي مجزّأً (chunks) فنضمّه؛ CNAME نطبّعه قبل المقارنة.
 */
export function checkDnsRecords(
  txt: string[][],
  cnames: string[],
  expectedTxtValue: string,
  cnameTarget: string = CUSTOM_DOMAIN_CNAME_TARGET,
): { txtFound: boolean; cnameOk: boolean; ok: boolean } {
  const flat = txt.map((parts) => parts.join(''));
  const txtFound = flat.includes(expectedTxtValue);
  const cnameOk = cnames.some((c) => normalizeDomain(c) === cnameTarget);
  return { txtFound, cnameOk, ok: txtFound && cnameOk };
}

export interface SetDomainResult {
  ok: boolean;
  domain?: string;
  token?: string;
  record?: { name: string; value: string };
  cnameTarget?: string;
  error?: 'invalid_domain' | 'already_taken';
}

export interface VerifyResult {
  ok: boolean;
  status: 'active' | 'failed' | 'pending';
  txtFound?: boolean;
  cnameOk?: boolean;
  error?: string;
}

/**
 * CustomDomainService (QA Custom Domain) — يدير ربط دومين التاجر والتحقّق منه.
 * منطق التطبيع/التحقّق النقي في @haa/shared؛ هنا التخزين وفحص DNS.
 * يقبل حاقن DNS للاختبار.
 */
export class CustomDomainService {
  constructor(private db: DbClient = createDbClient(), private dns: DnsLookup = realDns) {}

  /** اضبط دوميناً مخصّصاً (pending) ووَلِّد توكن تحقّق. */
  async setDomain(storeId: number, input: string): Promise<SetDomainResult> {
    const domain = normalizeDomain(input);
    if (!domain || !isValidCustomDomain(domain)) {
      return { ok: false, error: 'invalid_domain' };
    }

    // فريد عالمياً — لا يطالب به متجر آخر
    const [taken] = await this.db.select({ id: s.stores.id }).from(s.stores)
      .where(and(eq(s.stores.customDomain, domain), ne(s.stores.id, storeId)))
      .limit(1);
    if (taken) return { ok: false, error: 'already_taken' };

    const token = randomBytes(24).toString('hex');
    await this.db.update(s.stores).set({
      customDomain: domain,
      customDomainStatus: 'pending',
      customDomainToken: token,
      customDomainVerifiedAt: null,
      updatedAt: new Date(),
    }).where(eq(s.stores.id, storeId));

    return {
      ok: true,
      domain,
      token,
      record: buildVerificationRecord(domain, token) ?? undefined,
      cnameTarget: CUSTOM_DOMAIN_CNAME_TARGET,
    };
  }

  /** أزل الدومين المخصّص. */
  async removeDomain(storeId: number): Promise<void> {
    await this.db.update(s.stores).set({
      customDomain: null,
      customDomainStatus: 'none',
      customDomainToken: null,
      customDomainVerifiedAt: null,
      updatedAt: new Date(),
    }).where(eq(s.stores.id, storeId));
  }

  /**
   * تحقّق من ملكية الدومين عبر DNS: سجل TXT يحوي التوكن + CNAME يشير لهدف المنصّة.
   * عند النجاح: status='active'. عند الفشل: status='failed'.
   */
  async verifyDomain(storeId: number): Promise<VerifyResult> {
    const [store] = await this.db.select({
      domain: s.stores.customDomain,
      token: s.stores.customDomainToken,
    }).from(s.stores).where(eq(s.stores.id, storeId)).limit(1);

    if (!store?.domain || !store.token) {
      return { ok: false, status: 'pending', error: 'no_domain' };
    }

    const expected = buildVerificationRecord(store.domain, store.token);
    if (!expected) return { ok: false, status: 'pending', error: 'no_domain' };

    let txt: string[][] = [];
    let cnames: string[] = [];
    try { txt = await this.dns.resolveTxt(expected.name); } catch { /* TXT غير موجود بعد */ }
    try { cnames = await this.dns.resolveCname(store.domain); } catch { /* CNAME غير مضبوط بعد */ }

    const { txtFound, cnameOk, ok } = checkDnsRecords(txt, cnames, expected.value);
    await this.db.update(s.stores).set({
      customDomainStatus: ok ? 'active' : 'failed',
      customDomainVerifiedAt: ok ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(s.stores.id, storeId));

    return { ok, status: ok ? 'active' : 'failed', txtFound, cnameOk };
  }

  /** اجلب متجراً نشطاً بدومينه المخصّص (للحلّ من Host header). */
  async getStoreByActiveDomain(domain: string) {
    const norm = normalizeDomain(domain);
    if (!norm) return null;
    const [store] = await this.db.select().from(s.stores)
      .where(and(eq(s.stores.customDomain, norm), eq(s.stores.customDomainStatus, 'active')))
      .limit(1);
    return store ?? null;
  }

  /** حالة الدومين الحالية للتاجر. */
  async getStatus(storeId: number) {
    const [store] = await this.db.select({
      domain: s.stores.customDomain,
      status: s.stores.customDomainStatus,
      token: s.stores.customDomainToken,
      verifiedAt: s.stores.customDomainVerifiedAt,
    }).from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
    if (!store?.domain) return { domain: null, status: 'none' as const };
    return {
      domain: store.domain,
      status: store.status,
      verifiedAt: store.verifiedAt,
      record: store.token ? buildVerificationRecord(store.domain, store.token) : null,
      cnameTarget: CUSTOM_DOMAIN_CNAME_TARGET,
    };
  }
}
