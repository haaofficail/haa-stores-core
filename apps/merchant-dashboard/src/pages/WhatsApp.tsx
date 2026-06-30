import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MessageSquare,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError, whatsappApi, whatsappCampaignsApi, type WhatsappCampaign } from '@/lib/api';
import { messageFromError } from '@/lib/error-mapper';
import { usePermissions } from '@/lib/permissions';
import { queryKeys } from '@/lib/queryClient';

type Status = 'disconnected' | 'pairing' | 'connected';
type CampaignSegment =
  | 'all'
  | 'high_value'
  | 'repeat_buyers'
  | 'new_customers'
  | 'inactive'
  | 'cart_abandoners'
  | 'at_risk'
  | 'one_time_buyers'
  | 'coupon_users';

interface SessionEvent {
  type: 'qr' | 'connected' | 'disconnected' | 'failure';
  qrPngBase64?: string;
  phone?: string;
  displayName?: string;
  message?: string;
}

const emptyCampaignForm = {
  name: '',
  segmentType: 'all' as CampaignSegment,
  messageTemplate: '',
  scheduledAt: '',
};

const statusVariant = {
  draft: 'secondary',
  scheduled: 'warning',
  running: 'default',
  completed: 'success',
  failed: 'destructive',
} as const;

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('ar-SA').format(value ?? 0);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

