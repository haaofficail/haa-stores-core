/**
 * PublishSection — store publish/unpublish controls.
 *
 * Extracted from Settings.tsx (T2.4). Manages:
 *   - publish status (draft / review / published / restricted / suspended)
 *   - publish/unpublish handlers
 *   - merchant acknowledgement dialog
 *   - compliance checklist gating
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { publishApi, complianceApi, acknowledgementApi, ApiClientError } from "@/lib/api";
import { PermissionGate } from "@/lib/permissions";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";

const PUBLISH_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'مسودة', color: 'text-neutral-700', bg: 'bg-neutral-100' },
  review: { label: 'قيد المراجعة', color: 'text-primary-700', bg: 'bg-primary-100' },
  published: { label: 'منشور', color: 'text-green-700', bg: 'bg-green-100' },
  restricted: { label: 'مقيّد', color: 'text-orange-700', bg: 'bg-orange-100' },
  suspended: { label: 'موقوف', color: 'text-red-700', bg: 'bg-red-100' },
};

export function PublishSection({ storeId }: { storeId: number | null }) {
  const { t } = useTranslation();
  const [publishStatus, setPublishStatus] = useState<string>('draft');
  const [checklist, setChecklist] = useState<{ passed: boolean; blockingErrorsCount: number; warningsCount: number } | null>(null);
  const [acknowledgement, setAcknowledgement] = useState<{ acknowledged: boolean; missingItems: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showAckDialog, setShowAckDialog] = useState(false);
  const [ackCheckboxes, setAckCheckboxes] = useState<Record<string, boolean>>({});
  const [ackSubmitting, setAckSubmitting] = useState(false);
  const [ackRequired, setAckRequired] = useState<{ requiredItems: Array<{ key: string; label: string }>; requiredCheckboxes: Array<{ key: string; label: string }> } | null>(null);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [statusData, checklistData, ackData] = await Promise.allSettled([
        publishApi.getPublishStatus(storeId),
        complianceApi.getChecklist(storeId),
        acknowledgementApi.getStatus(storeId),
      ]);
      if (statusData.status === 'fulfilled') setPublishStatus(statusData.value.publishStatus);
      if (checklistData.status === 'fulfilled') setChecklist(checklistData.value);
      if (ackData.status === 'fulfilled') setAcknowledgement(ackData.value);
    } finally {
      setLoading(false);
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
    } catch (err: any) {
      const data = err?.data;
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
      {checklist && !checklist.passed && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
          <span className="text-sm text-orange-700">
            {checklist.blockingErrorsCount} أخطاء يجب إصلاحها قبل النشر
          </span>
        </div>
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
