import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { adminApi } from './lib/api';
import { ErrorBoundary } from './ErrorBoundary';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tenants = lazy(() => import('./pages/Tenants'));
const Stores = lazy(() => import('./pages/Stores'));
const KycReview = lazy(() => import('./pages/KycReview'));
const Payments = lazy(() => import('./pages/Payments'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const SettlementBatches = lazy(() => import('./pages/SettlementBatches'));
const SettlementBatchDetail = lazy(() => import('./pages/SettlementBatchDetail'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Plans = lazy(() => import('./pages/Plans'));
const Settings = lazy(() => import('./pages/Settings'));
const StoreBillingSettings = lazy(() => import('./pages/StoreBillingSettings'));

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
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

const navItems = [
  { path: '/', label: 'الرئيسية' },
  { path: '/tenants', label: 'التجار' },
  { path: '/stores', label: 'المتاجر' },
  { path: '/store-billing', label: 'رسوم المتاجر' },
  { path: '/kyc', label: 'التحقق' },
  { path: '/payments', label: 'المدفوعات' },
  { path: '/marketplace', label: 'سوق هاء' },
  { path: '/payments/settlements', label: 'التسويات' },
  { path: '/audit', label: 'سجل التدقيق' },
  { path: '/plans', label: 'الباقات' },
  { path: '/settings', label: 'الإعدادات' },
];

function AdminLayout() {
  const [platform, setPlatform] = useState({ name: 'هاء متاجر', logoUrl: null as string | null });
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {platform.logoUrl && (
            <img src={platform.logoUrl} alt={platform.name} className="h-8 w-8 rounded-lg object-cover" />
          )}
          {!platform.logoUrl && (
            <div className="h-8 w-8 rounded-lg bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
              ه
            </div>
          )}
          <h1 className="text-xl font-bold">لوحة الإدارة — {loading ? '...' : platform.name}</h1>
        </div>
        <nav className="flex items-center gap-1" aria-label="التنقل الرئيسي">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                location.pathname === item.path
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-3 py-1.5">خروج</button>
        </nav>
      </header>
      <main className="p-6">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
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
              <Route path="/" element={<Dashboard />} />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/stores" element={<Stores />} />
              <Route path="/kyc" element={<KycReview />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/payments/settlements" element={<SettlementBatches />} />
              <Route path="/payments/settlements/:batchId" element={<SettlementBatchDetail />} />
              <Route path="/audit" element={<AuditLogs />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/store-billing" element={<StoreBillingSettings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
