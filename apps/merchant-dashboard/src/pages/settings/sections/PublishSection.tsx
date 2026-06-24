/**
 * PublishSection — store publish/unpublish controls.
 *
 * Extracted from Settings.tsx (T2.4). Manages:
 *   - publish status (draft / review / published / restricted / suspended)
 *   - publish/unpublish handlers
 *   - merchant acknowledgement dialog
 *   - compliance checklist gating + per-item drill-down
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { publishApi, complianceApi, acknowledgementApi, ApiClientError } from "@/lib/api";
import { PermissionGate } from "@/lib/permissions";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, CheckCircle2, XCircle, RefreshCw, ChevronDown } from "lucide-react";

const PUBLISH_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'مسودة', color: 'text-neutral-700', bg: 'bg-neutral-100' },
  review: { label: 'قيد المراجعة', color: 'text-primary-700', bg: 'bg-primary-100' },
  published: { label: 'منشور', color: 'text-green-700', bg: 'bg-green-100' },
  restricted: { label: 'مقيّد', color: 'text-orange-700', bg: 'bg-orange-100' },
  suspended: { label: 'موقوف', color: 'text-red-700', bg: 'bg-red-100' },
};

// ---------- Checklist drill-down primitives ----------

type ChecklistItem = {
  key: string;
  label: string;
  passed: boolean;
  required: boolean;
  source: string;
  severity: string;
  message: string;
};

type ChecklistData = {
  passed: boolean;
  items: ChecklistItem[];
  blockingErrorsCount: number;
  warningsCount: number;
  checkedAt: string;
};

// Source → Arabic group header. Order is intentional (most important first).
const SOURCE_GROUPS: Array<{ source: string; label: string }> = [
  { source: 'kyc', label: 'البيانات القانونية' },
  { source: 'store', label: 'بيانات المتجر' },
  { source: 'policies', label: 'السياسات' },
  { source: 'payment', label: 'طرق الدفع' },
  { source: 'shipping', label: 'الشحن' },
  { source: 'settings', label: 'إعدادات الاسترجاع' },
];

// Source → fix-link target. The dashboard doesn't have nested /settings/<tab>
// sub-routes (Settings.tsx is a single page with internal tabs), so we route to
// the closest top-level page or fall back to /settings.
function fixLinkForSource(source: string): string {
  switch (source) {
    case 'kyc': return '/compliance';
    case 'policies': return '/policies';
    case 'shipping': return '/shipping';
    case 'store':
    case 'payment':
    case 'settings':
    default:
      return '/settings';
  }
}

function ChecklistItemRow({ item }: { item: ChecklistItem }) {
  // Icon selection follows the spec:
  //   passed → CheckCircle2 (green)
  //   !passed && severity === 'error' → XCircle (red)
  //   !passed && severity === 'warning' → AlertTriangle (amber)
  let icon;
  if (item.passed) {
    icon = <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />;
  } else if (item.severity === 'error') {
    icon = <XCircle className="h-4 w-4 text-red-600 shrink-0" aria-hidden />;
  } else {
    icon = <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />;
  }

  return (
    <li className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-neutral-50">
      <div className="pt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-900">{item.label}</div>
        <div className="text-xs text-neutral-500 mt-0.5">{item.message}</div>
      </div>
      {!item.passed && (
        <Link
          to={fixLinkForSource(item.source)}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline shrink-0 self-center"
        >
          اذهب لإصلاحه
        </Link>
      )}
    </li>
  );
}

function ChecklistDrillDown({
  checklist,
  onRefresh,
  refreshing,
}: {
  checklist: ChecklistData;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const passedCount = checklist.items.filter(i => i.passed).length;
  const totalCount = checklist.items.length;

  // Build groups in canonical order, drop empty groups.
  const groups = SOURCE_GROUPS
    .map(g => ({
      ...g,
      items: checklist.items.filter(i => i.source === g.source),
    }))
    .filter(g => g.items.length > 0);

  if (checklist.passed) {
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-neutral-600">{passedCount} من {totalCount} جاهز</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
            aria-label="تحديث قائمة الفحص"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden />
          <span className="text-sm font-medium text-emerald-700">كل المتطلبات مكتملة</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-neutral-600">{passedCount} من {totalCount} جاهز</span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
          aria-label="تحديث قائمة الفحص"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>
      <div className="space-y-2">
        {groups.map(group => {
          const hasFailing = group.items.some(i => !i.passed);
          const groupPassed = group.items.filter(i => i.passed).length;
          const groupTotal = group.items.length;
          return (
            <details
              key={group.source}
              open={hasFailing}
              className="group border border-neutral-200 rounded-xl bg-white overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">
                <div className="flex items-center gap-2 min-w-0">
                  {hasFailing ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
                  )}
                  <span className="text-sm font-semibold text-neutral-900 truncate">{group.label}</span>
                  <span className="text-xs text-neutral-500 shrink-0">({groupPassed}/{groupTotal})</span>
                </div>
                <ChevronDown className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180 shrink-0" aria-hidden />
              </summary>
              <ul className="border-t border-neutral-100 px-2 py-1 divide-y divide-neutral-100">
                {group.items.map(item => (
                  <ChecklistItemRow key={item.key} item={item} />
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Main section ----------

export function PublishSection({ storeId }: { storeId: number | null }) {
  const { t } = useTranslation();
  const [publishStatus, setPublishStatus] = useState<string>('draft');
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [acknowledgement, setAcknowledgement] = useState<{ acknowledged: boolean; missingItems: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showAckDialog, setShowAckDialog] = useState(false);
  const [ackCheckboxes, setAckCheckboxes] = useState<Record<string, boolean>>({});
  const [ackSubmitting, setAckSubmitting] = useState(false);
  const [ackRequired, setAckRequired] = useState<{ requiredItems: Array<{ key: string; label: string }>; requiredCheckboxes: Array<{ key: string; label: string }> } | null>(null);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setRefreshing(true);
    try {
      const [statusData, checklistData, ackData] = await Promise.allSettled([
        publishApi.getPublishStatus(storeId),
        complianceApi.getChecklist(storeId),
        acknowledgementApi.getStatus(storeId),
      ]);
      if (statusData.status === 'fulfilled') setPublishStatus(statusData.value.publishStatus);
      if (checklistData.status === 'fulfilled') setChecklist(checklistData.value as ChecklistData);
      if (ackData.status === 'fulfilled') setAcknowledgement(ackData.value);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePublish = async () => {
    if (!storeId) return;
    setPublishing(true);
    try {
      const result = await publishApi.publish(storeId);
      setPublishStatus(result.publishStatus);
      toast.success('تم نشر المتجر بنجاح');
      loadData();
    } catch (err: unknown) {
      const data = (err as { data?: { error?: { code?: string }; data?: { checklist?: ChecklistData } } })?.data;
      if (data?.error?.code === 'STORE_COMPLIANCE_INCOMPLETE') {
        toast.error('الامتثال غير مكتمل — لا يمكن النشر');
        if (data?.data?.checklist) setChecklist(data.data.checklist);
      } else if (data?.error?.code === 'MERCHANT_ACKNOWLEDGEMENT_REQUIRED') {
        toast.error('الإقرار مطلوب قبل النشر');
        openAckDialog();
      } else {
        toast.error(err instanceof ApiClientError ? err.message : 'فشل النشر');
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!storeId) return;
    setPublishing(true);
    try {
      const result = await publishApi.unpublish(storeId);
      setPublishStatus(result.publishStatus);
      toast.success('تم إلغاء النشر');
      loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'فشل إلغاء النشر');
    } finally {
      setPublishing(false);
    }
  };

  const openAckDialog = async () => {
    if (!storeId) return;
    try {
      const items = await acknowledgementApi.getRequiredItems(storeId);
      setAckRequired(items);
      const initial: Record<string, boolean> = {};
      for (const item of items.requiredCheckboxes) initial[item.key] = false;
      for (const item of items.requiredItems) initial[item.key] = false;
      setAckCheckboxes(initial);
      setShowAckDialog(true);
    } catch {
      toast.error('فشل تحميل متطلبات الإقرار');
    }
  };

  const handleAcknowledge = async () => {
    if (!storeId) return;
    setAckSubmitting(true);
    try {
      await acknowledgementApi.acknowledge(storeId, ackCheckboxes);
      toast.success('تم حفظ الإقرار بنجاح');
      setShowAckDialog(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'فشل حفظ الإقرار');
    } finally {
      setAckSubmitting(false);
    }
  };

  const allChecked = ackRequired
    ? [...ackRequired.requiredItems, ...ackRequired.requiredCheckboxes].every(item => ackCheckboxes[item.key])
    : false;

  if (loading) return <Skeleton className="h-24 w-full rounded-2xl" />;

  const statusConfig = PUBLISH_STATUS_CONFIG[publishStatus] || PUBLISH_STATUS_CONFIG.draft;
  const canPublish = (checklist?.passed ?? false) && (acknowledgement?.acknowledged ?? false);

  return (
    <>
    <div className="dashboard-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-neutral-900">{t('settings.publish.title', 'نشر المتجر')}</h3>
          <p className="text-sm text-neutral-400 mt-1">{t('settings.publish.description', 'تحكم في ظهور المتجر للعملاء')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>{statusConfig.label}</Badge>
          {publishStatus === 'published' ? (
            <PermissionGate permission="settings:update"><Button variant="outline" size="sm" onClick={handleUnpublish} disabled={publishing}>
              {publishing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('settings.publish.unpublish', 'إلغاء النشر')}
            </Button></PermissionGate>
          ) : (
            <PermissionGate permission="settings:update"><Button size="sm" onClick={handlePublish} disabled={publishing || !canPublish}>
              {publishing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('settings.publish.publish', 'نشر المتجر')}
            </Button></PermissionGate>
          )}
        </div>
      </div>
      {checklist && checklist.items && checklist.items.length > 0 && (
        <ChecklistDrillDown
          checklist={checklist}
          onRefresh={loadData}
          refreshing={refreshing}
        />
      )}
      {acknowledgement && !acknowledgement.acknowledged && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm text-amber-700">
              الإقرار مطلوب قبل النشر ({acknowledgement.missingItems.length} بنود مفقودة)
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={openAckDialog}>تقديم الإقرار</Button>
        </div>
      )}
    </div>

    {showAckDialog && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">إقرار المتجر</h3>
          <p className="text-sm text-neutral-500 mb-4">يجب الموافقة على جميع البنود قبل نشر المتجر.</p>
              {ackRequired && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-700 mb-2">الوثائق القانونية</h4>
                    {ackRequired.requiredItems.map(item => (
                  <label key={item.key} className="flex items-start gap-2 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      checked={!!ackCheckboxes[item.key]}
                      onChange={(e) => setAckCheckboxes(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    />
                    <span className="text-sm text-neutral-700">{item.label}</span>
                  </label>
                ))}
              </div>
               <div>
                 <h4 className="text-sm font-semibold text-neutral-700 mb-2">الإقرار بالمسؤوليات</h4>
                 {ackRequired.requiredCheckboxes.map(item => (
                  <label key={item.key} className="flex items-start gap-2 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      checked={!!ackCheckboxes[item.key]}
                      onChange={(e) => setAckCheckboxes(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    />
                    <span className="text-sm text-neutral-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowAckDialog(false)} className="flex-1">إلغاء</Button>
            <PermissionGate permission="settings:update"><Button onClick={handleAcknowledge} disabled={!allChecked || ackSubmitting} className="flex-1">
              {ackSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              تأكيد الإقرار
            </Button></PermissionGate>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
