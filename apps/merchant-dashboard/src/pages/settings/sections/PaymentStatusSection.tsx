/**
 * PaymentStatusSection — payment gateway status display.
 *
 * Extracted from Settings.tsx (T2.4). Shows:
 *   - Sandbox vs fake mode indicator
 *   - Moyasar configuration status
 *   - Placeholder cards for refund/reconciliation features
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { paymentApi } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Info,
} from "lucide-react";

interface PlaceholderCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
}

function PlaceholderCard({ icon, title, description, href, linkLabel }: PlaceholderCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-400">{icon}</div>
        <div className="flex-1">
          <p className="font-bold text-sm text-neutral-900">{title}</p>
          <p className="text-sm text-neutral-400 mt-1">{description}</p>
          {href && linkLabel && (
            <a href={href} className="inline-flex items-center gap-1 text-sm text-primary-500 hover:underline mt-2">
              {linkLabel} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function PaymentStatusSection() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    paymentApi.status(storeId)
      .then(setStatus)
      .catch(() => toast.error(t('common.error', 'فشل تحميل حالة الدفع')))
      .finally(() => setLoading(false));
  }, [storeId, t]);

  if (loading) return <Skeleton className="h-32 w-full rounded-3xl" />;
  if (!status) return null;

  const { activeProvider, activeMode, moyasarConfigured } = status;

  return (
    <>
      <div className={`bg-white/80 backdrop-blur-xl rounded-3xl border shadow-card p-6 ${activeMode === 'sandbox' ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
        <div className="flex items-start gap-3">
          {activeMode === 'sandbox' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
          ) : (
            <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          )}
          <div className="text-sm">
            <p className="font-bold text-neutral-900">
              {activeMode === 'sandbox'
                ? t('settings.sandboxActive')
                : t('settings.fakePaymentTitle')}
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              {activeMode === 'sandbox'
                ? `${t('settings.activeProvider')}: ${activeProvider} | ${t('settings.mode')}: ${activeMode}`
                : t('settings.fakePaymentDesc')}
            </p>
          </div>
        </div>
      </div>

      {moyasarConfigured && (
        <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-sm text-emerald-800">
              <p className="font-bold">{t('settings.moyasarConfigured')}</p>
              <p className="text-sm mt-1">{t('settings.moyasarSandboxReady')}</p>
            </div>
          </div>
        </div>
      )}

      {!moyasarConfigured && activeMode === 'fake' && (
        <div className="bg-primary-50/50 border border-primary-200/50 rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
            <div className="text-sm text-primary-800">
              <p className="font-bold">{t('settings.sandboxReadyTitle')}</p>
              <p className="text-sm mt-1">{t('settings.sandboxReadyDesc')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-4">
        <PlaceholderCard
          icon={<CreditCard className="h-4 w-4" />}
          title={t('settings.refundSection')}
          description={t('settings.refundSectionDesc')}
        />
        <PlaceholderCard
          icon={<CreditCard className="h-4 w-4" />}
          title={t('settings.reconciliationSection')}
          description={t('settings.reconciliationSectionDesc')}
        />
      </div>
    </>
  );
}
