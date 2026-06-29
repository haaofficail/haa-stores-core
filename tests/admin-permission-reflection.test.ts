import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync(new URL('../apps/admin-dashboard/src/App.tsx', import.meta.url), 'utf-8');
const unauthorizedState = readFileSync(
  new URL('../apps/admin-dashboard/src/components/ui/UnauthorizedState.tsx', import.meta.url),
  'utf-8',
);

describe('Admin dashboard permission reflection', () => {
  it('provides a shared admin UnauthorizedState with actionable Arabic copy', () => {
    expect(unauthorizedState).toContain('export function UnauthorizedState');
    expect(unauthorizedState).toContain('لا تملك صلاحية الوصول');
    expect(unauthorizedState).toContain('permission');
    expect(unauthorizedState).toContain('AlertTriangle');
  });

  it('App reads admin JWT permissions and filters sidebar links by permission', () => {
    expect(app).toContain("import { adminApi, hasAdminPermission } from './lib/api'");
    expect(app).toContain('function canAccessAdminRoute');
    expect(app).toContain('hasAdminPermission(permission)');
    expect(app).toContain('visibleNavGroups');
    expect(app).toContain('group.items.filter(item => canAccessAdminRoute(item.permission))');
  });

  it('direct navigation to protected admin pages renders UnauthorizedState before page data fetches', () => {
    expect(app).toContain('function AdminPermissionRoute');
    expect(app).toContain('<UnauthorizedState permission={permission} />');

    const protectedRoutes: Record<string, string> = {
      // '/' is handled by the role-aware <AdminHome> (asserted separately
      // below): it gates dashboard:view, redirects finance-only roles to the
      // settlement inbox, and falls back to UnauthorizedState.
      '/finance/settlement-inbox': 'wallet.payout.view_all',
      '/tenants': 'tenants.read',
      '/stores': 'stores.read',
      '/kyc': 'kyc.read',
      '/payments': 'payments.read',
      '/marketplace': 'marketplace.read',
      '/bank-accounts': 'kyc.read',
      '/store-billing': 'billing.platform_fee.read',
      '/store-payment-settings': 'stores.read',
      '/settlement-readiness': 'wallet.payout.view_all',
      '/payments/settlements': 'wallet.payout.view_all',
      '/payments/settlements/:batchId': 'wallet.payout.view_all',
      '/audit': 'audit.read',
      '/operations/webhooks': 'webhooks.read',
      '/plans': 'plans.read',
      '/settings': 'platform.settings.read',
      '/compliance': 'tenants.read',
      '/admin-users': 'users.read',
      '/landing-inbox': 'landing_contacts.read',
    };

    for (const [path, permission] of Object.entries(protectedRoutes)) {
      const routePattern = new RegExp(
        `path=["']${path.replace(/\//g, '\\/')}["'][\\s\\S]{0,140}AdminPermissionRoute permission=["']${permission}["']`,
      );
      expect(app, `${path} must be guarded by ${permission}`).toMatch(routePattern);
    }
  });

  it('root landing <AdminHome> is role-aware and still enforces dashboard:view', () => {
    expect(app).toContain('<Route path="/" element={<AdminHome />} />');
    // full admins (dashboard:view) get the dashboard
    expect(app).toMatch(/function AdminHome[\s\S]*?hasAdminPermission\('dashboard:view'\)[\s\S]*?<Dashboard/);
    // finance-only roles (accountant) are redirected to their inbox
    expect(app).toMatch(/hasAdminPermission\('wallet\.payout\.view_all'\)[\s\S]*?Navigate to="\/finance\/settlement-inbox"/);
    // anyone else still hits the unauthorized screen — no silent access
    expect(app).toMatch(/AdminHome[\s\S]*?UnauthorizedState permission="dashboard:view"/);
  });

  it('sidebar metadata uses the same server-side permission keys as route guards', () => {
    const entries = [
      '/|الرئيسية|LayoutDashboard|dashboard:view',
      '/tenants|التجار|Users|tenants.read',
      '/stores|المتاجر|Store|stores.read',
      '/store-billing|رسوم المتاجر|CreditCard|billing.platform_fee.read',
      '/kyc|التحقق|ShieldCheck|kyc.read',
      '/bank-accounts|الحسابات البنكية|Building2|kyc.read',
      '/settlement-readiness|جاهزية التسوية|CheckSquare|wallet.payout.view_all',
      '/store-payment-settings|إعدادات الدفع|CreditCard|stores.read',
      '/payments|المدفوعات|BarChart2|payments.read',
      '/marketplace|سوق هاء|ShoppingBag|marketplace.read',
      '/payments/settlements|التسويات|Landmark|wallet.payout.view_all',
      '/admin-users|المستخدمون|UserCog|users.read',
      '/audit|سجل التدقيق|ScrollText|audit.read',
      '/operations/webhooks|عمليات Webhooks|FileText|webhooks.read',
      '/plans|الباقات|Package|plans.read',
      '/compliance|الامتثال|CheckSquare|tenants.read',
      '/landing-inbox|صندوق الوارد|Inbox|landing_contacts.read',
      '/settings|الإعدادات|Settings|platform.settings.read',
    ];

    for (const entry of entries) {
      expect(app).toContain(entry);
    }
  });

  it('keeps shell branding fetch behind the same settings read permission as the settings page', () => {
    expect(app).toContain("if (!canAccessAdminRoute('platform.settings.read'))");
    expect(app).toContain('setLoading(false)');
    expect(app).toContain('<AdminPermissionRoute permission="platform.settings.read"><Settings /></AdminPermissionRoute>');
  });
});
