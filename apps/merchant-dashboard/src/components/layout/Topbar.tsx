import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Bell, Search, User, Menu } from 'lucide-react';
import { useState } from 'react';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

export function Topbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd+K (macOS) / Ctrl+K (other) opens the search input — a standard
  // power-user shortcut in modern dashboards.
  useKeyboardShortcut({ key: 'k', onTrigger: () => setSearchOpen(true) });

  const pageTitles: Record<string, { title: string; subtitle: string }> = {
    '/dashboard': { title: t('pageTitle.dashboard', 'لوحة التحكم'), subtitle: t('pageTitle.dashboardSub', 'نظرة عامة على متجرك') },
    '/products': { title: t('pageTitle.products', 'المنتجات'), subtitle: t('pageTitle.productsSub', 'إدارة منتجاتك') },
    '/categories': { title: t('pageTitle.categories', 'التصنيفات'), subtitle: t('pageTitle.categoriesSub', 'تنظيم المنتجات') },
    '/orders': { title: t('pageTitle.orders', 'الطلبات'), subtitle: t('pageTitle.ordersSub', 'متابعة وإدارة الطلبات') },
    '/customers': { title: t('pageTitle.customers', 'العملاء'), subtitle: t('pageTitle.customersSub', 'قاعدة عملائك') },
    '/shipping': { title: t('pageTitle.shipping', 'الشحن'), subtitle: t('pageTitle.shippingSub', 'طرق الشحن والمناطق') },
    '/wallet': { title: t('pageTitle.wallet', 'المحفظة'), subtitle: t('pageTitle.walletSub', 'المالية والمدفوعات') },
    '/coupons': { title: t('pageTitle.coupons', 'الكوبونات'), subtitle: t('pageTitle.couponsSub', 'عروض وخصومات') },
    '/promotions': { title: t('pageTitle.promotions', 'العروض'), subtitle: t('pageTitle.promotionsSub', 'حملات ترويجية') },
    '/policies': { title: t('pageTitle.policies', 'الصفحات والسياسات'), subtitle: t('pageTitle.policiesSub', 'معلومات المتجر') },
    '/abandoned-carts': { title: t('pageTitle.abandonedCarts', 'العربات المتروكة'), subtitle: t('pageTitle.abandonedCartsSub', 'استعادة المبيعات') },
    '/exports': { title: t('pageTitle.exports', 'التصدير'), subtitle: t('pageTitle.exportsSub', 'تصدير البيانات') },
    '/reports': { title: t('pageTitle.reports', 'التقارير'), subtitle: t('pageTitle.reportsSub', 'تحليلات وإحصائيات') },
    '/imports': { title: t('pageTitle.imports', 'الاستيراد'), subtitle: t('pageTitle.importsSub', 'استيراد البيانات') },
    '/compliance': { title: t('pageTitle.compliance', 'التحقق والامتثال'), subtitle: t('pageTitle.complianceSub', 'التوثيق القانوني') },
    '/subscriptions': { title: t('pageTitle.subscriptions', 'الاشتراكات'), subtitle: t('pageTitle.subscriptionsSub', 'الخطة والفوترة') },
    '/notifications': { title: t('pageTitle.notifications', 'الإشعارات'), subtitle: t('pageTitle.notificationsSub', 'إعدادات التنبيهات') },
    '/api-keys': { title: t('pageTitle.apiKeys', 'مفاتيح API'), subtitle: t('pageTitle.apiKeysSub', 'تكامل مع أنظمة خارجية') },
    '/migration': { title: t('pageTitle.migration', 'الهجرة والتسويق'), subtitle: t('pageTitle.migrationSub', 'نقل البيانات') },
    '/ai-assistant': { title: t('pageTitle.aiAssistant', 'المساعد الذكي'), subtitle: t('pageTitle.aiAssistantSub', 'مدعوم بالذكاء الاصطناعي') },
    '/settings': { title: t('pageTitle.settings', 'الإعدادات'), subtitle: t('pageTitle.settingsSub', 'إعدادات المتجر') },
    '/theme': { title: t('pageTitle.theme', 'محرر الثيم'), subtitle: t('pageTitle.themeSub', 'تخصيص مظهر المتجر') },
    '/theme-store': { title: t('pageTitle.themeStore', 'متجر الثيمات'), subtitle: t('pageTitle.themeStoreSub', 'تصفح واختر ثيماً لمتجرك') },
  };

  const pageInfo = pageTitles[location.pathname] || { title: t('pageTitle.default', 'متاجر هاء'), subtitle: '' };

  return (
    <header className="h-16 bg-surface-1/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 shadow-sm">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          // Touch target ≥ 44x44 (WCAG 2.5.5). Icon stays 20px; the
          // wrapping button is h-11 w-11 with a visible focus ring.
          <button
            onClick={onToggleSidebar}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 lg:hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
            aria-label={t('topbar.toggleSidebar', 'فتح القائمة الجانبية')}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 leading-tight">{pageInfo.title}</h1>
          {pageInfo.subtitle && (
            <span className="text-sm text-neutral-500 leading-tight">{pageInfo.subtitle}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {searchOpen ? (
          <div className="relative">
            <input
              type="text"
              placeholder={t('topbar.search', 'بحث...')}
              aria-label={t('topbar.search', 'بحث')}
              className="h-10 w-64 rounded-lg border border-neutral-300 bg-surface-1 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm"
              style={{ paddingInlineEnd: '2.5rem' }}
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
            <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" style={{ insetInlineEnd: '0.75rem' }} />
          </div>
        ) : (
          // Touch target ≥ 44x44 (WCAG 2.5.5).
          <button
            onClick={() => setSearchOpen(true)}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
            title={t('topbar.search', 'بحث')}
            aria-label={t('topbar.search', 'بحث')}
          >
            <Search className="h-5 w-5" />
          </button>
        )}

        {/* Notification bell — hit area bumped to 44x44 (WCAG 2.5.5).
            The red dot keeps its position relative to the icon via top-3/start-3. */}
        <button
          className="relative h-11 w-11 inline-flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
          title={t('topbar.notifications', 'الإشعارات')}
          aria-label={t('topbar.notifications', 'الإشعارات')}
          onClick={() => navigate('/notifications')}
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-white" style={{ insetInlineStart: '0.75rem' }} />
        </button>

        <div className="h-8 w-px bg-neutral-200 mx-1" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-primary-500/25">
              <User className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-neutral-900 leading-tight">{user?.name}</span>
              <span className="text-xs text-neutral-500 leading-tight">{t('topbar.merchant', 'تاجر')}</span>
            </div>
          </div>
          {/* Touch target ≥ 44x44 (WCAG 2.5.5). */}
          <button
            onClick={logout}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg text-neutral-500 hover:bg-red-50 hover:text-red-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400"
            title={t('auth.logout', 'تسجيل الخروج')}
            aria-label={t('auth.logout', 'تسجيل الخروج')}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
