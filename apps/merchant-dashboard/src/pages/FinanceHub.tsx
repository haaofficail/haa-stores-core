// Finance Hub — overview landing page for /finance (IA W2).
//
// One screen for all merchant money flows: wallet, settlements,
// subscription, ZATCA compliance.

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Wallet, Banknote, Crown, Shield, Coins } from 'lucide-react';
import { walletApi, subscriptionApi, complianceApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { HubHeader, MetricGrid, MetricTile, HubCard } from '@/components/hub/HubShell';

interface FinanceCounts {
  netBalance: string | null;
  pendingPayouts: number | null;
  planName: string | null;
  complianceStatus: string | null;
}

export default function FinanceHub() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<FinanceCounts>({
    netBalance: null,
    pendingPayouts: null,
    planName: null,
    complianceStatus: null,
  });

  const load = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    Promise.allSettled([
      walletApi.summary(storeId),
      walletApi.payouts(storeId),
      subscriptionApi.getCurrent(storeId),
      complianceApi.getStatus(storeId),
    ]).then(([summary, payouts, sub, compliance]) => {
      setCounts({
        netBalance:
          summary.status === 'fulfilled'
            ? (summary.value as { netBalance?: string })?.netBalance ?? '0'
            : null,
        pendingPayouts:
          payouts.status === 'fulfilled' && Array.isArray(payouts.value)
            ? (payouts.value as Array<{ status: string }>).filter(
                (p) => p.status === 'requested' || p.status === 'under_review',
              ).length
            : null,
        planName:
          sub.status === 'fulfilled'
            ? (sub.value as { planName?: string })?.planName ?? null
            : null,
        complianceStatus:
          compliance.status === 'fulfilled'
            ? (compliance.value as { status?: string })?.status ?? 'pending'
            : null,
      });
    }).finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const complianceLabel = (status: string | null) => {
    if (status === 'approved') return t('finance.hub.kpi.complianceApproved', 'مفعّل');
    if (status === 'pending') return t('finance.hub.kpi.compliancePending', 'قيد المراجعة');
    if (status === 'rejected') return t('finance.hub.kpi.complianceRejected', 'مرفوض');
    return status;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <HubHeader
        tagIcon={<Coins className="h-5 w-5 text-primary-500" />}
        tagLabel={t('finance.hub.tagline', 'مركز المالية')}
        title={t('finance.hub.title', 'كل ما يخص أموال متجرك')}
        description={t(
          'finance.hub.description',
          'المحفظة، التسويات، الاشتراك، والتحقق الضريبي — في مكان واحد. مدفوعات المتجر تُعالج وتُسوّى من هنا.',
        )}
      />

      <MetricGrid loading={loading}>
        <MetricTile
          label={t('finance.hub.kpi.netBalance', 'صافي المحفظة')}
          value={counts.netBalance ? `${formatCurrency(counts.netBalance)} ر.س` : null}
        />
        <MetricTile
          label={t('finance.hub.kpi.pendingPayouts', 'طلبات تسوية معلّقة')}
          value={counts.pendingPayouts}
        />
        <MetricTile
          label={t('finance.hub.kpi.currentPlan', 'الخطة الحالية')}
          value={counts.planName}
        />
        <MetricTile
          label={t('finance.hub.kpi.compliance', 'حالة التحقق')}
          value={complianceLabel(counts.complianceStatus)}
        />
      </MetricGrid>

      <div>
        <h2 className="text-lg font-bold text-neutral-900 mb-4">
          {t('finance.hub.tools.heading', 'الأدوات المالية')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <HubCard
            icon={Wallet}
            iconClass="bg-primary-50 text-primary-600"
            title={t('finance.hub.tools.wallet.title', 'المحفظة')}
            description={t(
              'finance.hub.tools.wallet.description',
              'الرصيد والمعاملات — كل قيود الإيرادات والخصومات والرسوم.',
            )}
            to="/finance/wallet"
            cta={t('finance.hub.tools.wallet.cta', 'فتح المحفظة')}
          />
          <HubCard
            icon={Banknote}
            iconClass="bg-emerald-50 text-emerald-600"
            title={t('finance.hub.tools.settlements.title', 'التسويات')}
            description={t(
              'finance.hub.tools.settlements.description',
              'طلبات صرف الرصيد إلى حسابك البنكي وحالة كل تحويل.',
            )}
            to="/finance/settlements"
            cta={t('finance.hub.tools.settlements.cta', 'عرض التسويات')}
          />
          <HubCard
            icon={Crown}
            iconClass="bg-amber-50 text-amber-600"
            title={t('finance.hub.tools.subscription.title', 'الاشتراك والفواتير')}
            description={t(
              'finance.hub.tools.subscription.description',
              'خطتك الحالية، تاريخ الفواتير، والترقية أو التخفيض.',
            )}
            to="/finance/subscriptions"
            cta={t('finance.hub.tools.subscription.cta', 'إدارة الاشتراك')}
          />
          <HubCard
            icon={Shield}
            iconClass="bg-cyan-50 text-cyan-600"
            title={t('finance.hub.tools.compliance.title', 'التحقق والامتثال')}
            description={t(
              'finance.hub.tools.compliance.description',
              'السجل التجاري، الرقم الضريبي، وحساب البنك — متطلبات الإطلاق وZATCA.',
            )}
            to="/finance/compliance"
            cta={t('finance.hub.tools.compliance.cta', 'فتح التحقق')}
          />
        </div>
      </div>
    </div>
  );
}
