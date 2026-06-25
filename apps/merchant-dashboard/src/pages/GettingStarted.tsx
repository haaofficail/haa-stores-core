// Getting-Started — a persistent landing page that surfaces the
// store-readiness checklist outside the Settings page (IA W5).
//
// Pre-fix: the readiness checklist lived only inside `/settings` (one
// of nine tabs). New merchants had no clear "what should I do first?"
// surface — they had to discover the checklist by clicking through to
// Settings. The Apple-grade fix is one canonical onboarding screen
// linked from the sidebar's main group, plus a dismissable banner on
// the Dashboard that points here.
//
// The checklist data itself is unchanged — we reuse the existing
// `ReadinessChecklist` component (single source of truth).

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Store, Package, Truck, CreditCard, BookOpen, MessageCircle } from 'lucide-react';
import { ReadinessChecklist } from './settings/sections/ReadinessChecklist';

interface QuickLinkProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  description: string;
  to: string;
}

function QuickLink({ icon: Icon, iconClass, title, description, to }: QuickLinkProps) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 p-4 rounded-2xl border border-neutral-100 bg-white/50 hover:bg-white hover:border-primary-200 transition-all"
    >
      <div className={`p-2.5 rounded-xl shrink-0 ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ArrowLeft className="h-4 w-4 text-neutral-300 group-hover:text-primary-500 transition-colors shrink-0 mt-2" />
    </Link>
  );
}

export default function GettingStarted() {
  const { t } = useTranslation();
  const { storeId } = useAuth();

  if (!storeId) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary-500" />
          <span className="text-sm font-medium text-primary-600">
            {t('gettingStarted.tagline', 'بدء الاستخدام')}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          {t('gettingStarted.title', 'مرحباً بك في متجرك')}
        </h1>
        <p className="text-neutral-500 text-base mt-2 leading-relaxed max-w-2xl">
          {t(
            'gettingStarted.description',
            'هذه الصفحة دليلك الأول. أكمل العناصر التالية وسيكون متجرك جاهزاً للإطلاق. يمكنك العودة هنا في أي وقت.',
          )}
        </p>
      </div>

      {/* Readiness checklist — single source of truth (reused from Settings). */}
      <ReadinessChecklist storeId={storeId} />

      {/* Quick links — the 4-5 most common first-day tasks. */}
      <div>
        <h2 className="text-lg font-bold text-neutral-900 mb-4">
          {t('gettingStarted.quickLinks.heading', 'مهام البداية الأكثر شيوعاً')}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <QuickLink
            icon={Store}
            iconClass="bg-primary-50 text-primary-600"
            title={t('gettingStarted.quickLinks.brand.title', 'إعدادات المتجر والشعار')}
            description={t(
              'gettingStarted.quickLinks.brand.description',
              'اضبط اسم المتجر، الشعار، الألوان، والروابط الاجتماعية.',
            )}
            to="/settings"
          />
          <QuickLink
            icon={Package}
            iconClass="bg-emerald-50 text-emerald-600"
            title={t('gettingStarted.quickLinks.products.title', 'أضف منتجاتك الأولى')}
            description={t(
              'gettingStarted.quickLinks.products.description',
              'منتج واحد على الأقل قبل النشر. يمكن الاستيراد من Excel/CSV.',
            )}
            to="/catalog/products"
          />
          <QuickLink
            icon={Truck}
            iconClass="bg-amber-50 text-amber-600"
            title={t('gettingStarted.quickLinks.shipping.title', 'فعّل طرق الشحن')}
            description={t(
              'gettingStarted.quickLinks.shipping.description',
              'حدّد المدن المخدومة وأسعار الشحن لكل منطقة.',
            )}
            to="/sales/shipping"
          />
          <QuickLink
            icon={CreditCard}
            iconClass="bg-purple-50 text-purple-600"
            title={t('gettingStarted.quickLinks.payment.title', 'فعّل قبول المدفوعات')}
            description={t(
              'gettingStarted.quickLinks.payment.description',
              'اربط بوابة الدفع — مدى وفيزا وApple Pay عبر Geidea.',
            )}
            to="/settings"
          />
          <QuickLink
            icon={BookOpen}
            iconClass="bg-cyan-50 text-cyan-600"
            title={t('gettingStarted.quickLinks.policies.title', 'صفحات السياسات')}
            description={t(
              'gettingStarted.quickLinks.policies.description',
              'سياسة الإرجاع، سياسة الخصوصية، شروط الاستخدام — مطلوبة قانونياً.',
            )}
            to="/policies"
          />
          <QuickLink
            icon={MessageCircle}
            iconClass="bg-rose-50 text-rose-600"
            title={t('gettingStarted.quickLinks.support.title', 'محتاج مساعدة؟')}
            description={t(
              'gettingStarted.quickLinks.support.description',
              'مركز الدعم وقاعدة المعرفة — جواب لكل سؤال شائع.',
            )}
            to="/support"
          />
        </div>
      </div>
    </div>
  );
}
