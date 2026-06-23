/**
 * compliance-rules — subscription, taxes, domain, SSL, bank, KYC.
 */
import {
  Building,
  CheckCircle2,
  Crown,
  FileText,
  Globe,
  Percent,
  Shield,
} from 'lucide-react';
import type { RuleContext, SmartAlert } from './types.js';

export function complianceRules(ctx: RuleContext): SmartAlert[] {
  const {
    liveSubDays: subDays,
    subscription,
    readiness,
    storeSettings,
    bankAccount,
    hasOrders,
    complianceStatus,
    t,
    navigate,
  } = ctx;
  const out: SmartAlert[] = [];

  // ---- Subscription ----
  if (subDays > 0 && subDays <= 7)
    out.push({
      id: 'subscription-expiring',
      type: 'danger',
      priority: 1,
      icon: Crown,
      title: t('dashboard.alertSubscription', 'الاشتراك على وشك الانتهاء'),
      description: t(
        'dashboard.alertSubscriptionDesc',
        'باقي {{count}} أيام على انتهاء الاشتراك',
      ).replace('{{count}}', String(subDays)),
      action: {
        label: t('common.renew', 'تجديد'),
        onClick: () => navigate('/settings/subscription'),
      },
    });
  if (subDays > 7 && subDays <= 14)
    out.push({
      id: 'subscription-soon',
      type: 'warning',
      priority: 3,
      icon: Crown,
      title: t('dashboard.alertSubscriptionSoon', 'اقتراب انتهاء الاشتراك'),
      description: t(
        'dashboard.alertSubscriptionSoonDesc',
        'باقي {{count}} أيام - جدّد اشتراكك مبكراً',
      ).replace('{{count}}', String(subDays)),
      action: {
        label: t('common.renew', 'تجديد'),
        onClick: () => navigate('/settings/subscription'),
      },
    });
  if (subscription?.status === 'trialing')
    out.push({
      id: 'subscription-trialing',
      type: 'info',
      priority: 3,
      icon: Crown,
      title: t('dashboard.alertTrialing', 'الفترة التجريبية'),
      description: t(
        'dashboard.alertTrialingDesc',
        'باقي {{count}} يوم - جرّب كل الميزات',
      ).replace('{{count}}', String(subDays)),
      action: {
        label: t('common.viewPlans', 'عرض الباقات'),
        onClick: () => navigate('/settings/subscription'),
      },
    });
  if (subscription?.status === 'past_due')
    out.push({
      id: 'subscription-past-due',
      type: 'danger',
      priority: 1,
      icon: Crown,
      title: t('dashboard.alertSubscriptionPastDue', 'الاشتراك متأخر'),
      description: t(
        'dashboard.alertSubscriptionPastDueDesc',
        'رجاءً سدّد قيمة الاشتراك لتجنب الإيقاف',
      ),
      action: {
        label: t('common.payNow', 'الدفع الآن'),
        onClick: () => navigate('/settings/subscription'),
      },
    });
  if (subscription?.status === 'cancelled')
    out.push({
      id: 'subscription-cancelled',
      type: 'danger',
      priority: 1,
      icon: Crown,
      title: t('dashboard.alertCancelled', 'الاشتراك ملغي'),
      description: t(
        'dashboard.alertCancelledDesc',
        'اشتراكك ملغي - جرّب باقة جديدة',
      ),
      action: {
        label: t('common.viewPlans', 'عرض الباقات'),
        onClick: () => navigate('/settings/subscription'),
      },
    });

  // ---- Store readiness ----
  if (readiness && readiness.percentage < 100 && readiness.percentage > 0)
    out.push({
      id: 'store-readiness',
      type: 'info',
      priority: 3,
      icon: CheckCircle2,
      title: t('dashboard.alertReadiness', 'المتجر غير مكتمل'),
      description: t(
        'dashboard.alertReadinessDesc',
        'اكتمال {{pct}}% - أضف {{missing}} لتحسين متجرك',
      )
        .replace('{{pct}}', String(readiness.percentage))
        .replace(
          '{{missing}}',
          String(
            readiness.items?.filter((i: any) => !i.completed).length ?? 0,
          ),
        ),
      action: {
        label: t('common.setup', 'الإعداد'),
        onClick: () => navigate('/settings'),
      },
    });

  // ---- Store settings (tax/domain/SSL) ----
  if (storeSettings) {
    if (!storeSettings.taxNumber)
      out.push({
        id: 'tax-not-configured',
        type: 'warning',
        priority: 3,
        icon: Percent,
        title: t('dashboard.alertTax', 'الضرائب غير مهيأة'),
        description: t(
          'dashboard.alertTaxDesc',
          'أضف الرقم الضريبي لإصدار فواتير ضريبية',
        ),
        action: {
          label: t('common.setup', 'الإعداد'),
          onClick: () => navigate('/settings'),
        },
      });
    if (!storeSettings.customDomain)
      out.push({
        id: 'custom-domain',
        type: 'info',
        priority: 4,
        icon: Globe,
        title: t('dashboard.alertDomain', 'نطاق مخصص غير مضبوط'),
        description: t(
          'dashboard.alertDomainDesc',
          'اربط نطاقك الخاص لمتجر احترافي',
        ),
        action: {
          label: t('common.setup', 'الإعداد'),
          onClick: () => navigate('/settings/domain'),
        },
      });
    if (storeSettings.sslExpiry) {
      const sslDays = Math.ceil(
        (new Date(storeSettings.sslExpiry).getTime() - Date.now()) / 86400000,
      );
      if (sslDays > 0 && sslDays <= 30)
        out.push({
          id: 'ssl-expiring',
          type: 'danger',
          priority: 1,
          icon: Shield,
          title: t('dashboard.alertSSL', 'شهادة SSL على وشك الانتهاء'),
          description: t(
            'dashboard.alertSSLDesc',
            'باقي {{count}} أيام - جدد شهادة الأمان',
          ).replace('{{count}}', String(sslDays)),
          action: {
            label: t('common.renew', 'تجديد'),
            onClick: () => navigate('/settings/domain'),
          },
        });
    }
    if (storeSettings.customDomain && storeSettings.domainStatus === 'error')
      out.push({
        id: 'domain-mismatch',
        type: 'warning',
        priority: 3,
        icon: Globe,
        title: t('dashboard.alertDomainMismatch', 'النطاق المخصص غير شغال'),
        description: t(
          'dashboard.alertDomainMismatchDesc',
          'راجع إعدادات DNS',
        ),
        action: {
          label: t('common.setup', 'الإعداد'),
          onClick: () => navigate('/settings/domain'),
        },
      });
  }

  // ---- Bank + KYC ----
  if (!bankAccount && hasOrders)
    out.push({
      id: 'no-bank-account',
      type: 'info',
      priority: 3,
      icon: Building,
      title: t('dashboard.alertBankAccount', 'حساب بنكي غير مضاف'),
      description: t(
        'dashboard.alertBankAccountDesc',
        'أضف حساب بنكي لاستلام التسويات',
      ),
      action: {
        label: t('common.setup', 'الإعداد'),
        onClick: () => navigate('/settings/compliance'),
      },
    });

  if (complianceStatus && !complianceStatus.isComplete)
    out.push({
      id: 'compliance-incomplete',
      type: 'warning',
      priority: 2,
      icon: FileText,
      title: t('dashboard.alertCompliance', 'بيانات الامتثال غير مكتملة'),
      description: t(
        'dashboard.alertComplianceDesc',
        'أكمل بيانات الامتثال لتجنب إيقاف الحساب',
      ),
      action: {
        label: t('common.setup', 'الإعداد'),
        onClick: () => navigate('/settings/compliance'),
      },
    });

  return out;
}
