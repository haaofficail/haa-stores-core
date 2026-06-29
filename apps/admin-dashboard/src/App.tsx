import { lazy, Suspense, useState, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { adminApi, hasAdminPermission } from './lib/api';
import { ErrorBoundary } from './ErrorBoundary';
import { Icon, type AdminIconName } from './components/ui/icon';
import { UnauthorizedState } from './components/ui/UnauthorizedState';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tenants = lazy(() => import('./pages/Tenants'));
const Stores = lazy(() => import('./pages/Stores'));
const KycReview = lazy(() => import('./pages/KycReview'));
const Payments = lazy(() => import('./pages/Payments'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const SettlementBatches = lazy(() => import('./pages/SettlementBatches'));
const SettlementBatchDetail = lazy(() => import('./pages/SettlementBatchDetail'));
const AccountantInbox = lazy(() => import('./pages/AccountantInbox'));
const AccountantSettlementDetail = lazy(() => import('./pages/AccountantSettlementDetail'));
const FinanceReports = lazy(() => import('./pages/FinanceReports'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Plans = lazy(() => import('./pages/Plans'));
const Settings = lazy(() => import('./pages/Settings'));
const StoreBillingSettings = lazy(() => import('./pages/StoreBillingSettings'));
const Compliance = lazy(() => import('./pages/Compliance'));
const LandingInbox = lazy(() => import('./pages/LandingInbox'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const BankAccounts = lazy(() => import('./pages/BankAccounts'));
const SettlementReadiness = lazy(() => import('./pages/SettlementReadiness'));
const StorePaymentSettings = lazy(() => import('./pages/StorePaymentSettings'));

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
      <div className="bg-white rounded-xl shadow-card p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminGuard() {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

type AdminRoutePermission =
  | 'dashboard:view'
  | 'tenants.read'
  | 'stores.read'
  | 'kyc.read'
  | 'payments.read'
  | 'marketplace.read'
  | 'wallet.payout.view_all'
  | 'audit.read'
  | 'plans.read'
  | 'platform.settings.read'
  | 'billing.platform_fee.read'
  | 'users.read'
  | 'landing_contacts.read';

type NavItem = { path: string; label: string; icon: AdminIconName; permission?: AdminRoutePermission };

type NavGroup = { label: string; items: NavItem[] };

const navItemFromEntry = (entry: string): NavItem => {
  const [path, label, icon, permission] = entry.split('|');
  return {
    path,
    label,
    icon: icon as AdminIconName,
    permission: permission as AdminRoutePermission | undefined,
  };
};

const navGroup = (label: string, entries: string[]): NavGroup => ({
  label,
  items: entries.map(navItemFromEntry),
});

const navGroups: NavGroup[] = [
  navGroup('عام', ['/|الرئيسية|LayoutDashboard|dashboard:view']),
  navGroup('إدارة', [
    '/tenants|التجار|Users|tenants.read',
    '/stores|المتاجر|Store|stores.read',
    '/store-billing|رسوم المتاجر|CreditCard|billing.platform_fee.read',
    '/kyc|التحقق|ShieldCheck|kyc.read',
    '/bank-accounts|الحسابات البنكية|Building2|kyc.read',
    '/settlement-readiness|جاهزية التسوية|CheckSquare|wallet.payout.view_all',
    '/store-payment-settings|إعدادات الدفع|CreditCard|stores.read',
  ]),
  navGroup('مالية', [
    '/finance/settlement-inbox|صندوق التسويات|Inbox|wallet.payout.view_all',
    '/finance/reports|التقارير المالية|BarChart2|wallet.payout.view_all',
    '/payments|المدفوعات|BarChart2|payments.read',
    '/marketplace|سوق هاء|ShoppingBag|marketplace.read',
    '/payments/settlements|التسويات|Landmark|wallet.payout.view_all',
  ]),
  navGroup('نظام', [
    '/admin-users|المستخدمون|UserCog|users.read',
    '/audit|سجل التدقيق|ScrollText|audit.read',
    '/plans|الباقات|Package|plans.read',
    '/compliance|الامتثال|CheckSquare|tenants.read',
    '/landing-inbox|صندوق الوارد|Inbox|landing_contacts.read',
    '/settings|الإعدادات|Settings|platform.settings.read',
  ]),
];

function canAccessAdminRoute(permission?: AdminRoutePermission) {
  return !permission || hasAdminPermission(permission);
}

// Root landing. Full admins see the platform dashboard. Finance-only roles
// (accountant — no dashboard:view) land on their settlement inbox instead of
// an unauthorized screen.
function AdminHome() {
  if (hasAdminPermission('dashboard:view')) return <Dashboard />;
  if (hasAdminPermission('wallet.payout.view_all')) {
    return <Navigate to="/finance/settlement-inbox" replace />;
  }
  return <UnauthorizedState permission="dashboard:view" />;
}

function AdminPermissionRoute({
  permission,
  children,
}: {
  permission: AdminRoutePermission;
  children: ReactNode;
}) {
  if (!canAccessAdminRoute(permission)) {
    return <UnauthorizedState permission={permission} />;
  }
  return <>{children}</>;
}

function SidebarLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
        isActive
          ? 'bg-primary-50 text-primary-700 font-semibold'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon name={item.icon} size="xs" className={isActive ? 'text-primary-600' : 'text-gray-400'} />
      <span>{item.label}</span>
    </Link>
  );
}

function AdminLayout() {
  const [platform, setPlatform] = useState({ name: 'هاء متاجر', logoUrl: null as string | null });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!canAccessAdminRoute('platform.settings.read')) {
      setLoading(false);
      return;
    }
    adminApi.getSettings().then(s => {
      setPlatform({ name: s.name, logoUrl: s.logoUrl });
      if (s.logoUrl) document.documentElement.style.setProperty('--logo-src', `'${s.logoUrl}'`);
      if (s.faviconUrl) {
        const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
          || document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
        if (link) link.href = s.faviconUrl;
        else {
          const el = document.createElement('link');
          el.rel = 'icon';
          el.href = s.faviconUrl;
          document.head.appendChild(el);
        }
      }
      document.title = `لوحة الإدارة — ${s.name}`;
    }).catch(() => toast.error('فشل تحميل إعدادات المنصة')).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
  };

  const visibleNavGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => canAccessAdminRoute(item.permission)),
    }))
    .filter(group => group.items.length > 0);

  const sidebar = (
    <nav className="flex flex-col h-full" aria-label="التنقل الرئيسي">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        {platform.logoUrl ? (
          <img src={platform.logoUrl} alt={platform.name} className="h-8 w-8 rounded-ios-icon object-cover flex-shrink-0" />
        ) : (
          <div className="h-8 w-8 rounded-ios-icon bg-primary-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            ه
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 tracking-tight truncate">
            {loading ? '...' : platform.name}
          </div>
          <div className="text-xs text-gray-400">لوحة الإدارة</div>
        </div>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {visibleNavGroups.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-xs font-semibold text-gray-400 tracking-wide uppercase">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <SidebarLink key={item.path} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 group"
        >
          <Icon name="LogOut" size="xs" className="text-gray-400 group-hover:text-red-500 transition-colors" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-white border-l border-gray-100 fixed inset-y-0 right-0 z-20 shadow-sm">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-64 bg-white shadow-xl flex flex-col lg:hidden transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">القائمة</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="إغلاق القائمة"
          >
            <Icon name="X" size="xs" className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">{sidebar}</div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:mr-56 min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {platform.logoUrl ? (
              <img src={platform.logoUrl} alt={platform.name} className="h-7 w-7 rounded-lg object-cover" />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-primary-600 flex items-center justify-center text-xs font-bold text-white">ه</div>
            )}
            <span className="text-sm font-semibold text-gray-900 tracking-tight">{loading ? '...' : platform.name}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="فتح القائمة"
          >
            <Icon name="Menu" size="xs" className="text-gray-600" />
          </button>
        </header>

        <main className="p-6 max-w-7xl mx-auto">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Toaster position="top-right" richColors dir="rtl" />
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AdminGuard />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<AdminHome />} />
                <Route path="/finance/settlement-inbox" element={<AdminPermissionRoute permission="wallet.payout.view_all"><AccountantInbox /></AdminPermissionRoute>} />
                <Route path="/finance/settlements/:payoutId" element={<AdminPermissionRoute permission="wallet.payout.view_all"><AccountantSettlementDetail /></AdminPermissionRoute>} />
                <Route path="/finance/reports" element={<AdminPermissionRoute permission="wallet.payout.view_all"><FinanceReports /></AdminPermissionRoute>} />
                <Route path="/tenants" element={<AdminPermissionRoute permission="tenants.read"><Tenants /></AdminPermissionRoute>} />
                <Route path="/stores" element={<AdminPermissionRoute permission="stores.read"><Stores /></AdminPermissionRoute>} />
                <Route path="/kyc" element={<AdminPermissionRoute permission="kyc.read"><KycReview /></AdminPermissionRoute>} />
                <Route path="/payments" element={<AdminPermissionRoute permission="payments.read"><Payments /></AdminPermissionRoute>} />
                <Route path="/marketplace" element={<AdminPermissionRoute permission="marketplace.read"><Marketplace /></AdminPermissionRoute>} />
                <Route path="/payments/settlements" element={<AdminPermissionRoute permission="wallet.payout.view_all"><SettlementBatches /></AdminPermissionRoute>} />
                <Route path="/payments/settlements/:batchId" element={<AdminPermissionRoute permission="wallet.payout.view_all"><SettlementBatchDetail /></AdminPermissionRoute>} />
                <Route path="/audit" element={<AdminPermissionRoute permission="audit.read"><AuditLogs /></AdminPermissionRoute>} />
                <Route path="/plans" element={<AdminPermissionRoute permission="plans.read"><Plans /></AdminPermissionRoute>} />
                <Route path="/settings" element={<AdminPermissionRoute permission="platform.settings.read"><Settings /></AdminPermissionRoute>} />
                <Route path="/store-billing" element={<AdminPermissionRoute permission="billing.platform_fee.read"><StoreBillingSettings /></AdminPermissionRoute>} />
                <Route path="/compliance" element={<AdminPermissionRoute permission="tenants.read"><Compliance /></AdminPermissionRoute>} />
                <Route path="/landing-inbox" element={<AdminPermissionRoute permission="landing_contacts.read"><LandingInbox /></AdminPermissionRoute>} />
                <Route path="/admin-users" element={<AdminPermissionRoute permission="users.read"><AdminUsers /></AdminPermissionRoute>} />
                <Route path="/bank-accounts" element={<AdminPermissionRoute permission="kyc.read"><BankAccounts /></AdminPermissionRoute>} />
                <Route path="/settlement-readiness" element={<AdminPermissionRoute permission="wallet.payout.view_all"><SettlementReadiness /></AdminPermissionRoute>} />
                <Route path="/store-payment-settings" element={<AdminPermissionRoute permission="stores.read"><StorePaymentSettings /></AdminPermissionRoute>} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