// WhatsApp Local pairing page (WA-PR-2 + merchant campaign surface).
//
// Flow:
//   1. Pair the merchant's local WhatsApp session through QR/SSE.
//   2. Let merchants preview consented recipients before campaign creation.
//   3. Create, schedule, send, and delete WhatsApp campaigns through the
//      existing `/whatsapp-campaigns` API guarded by promotions permissions.
export default function WhatsAppPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('disconnected');
  const [phone, setPhone] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [qrPng, setQrPng] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [streamSource, setStreamSource] = useState<EventSource | null>(null);
  const [disconnectArmed, setDisconnectArmed] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [campaignForm, setCampaignForm] = useState(emptyCampaignForm);

  const canReadCampaigns = can('promotions:read');
  const canCreateCampaigns = can('promotions:create');
  const canDeleteCampaigns = can('promotions:delete');
  const campaignQueryKey = queryKeys.whatsappCampaigns(storeId);
  const selectedSegment = campaignForm.segmentType === 'all' ? undefined : campaignForm.segmentType;

  const segmentOptions = useMemo(
    () => [
      { value: 'all', label: t('whatsapp.segmentAll', 'كل العملاء الموافقين') },
      { value: 'high_value', label: t('whatsapp.segmentHighValue', 'عملاء القيمة العالية') },
      { value: 'repeat_buyers', label: t('whatsapp.segmentRepeatBuyers', 'العملاء المتكررون') },
      { value: 'new_customers', label: t('whatsapp.segmentNewCustomers', 'العملاء الجدد') },
      { value: 'inactive', label: t('whatsapp.segmentInactive', 'العملاء غير النشطين') },
      { value: 'cart_abandoners', label: t('whatsapp.segmentCartAbandoners', 'السلال المتروكة') },
      { value: 'at_risk', label: t('whatsapp.segmentAtRisk', 'المعرضون للفقد') },
      { value: 'one_time_buyers', label: t('whatsapp.segmentOneTimeBuyers', 'مشترو مرة واحدة') },
      { value: 'coupon_users', label: t('whatsapp.segmentCouponUsers', 'مستخدمو الكوبونات') },
    ] satisfies Array<{ value: CampaignSegment; label: string }>,
    [t],
  );

  const segmentLabel = (segment: string | null | undefined) =>
    segmentOptions.find(option => option.value === (segment ?? 'all'))?.label ?? segment ?? t('whatsapp.segmentAll', 'كل العملاء الموافقين');

  const statusLabel = (campaignStatus: WhatsappCampaign['status']) => {
    const labels: Record<WhatsappCampaign['status'], string> = {
      draft: t('whatsapp.statusDraft', 'مسودة'),
      scheduled: t('whatsapp.statusScheduled', 'مجدولة'),
      running: t('whatsapp.statusRunning', 'قيد الإرسال'),
      completed: t('whatsapp.statusCompleted', 'مكتملة'),
      failed: t('whatsapp.statusFailed', 'فشلت'),
    };
    return labels[campaignStatus];
  };

  const campaignsQuery = useQuery({
    queryKey: campaignQueryKey,
    queryFn: () => whatsappCampaignsApi.list(storeId as number),
    enabled: Boolean(storeId && canReadCampaigns),
  });

  const previewQuery = useQuery({
    queryKey: [...campaignQueryKey, 'preview', campaignForm.segmentType],
    queryFn: () => whatsappCampaignsApi.preview(storeId as number, selectedSegment),
    enabled: Boolean(storeId && canReadCampaigns),
  });

  const invalidateCampaigns = () => {
    void queryClient.invalidateQueries({ queryKey: campaignQueryKey });
  };

  useEffect(() => {
    void refreshStatus();
    return () => {
      streamSource?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (campaignsQuery.isError) {
      toast.error(messageFromError(campaignsQuery.error, t));
    }
  }, [campaignsQuery.error, campaignsQuery.isError, t]);

  async function refreshStatus() {
    try {
      const res = await whatsappApi.status();
      setStatus(res.status);
    } catch (err) {
      toast.error(messageFromError(err, t));
    }
  }

  async function handleStartPairing() {
    setStarting(true);
    setFailure(null);
    setQrPng(null);
    setDisconnectArmed(false);
    try {
      await whatsappApi.pair();
      setStatus('pairing');
      openStream();
    } catch (err) {
      toast.error(messageFromError(err, t));
    } finally {
      setStarting(false);
    }
  }

  function openStream() {
    streamSource?.close();
    const es = whatsappApi.openQrStream();
    es.addEventListener('qr', (e: MessageEvent) => {
      const data: SessionEvent = JSON.parse(e.data);
      if (data.qrPngBase64) setQrPng(data.qrPngBase64);
      setStatus('pairing');
    });
    es.addEventListener('connected', (e: MessageEvent) => {
      const data: SessionEvent = JSON.parse(e.data);
      setStatus('connected');
      setPhone(data.phone ?? null);
      setDisplayName(data.displayName ?? null);
      setQrPng(null);
      setDisconnectArmed(false);
      toast.success(t('whatsapp.connected', 'تم ربط الجوال بنجاح'));
      es.close();
    });
    es.addEventListener('disconnected', () => {
      setStatus('disconnected');
      setQrPng(null);
      setDisconnectArmed(false);
      es.close();
    });
    es.addEventListener('failure', (e: MessageEvent) => {
      const data: SessionEvent = JSON.parse(e.data);
      setFailure(data.message ?? t('whatsapp.genericFailure', 'حدث خطأ أثناء الاقتران'));
      setStatus('disconnected');
      setQrPng(null);
    });
    es.onerror = () => {
      es.close();
    };
    setStreamSource(es);
  }

  async function handleDisconnect() {
    if (!disconnectArmed) {
      setDisconnectArmed(true);
      return;
    }
    try {
      await whatsappApi.disconnect();
      setStatus('disconnected');
      setPhone(null);
      setDisplayName(null);
      setDisconnectArmed(false);
      toast.success(t('whatsapp.disconnected', 'تم فصل الجوال'));
    } catch (err) {
      toast.error(messageFromError(err, t));
    }
  }

  const createCampaignMutation = useMutation({
    mutationFn: () => {
      if (!storeId) throw new ApiClientError('STORE_REQUIRED', t('common.error', 'حدث خطأ'));
      const name = campaignForm.name.trim();
      const messageTemplate = campaignForm.messageTemplate.trim();
      if (!name) throw new ApiClientError('VALIDATION_ERROR', t('whatsapp.campaignNameRequired', 'اسم الحملة مطلوب'));
      if (!messageTemplate) throw new ApiClientError('VALIDATION_ERROR', t('whatsapp.campaignMessageRequired', 'نص الرسالة مطلوب'));
      return whatsappCampaignsApi.create(storeId, {
        name,
        messageTemplate,
        segmentType: selectedSegment,
        scheduledAt: campaignForm.scheduledAt ? new Date(campaignForm.scheduledAt).toISOString() : undefined,
      });
    },
    onSuccess: (campaign) => {
      toast.success(
        campaign.status === 'scheduled'
          ? t('whatsapp.campaignScheduled', 'تمت جدولة حملة واتساب')
          : t('whatsapp.campaignCreated', 'تم إنشاء حملة واتساب'),
      );
      setCampaignForm(emptyCampaignForm);
      invalidateCampaigns();
    },
    onError: (err) => toast.error(messageFromError(err, t)),
  });

  const sendCampaignMutation = useMutation({
    mutationFn: (campaignId: number) => whatsappCampaignsApi.send(storeId as number, campaignId),
    onSuccess: () => {
      toast.success(t('whatsapp.campaignSendStarted', 'بدأ إرسال الحملة'));
      invalidateCampaigns();
    },
    onError: (err) => toast.error(messageFromError(err, t)),
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (campaignId: number) => whatsappCampaignsApi.delete(storeId as number, campaignId),
    onSuccess: () => {
      toast.success(t('whatsapp.campaignDeleted', 'تم حذف الحملة'));
      setDeleteConfirm(null);
      invalidateCampaigns();
    },
    onError: (err) => toast.error(messageFromError(err, t)),
  });

  const campaigns = campaignsQuery.data ?? [];
  const previewCount = previewQuery.data?.count ?? 0;
  const previewSample = previewQuery.data?.sample ?? [];
  const canSendNow = (campaign: WhatsappCampaign) => campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'failed';
  const canDelete = (campaign: WhatsappCampaign) => campaign.status === 'draft' || campaign.status === 'failed';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900">
          {t('whatsapp.title', 'الواتساب المحلي')}
        </h1>
        <p className="max-w-3xl text-sm text-neutral-500">
          {t(
            'whatsapp.subtitle',
            'اربط جوالك بـ QR لإرسال رسائل واتساب آلية للعملاء (السلال المتروكة، تأكيد الطلبات، الحملات).',
          )}
        </p>
      </header>

      {status === 'connected' && (
        <section className="dashboard-card flex flex-col gap-4 border border-success/30 bg-success/5 p-5 sm:flex-row sm:items-center">
          <CheckCircle2 className="h-10 w-10 shrink-0 text-success" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-neutral-900">
              {t('whatsapp.connectedLabel', 'متصل')}
              {displayName ? ` - ${displayName}` : ''}
            </p>
            {phone && <p className="text-xs text-neutral-500" dir="ltr">{phone}</p>}
          </div>
          <Button
            variant={disconnectArmed ? 'destructive-outline' : 'outline'}
            onClick={handleDisconnect}
            className="w-full sm:w-auto"
          >
            {disconnectArmed
              ? t('whatsapp.confirmDisconnectAction', 'اضغط مرة أخرى للتأكيد')
              : t('whatsapp.disconnect', 'فصل الجوال')}
          </Button>
        </section>
      )}

      {failure && (
        <section className="dashboard-card flex items-start gap-3 border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-sm text-neutral-800">{failure}</p>
        </section>
      )}

      {status !== 'connected' && (
        <section className="dashboard-card space-y-5 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-50 p-2 text-primary-600">
              <Smartphone className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-bold text-neutral-900">
                {t('whatsapp.pairTitle', 'اقتران جوال التاجر')}
              </p>
              <p className="text-xs text-neutral-500">
                {t(
                  'whatsapp.pairHelp',
                  'افتح واتساب على جوالك ثم الإعدادات ثم الأجهزة المرتبطة ثم ربط جهاز.',
                )}
              </p>
            </div>
          </div>

          {qrPng ? (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
                <img
                  src={`data:image/png;base64,${qrPng}`}
                  alt={t('whatsapp.qrAlt', 'رمز QR للاقتران')}
                  className="h-64 w-64"
                />
              </div>
              <p className="text-xs text-neutral-500">
                {t('whatsapp.qrExpiry', 'صلاحية الرمز 30 ثانية ويتجدد تلقائياً.')}
              </p>
            </div>
          ) : status === 'pairing' ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary-500" aria-hidden="true" />
              <p className="text-sm text-neutral-600">
                {t('whatsapp.waitingForQr', 'بانتظار QR...')}
              </p>
            </div>
          ) : (
            <Button onClick={handleStartPairing} disabled={starting} className="w-full">
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <QrCode className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{t('whatsapp.startPairing', 'ابدأ الاقتران')}</span>
            </Button>
          )}
        </section>
      )}

      <section className="dashboard-card space-y-5 p-5" data-testid="whatsapp-campaign-create-form">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary-50 p-2 text-primary-600">
              <MessageSquare className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                {t('whatsapp.campaignsTitle', 'حملات واتساب')}
              </h2>
              <p className="max-w-2xl text-sm text-neutral-500">
                {t(
                  'whatsapp.campaignsHelp',
                  'أنشئ حملة تسويقية ترسل فقط للعملاء الذين وافقوا على تسويق واتساب ولم يطلبوا الإيقاف.',
                )}
              </p>
            </div>
          </div>
          {canReadCampaigns && (
            <Button variant="outline" onClick={() => campaignsQuery.refetch()} disabled={campaignsQuery.isFetching}>
              {campaignsQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{t('common.refresh', 'تحديث')}</span>
            </Button>
          )}
        </div>

        {!canReadCampaigns ? (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-neutral-700">
            {t('whatsapp.campaignPermissionRequired', 'تحتاج صلاحية قراءة العروض لعرض حملات واتساب لهذا المتجر.')}
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-campaign-name">{t('whatsapp.campaignName', 'اسم الحملة')}</Label>
                    <Input
                      id="whatsapp-campaign-name"
                      value={campaignForm.name}
                      maxLength={100}
                      onChange={(event) => setCampaignForm(prev => ({ ...prev, name: event.target.value }))}
                      placeholder={t('whatsapp.campaignNamePlaceholder', 'مثال: عرض نهاية الأسبوع')}
                      disabled={!canCreateCampaigns || createCampaignMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-campaign-segment">{t('whatsapp.campaignSegment', 'الشريحة')}</Label>
                    <Select
                      value={campaignForm.segmentType}
                      onValueChange={(value) => setCampaignForm(prev => ({ ...prev, segmentType: value as CampaignSegment }))}
                      disabled={!canCreateCampaigns || createCampaignMutation.isPending}
                    >
                      <SelectTrigger id="whatsapp-campaign-segment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {segmentOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp-campaign-message">{t('whatsapp.campaignMessage', 'نص الرسالة')}</Label>
                  <textarea
                    id="whatsapp-campaign-message"
                    value={campaignForm.messageTemplate}
                    maxLength={1000}
                    rows={5}
                    onChange={(event) => setCampaignForm(prev => ({ ...prev, messageTemplate: event.target.value }))}
                    placeholder={t('whatsapp.campaignMessagePlaceholder', 'اكتب رسالة واضحة مع طريقة إلغاء الاشتراك مثل: أرسل إيقاف لإلغاء الرسائل.')}
                    disabled={!canCreateCampaigns || createCampaignMutation.isPending}
                    className="flex min-h-[140px] w-full resize-y rounded-xl border border-neutral-200 bg-surface-1 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-neutral-500">
                    {formatNumber(campaignForm.messageTemplate.length)} / {formatNumber(1000)}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-campaign-scheduled-at">
                      {t('whatsapp.campaignSchedule', 'موعد الإرسال اختياري')}
                    </Label>
                    <Input
                      id="whatsapp-campaign-scheduled-at"
                      type="datetime-local"
                      value={campaignForm.scheduledAt}
                      onChange={(event) => setCampaignForm(prev => ({ ...prev, scheduledAt: event.target.value }))}
                      disabled={!canCreateCampaigns || createCampaignMutation.isPending}
                    />
                  </div>
                  <Button
                    onClick={() => createCampaignMutation.mutate()}
                    disabled={!canCreateCampaigns || createCampaignMutation.isPending}
                    data-testid="whatsapp-campaign-create"
                  >
                    {createCampaignMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <CalendarClock className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {campaignForm.scheduledAt
                        ? t('whatsapp.scheduleCampaign', 'جدولة الحملة')
                        : t('whatsapp.createCampaign', 'إنشاء مسودة')}
                    </span>
                  </Button>
                </div>

                {!canCreateCampaigns && (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-neutral-700">
                    {t('whatsapp.campaignCreatePermissionRequired', 'تحتاج صلاحية إنشاء العروض لإنشاء أو إرسال حملة واتساب.')}
                  </div>
                )}
              </div>

              <aside className="space-y-4 border-t border-neutral-100 pt-4 lg:border-s lg:border-t-0 lg:ps-4 lg:pt-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                    <Users className="h-4 w-4 text-primary-500" aria-hidden="true" />
                    <span>{t('whatsapp.previewTitle', 'معاينة المستلمين')}</span>
                  </div>
                  {previewQuery.isLoading ? (
                    <Skeleton className="h-20 w-full rounded-xl" />
                  ) : previewQuery.isError ? (
                    <p className="text-sm text-danger">{messageFromError(previewQuery.error, t)}</p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-neutral-900">{formatNumber(previewCount)}</p>
                      <p className="text-xs text-neutral-500">
                        {t('whatsapp.previewConsentNote', 'العدد يشمل أصحاب الموافقة فقط ويستبعد طلبات الإيقاف تلقائياً.')}
                      </p>
                      {previewSample.length > 0 && (
                        <div className="space-y-1">
                          {previewSample.map(sample => (
                            <p key={sample.customerId} dir="ltr" className="text-xs text-neutral-500">
                              {sample.phone}
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success/5 p-3 text-xs text-neutral-700">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <p>
                    {t(
                      'whatsapp.complianceNote',
                      'كل حملة تعتمد على موافقة العميل التسويقية، وتدعم إلغاء الاشتراك عبر إيقاف أو STOP قبل الإرسال.',
                    )}
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </section>

      {canReadCampaigns && (
        <section className="dashboard-card overflow-hidden p-0" data-testid="whatsapp-campaigns-table">
          <div className="flex flex-col gap-2 border-b border-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">{t('whatsapp.campaignsListTitle', 'سجل الحملات')}</h2>
              <p className="text-sm text-neutral-500">
                {t('whatsapp.campaignsListHelp', 'تابع حالة الإرسال والقراءة والفشل لكل حملة.')}
              </p>
            </div>
            <Badge variant="outline">{formatNumber(campaigns.length)} {t('whatsapp.campaignsCount', 'حملة')}</Badge>
          </div>

          {campaignsQuery.isLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map(item => <Skeleton key={item} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : campaignsQuery.isError ? (
            <div className="p-8 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-danger" aria-hidden="true" />
              <p className="mb-4 text-sm text-neutral-600">{t('whatsapp.campaignsLoadError', 'تعذر تحميل حملات واتساب.')}</p>
              <Button variant="outline" onClick={() => campaignsQuery.refetch()}>{t('common.retry', 'إعادة المحاولة')}</Button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-10 text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-neutral-300" aria-hidden="true" />
              <p className="text-sm text-neutral-500">{t('whatsapp.noCampaigns', 'لا توجد حملات واتساب بعد.')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t('whatsapp.campaignName', 'اسم الحملة')}</TableHead>
                  <TableHead>{t('whatsapp.campaignSegment', 'الشريحة')}</TableHead>
                  <TableHead>{t('whatsapp.campaignStatus', 'الحالة')}</TableHead>
                  <TableHead>{t('whatsapp.campaignRecipients', 'المستلمون')}</TableHead>
                  <TableHead>{t('whatsapp.campaignDelivery', 'التسليم')}</TableHead>
                  <TableHead>{t('whatsapp.campaignScheduledFor', 'الموعد')}</TableHead>
                  <TableHead className="w-40">{t('common.actions', 'الإجراءات')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map(campaign => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="max-w-[260px]">
                        <p className="truncate font-semibold text-neutral-900">{campaign.name}</p>
                        <p className="line-clamp-2 text-xs text-neutral-500">{campaign.messageTemplate}</p>
                      </div>
                    </TableCell>
                    <TableCell>{segmentLabel(campaign.segmentType)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[campaign.status]}>{statusLabel(campaign.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-neutral-900">{formatNumber(campaign.totalRecipients)}</div>
                      <div className="text-xs text-neutral-500">
                        {t('whatsapp.sentLabel', 'أرسل')}: {formatNumber(campaign.sentCount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-neutral-600">
                        {t('whatsapp.deliveredLabel', 'تم التسليم')}: {formatNumber(campaign.deliveredCount)}
                      </div>
                      <div className="text-xs text-neutral-600">
                        {t('whatsapp.readLabel', 'قراءة')}: {formatNumber(campaign.readCount)}
                      </div>
                      <div className="text-xs text-danger">
                        {t('whatsapp.failedLabel', 'فشل')}: {formatNumber(campaign.failedCount)}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-36">{formatDateTime(campaign.scheduledAt ?? campaign.startedAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {canCreateCampaigns && canSendNow(campaign) && (
                          <Button
                            size="sm"
                            onClick={() => sendCampaignMutation.mutate(campaign.id)}
                            disabled={sendCampaignMutation.isPending}
                            data-testid="whatsapp-campaign-send"
                          >
                            {sendCampaignMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Send className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span>{t('whatsapp.sendNow', 'إرسال')}</span>
                          </Button>
                        )}
                        {canDeleteCampaigns && canDelete(campaign) && (
                          <Button
                            size="sm"
                            variant={deleteConfirm === campaign.id ? 'destructive-outline' : 'outline'}
                            onClick={() => {
                              if (deleteConfirm !== campaign.id) {
                                setDeleteConfirm(campaign.id);
                                return;
                              }
                              deleteCampaignMutation.mutate(campaign.id);
                            }}
                            disabled={deleteCampaignMutation.isPending}
                            data-testid="whatsapp-campaign-delete"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            <span>{deleteConfirm === campaign.id ? t('common.confirm', 'تأكيد') : t('common.delete', 'حذف')}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-xs text-neutral-600">
        <p className="mb-1 font-semibold text-neutral-700">
          {t('whatsapp.safetyTitle', 'ملاحظات أمان مهمة')}
        </p>
        <ul className="list-disc space-y-1 ps-5">
          <li>{t('whatsapp.safetyEncrypted', 'بيانات الجلسة محفوظة مشفرة (AES-256-GCM) في قاعدة البيانات. النص الأصلي لا يسجل أبداً.')}</li>
          <li>{t('whatsapp.safetyRate', 'الإرسال محدود (120 رسالة/الساعة) لتجنب حظر الرقم من واتساب.')}</li>
          <li>{t('whatsapp.safetyOptOut', 'العملاء الذين أرسلوا "إيقاف" أو STOP يستثنون تلقائياً من كل الحملات.')}</li>
          <li>{t('whatsapp.safetyIsolation', 'كل متجر له جلسة معزولة ولا يستطيع متجر آخر استخدام رقمك.')}</li>
        </ul>
      </section>
    </div>
  );
}
