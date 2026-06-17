import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../lib/api';
import './Compliance.css';

type TenantCompliance = {
  id: number;
  name: string;
  slug: string;
  // G1 — Commercial Registration
  commercialRegistrationNumber: string | null;
  commercialRegistrationIssuedAt: string | null;
  // G2 — VAT
  vatNumber: string | null;
  vatRegisteredAt: string | null;
  // G3 — E-commerce License
  ecommerceLicenseNumber: string | null;
  ecommerceLicenseIssuedAt: string | null;
  ecommerceLicenseExpiresAt: string | null;
  // G4 — DPO
  dpoEmail: string | null;
  dpoPhone: string | null;
  dpoAppointedAt: string | null;
  // G5 — Trademark
  trademarkNumber: string | null;
  trademarkRegisteredAt: string | null;
  trademarkExpiresAt: string | null;
  // G6 — PCI-DSS ASV
  asvLastScanAt: string | null;
  asvVendor: string | null;
  asvCertificateUrl: string | null;
  // G7 — Pen-test
  pentestLastScanAt: string | null;
  pentestVendor: string | null;
  pentestReportUrl: string | null;
  pentestPass: boolean | null;
  // G8 — Hosting
  hostingRegion: string | null;
  hostingProvider: string | null;
  hostingKsaResidency: boolean;
  // G9 — Tabby DPA
  tabbyDpaSignedAt: string | null;
  tabbyDpaUrl: string | null;
  // G10 — DR Plan
  drPlanDocumentedAt: string | null;
  drLastTabletopAt: string | null;
  drNextTabletopAt: string | null;
};

type ItemKey = keyof TenantCompliance;

interface ComplianceItem {
  key: ItemKey;
  code: string;
  title: string;
  titleAr: string;
  group: 'registrations' | 'people' | 'security' | 'infrastructure';
  description: string;
  brief: string;
}

const ITEMS: ComplianceItem[] = [
  // Registrations
  { key: 'commercialRegistrationNumber', code: 'G1', title: 'Commercial Registration (CR)', titleAr: 'السجل التجاري', group: 'registrations', description: 'MoCI registration certificate', brief: 'docs/ops/OWNER_ACTION_G1_CR.md' },
  { key: 'vatNumber', code: 'G2', title: 'VAT Registration', titleAr: 'التسجيل في ضريبة القيمة المضافة', group: 'registrations', description: 'ZATCA VAT certificate', brief: 'docs/ops/OWNER_ACTION_G2_VAT.md' },
  { key: 'ecommerceLicenseNumber', code: 'G3', title: 'E-Commerce License', titleAr: 'رخصة التجارة الإلكترونية', group: 'registrations', description: 'MoCI e-commerce license', brief: 'docs/ops/OWNER_ACTION_G3_ECOMMERCE_LICENSE.md' },
  { key: 'trademarkNumber', code: 'G5', title: 'Trademark Registration', titleAr: 'تسجيل العلامة التجارية', group: 'registrations', description: 'SAIP trademark certificate', brief: 'docs/ops/OWNER_ACTION_G5_TRADEMARK.md' },
  // People
  { key: 'dpoEmail', code: 'G4', title: 'Data Protection Officer (DPO)', titleAr: 'مسؤول حماية البيانات', group: 'people', description: 'PDPL Article 22 — appointed DPO', brief: 'docs/ops/OWNER_ACTION_G4_DPO.md' },
  // Security
  { key: 'asvCertificateUrl', code: 'G6', title: 'PCI-DSS ASV Scan', titleAr: 'فحص PCI-DSS الربع سنوي', group: 'security', description: 'Approved Scanning Vendor quarterly scan', brief: 'docs/ops/OWNER_ACTION_G6_PCI_ASV.md' },
  { key: 'pentestReportUrl', code: 'G7', title: 'Penetration Test', titleAr: 'اختبار الاختراق', group: 'security', description: 'CREST-certified pen-test (annual)', brief: 'docs/ops/OWNER_ACTION_G7_PENTEST.md' },
  { key: 'tabbyDpaUrl', code: 'G9', title: 'Tabby Data Processing Agreement', titleAr: 'اتفاقية معالجة بيانات تابي', group: 'security', description: 'UAE cross-border data processing contract', brief: 'docs/ops/OWNER_ACTION_G9_TABBY_DPA.md' },
  // Infrastructure
  { key: 'hostingRegion', code: 'G8', title: 'KSA Hosting Decision', titleAr: 'قرار الاستضافة داخل السعودية', group: 'infrastructure', description: 'Region residency for data sovereignty', brief: 'docs/ops/OWNER_ACTION_G8_KSA_HOSTING.md' },
  { key: 'drPlanDocumentedAt', code: 'G10', title: 'Disaster Recovery Plan', titleAr: 'خطة التعافي من الكوارث', group: 'infrastructure', description: 'NCA-required DR plan + annual tabletop', brief: 'docs/ops/OWNER_ACTION_G10_DR_PLAN.md' },
];

const GROUP_LABELS: Record<ComplianceItem['group'], string> = {
  registrations: 'التسجيلات الحكومية',
  people: 'الأشخاص المعينون',
  security: 'الأمن والاختبارات',
  infrastructure: 'البنية التحتية',
};

const GROUP_ORDER: ComplianceItem['group'][] = ['registrations', 'people', 'security', 'infrastructure'];

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'boolean') return value;
  return true;
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isExpiringSoon(dateStr: string | null, daysAhead = 30): boolean {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return diff > 0 && diff < daysAhead * 24 * 60 * 60 * 1000;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}

