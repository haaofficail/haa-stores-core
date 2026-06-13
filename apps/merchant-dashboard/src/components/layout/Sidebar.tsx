import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  LayoutDashboard, Package, Tags, ShoppingCart, Users, Truck, Wallet, TicketPercent, Percent, FileText, ShoppingBag, Download, BarChart3, FileSpreadsheet, Shield, Crown, Bell, Key, ArrowLeftRight, Bot, Palette, Settings, Store, Building2, Tag, ChevronDown, History, Headphones, BookOpen,
} from 'lucide-react';

const navGroups = [
  {
    titleKey: 'sidebar.main',
    title: 'الرئيسية',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard', fallback: 'لوحة التحكم' },
    ],
  },
  {
    titleKey: 'sidebar.operations',
    title: 'التشغيل',
    items: [
      { to: '/products', icon: Package, label: 'nav.products', fallback: 'المنتجات' },
      { to: '/categories', icon: Tags, label: 'nav.categories', fallback: 'التصنيفات' },
      { to: '/brands', icon: Building2, label: 'nav.brands', fallback: 'الماركات' },
      { to: '/tags', icon: Tag, label: 'nav.tags', fallback: 'التاجات' },
      { to: '/orders', icon: ShoppingCart, label: 'nav.orders', fallback: 'الطلبات' },
      { to: '/customers', icon: Users, label: 'nav.customers', fallback: 'العملاء' },
      { to: '/channels', icon: Store, label: 'nav.channels', fallback: 'قنوات البيع' },
    ],
  },
  {
    titleKey: 'sidebar.financial',
    title: 'المالية',
    items: [
      { to: '/shipping', icon: Truck, label: 'nav.shipping', fallback: 'الشحن' },
      { to: '/wallet', icon: Wallet, label: 'nav.wallet', fallback: 'المحفظة' },
      { to: '/coupons', icon: TicketPercent, label: 'nav.coupons', fallback: 'الكوبونات' },
    ],
  },
  {
    titleKey: 'sidebar.marketing',
    title: 'التسويق',
    items: [
      { to: '/promotions', icon: Percent, label: 'nav.promotions', fallback: 'العروض' },
      { to: '/abandoned-carts', icon: ShoppingBag, label: 'nav.abandonedCarts', fallback: 'العربات المتروكة' },
      { to: '/policies', icon: FileText, label: 'nav.policies', fallback: 'الصفحات والسياسات' },
    ],
  },
  {
    titleKey: 'sidebar.analytics',
    title: 'التحليلات',
    items: [
      { to: '/reports', icon: BarChart3, label: 'nav.reports', fallback: 'التقارير' },
      { to: '/exports', icon: Download, label: 'nav.exports', fallback: 'التصدير' },
      { to: '/imports', icon: FileSpreadsheet, label: 'nav.imports', fallback: 'الاستيراد' },
    ],
  },
  {
    titleKey: 'sidebar.support',
    title: 'الدعم',
    items: [
      { to: '/support/tickets', icon: Headphones, label: 'nav.supportTickets', fallback: 'تذاكر الدعم' },
      { to: '/support/kb', icon: BookOpen, label: 'nav.supportKb', fallback: 'قاعدة المعرفة' },
    ],
  },
  {
    titleKey: 'sidebar.settings',
    title: 'الإعدادات',
    items: [
      { to: '/compliance', icon: Shield, label: 'nav.compliance', fallback: 'التحقق والامتثال' },
      { to: '/audit-logs', icon: History, label: 'nav.auditLogs', fallback: 'سجل التغييرات' },
      { to: '/subscriptions', icon: Crown, label: 'nav.subscriptions', fallback: 'الاشتراكات' },
      { to: '/notifications', icon: Bell, label: 'nav.notifications', fallback: 'الإشعارات' },
      { to: '/theme-store', icon: Palette, label: 'nav.themeStore', fallback: 'متجر الثيمات' },
      { to: '/theme', icon: Palette, label: 'nav.themeEditor', fallback: 'تخصيص الثيم' },
      { to: '/settings', icon: Settings, label: 'nav.settings', fallback: 'الإعدادات' },
    ],
  },
  {
    titleKey: 'sidebar.developers',
    title: 'المطورين',
    items: [
      { to: '/api-keys', icon: Key, label: 'nav.apiKeys', fallback: 'مفاتيح API' },
      { to: '/migration', icon: ArrowLeftRight, label: 'nav.migration', fallback: 'الهجرة والتسويق' },
      { to: '/ai-assistant', icon: Bot, label: 'nav.aiAssistant', fallback: 'المساعد الذكي' },
    ],
  },
];

function NavGroup({ titleKey, title, items }: { titleKey: string; title: string; items: Array<{ to: string; icon: any; label: string; fallback: string }> }) {
  const [open, setOpen] = useState(() => localStorage.getItem('sidebar_group_'+title) !== 'false');
  const { t } = useTranslation();

  return (
    <div className="mb-2">
      <button
        onClick={() => { const next = !open; setOpen(next); localStorage.setItem('sidebar_group_'+title, String(next)); }}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
      >
        {t(titleKey, title)}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="space-y-0.5 px-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-neutral-700 hover:bg-white hover:shadow-sm',
                )
              }

            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(item.label, item.fallback)}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  const [isRTL] = useState(() => document.dir === 'rtl');

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'w-64 bg-white/50 backdrop-blur-xl flex flex-col shrink-0 shadow-xl',

        'fixed inset-y-0 z-50 transition-transform duration-300',
        isRTL ? 'left-0' : 'right-0',
        'lg:relative lg:inset-auto lg:z-auto lg:translate-x-0',
        open ? 'translate-x-0' : isRTL ? '-translate-x-full' : 'translate-x-full',
      )}>
      <div className="h-16 px-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/25">
          {t('sidebar.logoLetter', 'ه')}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base text-neutral-900 leading-tight">{t('app.title', 'ها ستورز')}</span>
          <span className="text-xs text-neutral-500 leading-tight">{t('app.subtitle', 'لوحة التحكم')}</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4" aria-label={t('sidebar.navAria', 'التنقل الرئيسي')}>
        {navGroups.map((group) => (
          <NavGroup key={group.titleKey} titleKey={group.titleKey} title={group.title} items={group.items} />
        ))}
      </nav>
      <div className="p-4">
        <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg p-3">
           <p className="text-xs font-semibold text-neutral-700">{t('sidebar.demoLabel', 'ها ديمو')}</p>
           <p className="text-xs text-neutral-500 mt-0.5">{t('sidebar.demoVersion', 'الإصدار التجريبي')}</p>
        </div>
      </div>
    </aside>
    </>
  );
}
