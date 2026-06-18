/**
 * ReadinessChecklist — store setup progress indicator.
 *
 * Extracted from Settings.tsx (T2.4). Shows setup % + per-item checkmarks.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { settingsApi } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
} from "lucide-react";

export function ReadinessChecklist({ storeId }: { storeId: number }) {
  const { t } = useTranslation();
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    settingsApi.readiness(storeId)
      .then(setReadiness)
      .catch(() => toast.error(t('common.error', 'فشل تحميل جاهزية المتجر')))
      .finally(() => setLoading(false));
  }, [storeId, t]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6 space-y-3">
        <Skeleton className="h-6 w-48 rounded-2xl" />
        <Skeleton className="h-4 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!readiness) return null;

  const { percentage, completedCount, totalCount, items } = readiness;
  const isComplete = percentage === 100;

  return (
    <div className={`bg-white/80 backdrop-blur-xl rounded-3xl border shadow-card p-6 ${isComplete ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          )}
          <h3 className="font-bold text-neutral-900">{t('settings.setupChecklist')}</h3>
        </div>
        <div className="text-lg font-bold text-neutral-900">{percentage}%</div>
      </div>

      <div className="w-full bg-neutral-100 rounded-full h-2.5 mb-3">
        <div
          className={`h-2.5 rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-sm text-neutral-400 mb-4">
        {t('settings.readinessProgress', { completed: completedCount, total: totalCount })}
      </p>

      <div className="space-y-2">
        {items.map((item: any) => (
          <div key={item.key} className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-white/50">
            <div className="flex items-center gap-2 text-sm">
              {item.completed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-neutral-300 shrink-0" />
              )}
              <span className={item.completed ? 'text-neutral-400 line-through' : 'text-neutral-900'}>
                {t(item.label)}
              </span>
            </div>
            {!item.completed && item.actionHref && item.actionHref !== '#' && (
              <a href={item.actionHref} className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                {t(item.actionLabel)} <ArrowLeft className="h-3 w-3" />
              </a>
            )}
          </div>
        ))}
      </div>

      {isComplete && (
        <div className="mt-4 p-3 bg-emerald-100 rounded-2xl text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {t('settings.storeReady')}
        </div>
      )}
    </div>
  );
}