export default function Compliance() {
  const [tenants, setTenants] = useState<TenantCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getTenants()
      .then((data: unknown) => {
        setTenants(data as TenantCompliance[]);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load tenants');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>الامتثال — Compliance</h1>
          <p className="page-sub">جاري التحميل…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>الامتثال — Compliance</h1>
          <p className="page-sub" style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      </div>
    );
  }

  // Compute aggregate stats across all tenants
  const totalSlots = tenants.length * ITEMS.length;
  let filledSlots = 0;
  let expiredCount = 0;
  let expiringSoonCount = 0;
  for (const t of tenants) {
    for (const item of ITEMS) {
      const v = t[item.key];
      if (isFilled(v)) filledSlots++;
      // Check expiry on date-stamped items
      if (item.key === 'ecommerceLicenseExpiresAt' || item.key === 'trademarkExpiresAt') {
        if (isExpired(v as string | null)) expiredCount++;
        else if (isExpiringSoon(v as string | null)) expiringSoonCount++;
      }
    }
  }

  const overallPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1>الامتثال — Compliance</h1>
        <p className="page-sub">
          G1-G10 owner action items (TASK-0038). Data sourced from the <code>tenants</code> table (migration 0061).
        </p>
      </div>

      {/* Summary banner */}
      <div className="compliance-summary">
        <div className="summary-stat">
          <div className="summary-value">{tenants.length}</div>
          <div className="summary-label">المتاجر</div>
        </div>
        <div className="summary-stat">
          <div className="summary-value" style={{ color: 'var(--primary)' }}>{filledSlots}</div>
          <div className="summary-label">من {totalSlots} بند مكتمل</div>
        </div>
        <div className="summary-stat">
          <div className="summary-value" style={{ color: overallPct >= 80 ? 'var(--primary)' : overallPct >= 50 ? 'var(--warn)' : 'var(--danger)' }}>
            {overallPct}%
          </div>
          <div className="summary-label">مستوى الامتثال الكلي</div>
        </div>
        {expiredCount > 0 && (
          <div className="summary-stat alert">
            <div className="summary-value" style={{ color: 'var(--danger)' }}>{expiredCount}</div>
            <div className="summary-label">شهادات منتهية!</div>
          </div>
        )}
        {expiringSoonCount > 0 && (
          <div className="summary-stat warn">
            <div className="summary-value" style={{ color: 'var(--warn)' }}>{expiringSoonCount}</div>
            <div className="summary-label">تنتهي خلال 30 يوم</div>
          </div>
        )}
      </div>

      {tenants.length === 0 ? (
        <div className="empty-state">
          <p>لا توجد متاجر. أضف متجر أولاً من <Link to="/tenants">صفحة المتاجر</Link>.</p>
        </div>
      ) : (
        tenants.map((tenant) => {
          // Compute per-tenant stats
          let tenantFilled = 0;
          for (const item of ITEMS) {
            if (isFilled(tenant[item.key])) tenantFilled++;
          }
          const tenantPct = Math.round((tenantFilled / ITEMS.length) * 100);

          return (
            <div key={tenant.id} className="tenant-compliance">
              <div className="tenant-compliance-header">
                <div>
                  <h2>{tenant.name}</h2>
                  <p className="tenant-slug mono">/{tenant.slug}</p>
                </div>
                <div className="tenant-compliance-stat">
                  <div className="tenant-compliance-pct" style={{
                    color: tenantPct >= 80 ? 'var(--primary)' : tenantPct >= 50 ? 'var(--warn)' : 'var(--danger)',
                  }}>
                    {tenantPct}%
                  </div>
                  <div className="tenant-compliance-count">
                    {tenantFilled} من {ITEMS.length} بند
                  </div>
                </div>
              </div>

              {GROUP_ORDER.map((group) => {
                const groupItems = ITEMS.filter((i) => i.group === group);
                return (
                  <div key={group} className="compliance-group">
                    <h3 className="compliance-group-title">{GROUP_LABELS[group]}</h3>
                    <div className="compliance-items">
                      {groupItems.map((item) => {
                        const value = tenant[item.key];
                        const filled = isFilled(value);
                        const expired = item.key === 'ecommerceLicenseExpiresAt' || item.key === 'trademarkExpiresAt'
                          ? isExpired(value as string | null)
                          : false;
                        const expiringSoon = item.key === 'ecommerceLicenseExpiresAt' || item.key === 'trademarkExpiresAt'
                          ? isExpiringSoon(value as string | null)
                          : false;

                        let status: 'done' | 'pending' | 'expired' | 'expiring' = filled ? 'done' : 'pending';
                        if (filled && expired) status = 'expired';
                        else if (filled && expiringSoon) status = 'expiring';

                        return (
                          <div key={item.key} className={`compliance-item status-${status}`}>
                            <div className="compliance-item-header">
                              <span className="compliance-code">{item.code}</span>
                              <span className="compliance-title">
                                <span className="compliance-title-ar">{item.titleAr}</span>
                                <span className="compliance-title-en">{item.title}</span>
                              </span>
                              <span className={`compliance-pill pill-${status}`}>
                                {status === 'done' && '✓ مكتمل'}
                                {status === 'pending' && '○ معلق'}
                                {status === 'expired' && '⚠ منتهي'}
                                {status === 'expiring' && '⏰ ينتهي قريباً'}
                              </span>
                            </div>
                            <div className="compliance-item-value">
                              {status === 'done' ? (
                                <>
                                  {typeof value === 'boolean' ? (
                                    <span>{value ? 'نعم' : 'لا'}</span>
                                  ) : (
                                    <span className="mono">{formatDate(value as string | null)}</span>
                                  )}
                                </>
                              ) : (
                                <span className="muted">غير مكتمل</span>
                              )}
                            </div>
                            <div className="compliance-item-footer">
                              <span className="muted">{item.description}</span>
                              <span className="mono muted">{item.brief}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}
