/**
 * payment-rules — orders/payment/wallet flow signals.
 */
import {
  Clock,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Wallet,
} from 'lucide-react';
import type { RuleContext, SmartAlert } from './types.js';

export function paymentRules(ctx: RuleContext): SmartAlert[] {
  const {
    pendingCount,
    summary,
    recentOrders,
    paymentConfig,
    wallet,
    hasOrders,
    t,
    navigate,
  } = ctx;
  const out: SmartAlert[] = [];

  if (pendingCount > 0)
    out.push({
      id: 'pending-orders',
      type: 'warning',
      priority: 2,
      icon: Clock,
      title: t('dashboard.alertPendingOrders', 'طلبات معلقة'),
      description: t(
        'dashboard.alertPendingOrdersDesc',
        '{{count}} طلبات تنتظر التأكيد',
      ).replace('{{count}}', String(pendingCount)),
      action: {
        label: t('orders.viewOrders', 'عرض الطلبات'),
        onClick: () => navigate('/orders'),
      },
    });

  if (summary?.actionCenter?.codCollectionCount > 0)
    out.push({
      id: 'cod-collection',
      type: 'warning',
      priority: 2,
      icon: Wallet,
      title: t('dashboard.alertCodCollection', 'تحصيل الدفع عند الاستلام'),
      description: t(
        'dashboard.alertCodCollectionDesc',
        'يوجد طلبات دفع عند الاستلام تحتاج تسجيل التحصيل',
      ),
      action: {
        label: t('orders.viewOrders', 'عرض الطلبات'),
        onClick: () =>
          navigate(
            '/orders?paymentMethod=cash_on_delivery&paymentStatus=pending',
          ),
      },
    });

  if (recentOrders.some((o: any) => o.status === 'confirmed'))
    out.push({
      id: 'confirmed-orders',
      type: 'info',
      priority: 4,
      icon: CheckCircle2,
      title: t('dashboard.alertConfirmedOrders', 'طلبات مؤكدة'),
      description: t(
        'dashboard.alertConfirmedOrdersDesc',
        'طلبات مؤكدة تحتاج تجهيز للشحن',
      ),
      action: {
        label: t('orders.viewOrders', 'عرض الطلبات'),
        onClick: () => navigate('/orders'),
      },
    });

  if (recentOrders.some((o: any) => Number(o.total) >= 1000))
    out.push({
      id: 'high-value-order',
      type: 'success',
      priority: 4,
      icon: DollarSign,
      title: t('dashboard.alertHighValue', 'طلب بقيمة عالية!'),
      description: t(
        'dashboard.alertHighValueDesc',
        'طلب بقيمة تتجاوز ١,٠٠٠ ر.س',
      ),
      action: {
        label: t('orders.viewOrders', 'عرض'),
        onClick: () => navigate('/orders'),
      },
    });

  if (paymentConfig && !paymentConfig.moyasarConfigured)
    out.push({
      id: 'payment-not-configured',
      type: 'warning',
      priority: 2,
      icon: CreditCard,
      title: t('dashboard.alertPayment', 'بوابة دفع غير مفعلة'),
      description: t(
        'dashboard.alertPaymentDesc',
        'فعّل بوابة الدفع لاستقبال المدفوعات',
      ),
      action: {
        label: t('common.setup', 'الإعداد'),
        onClick: () => navigate('/settings/payment'),
      },
    });

  if (wallet && Number(wallet.balance) === 0 && hasOrders)
    out.push({
      id: 'wallet-empty',
      type: 'warning',
      priority: 2,
      icon: Wallet,
      title: t('dashboard.alertWallet', 'رصيد المحفظة صفر'),
      description: t(
        'dashboard.alertWalletDesc',
        'قد تؤثر الأرصدة المنخفضة على عمليات السحب والتسوية',
      ),
    });

  if (wallet && Number(wallet.balance) > 0 && Number(wallet.balance) < 50)
    out.push({
      id: 'wallet-low',
      type: 'info',
      priority: 4,
      icon: Wallet,
      title: t('dashboard.alertWalletLow', 'رصيد المحفظة منخفض'),
      description: t(
        'dashboard.alertWalletLowDesc',
        'الرصيد الحالي {{balance}} ر.س',
      ).replace('{{balance}}', String(Number(wallet.balance).toFixed(0))),
    });

  return out;
}
