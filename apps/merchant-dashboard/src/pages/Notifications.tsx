import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { notificationApi, providerStatusApi, type ProviderStatus } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MessageSquare, Smartphone, Save, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface NotificationPreferences {
  id: number;
  storeId: number;
  emailEnabled: boolean;
  emailAddress: string | null;
  smsEnabled: boolean;
  smsPhone: string | null;
  whatsappEnabled: boolean;
  whatsappPhone: string | null;
  orderCreated: boolean;
  paymentSuccess: boolean;
  paymentFailed: boolean;
  shippingUpdate: boolean;
  lowStock: boolean;
  abandonedCart: boolean;
}

interface NotificationLog {
  id: number;
  channel: string;
  recipient: string;
  subject: string | null;
  status: string;
  templateCode: string | null;
  errorMessage: string | null;
  sentAt: string;
}

export default function Notifications() {
  const { storeId } = useAuth();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    id: 0,
    storeId: storeId || 0,
    emailEnabled: true,
    emailAddress: '',
    smsEnabled: false,
    smsPhone: '',
    whatsappEnabled: false,
    whatsappPhone: '',
    orderCreated: true,
    paymentSuccess: true,
    paymentFailed: true,
    shippingUpdate: true,
    lowStock: true,
    abandonedCart: false,
  });

  const loadData = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const [prefsData, logsData, providerData] = await Promise.all([
        notificationApi.getPreferences(storeId),
        notificationApi.getLogs(storeId),
        providerStatusApi.get(storeId),
      ]);
      if (prefsData) {
        setPrefs(prev => ({
          ...prev,
          ...prefsData,
          emailAddress: prefsData.emailAddress || '',
          smsPhone: prefsData.smsPhone || '',
          whatsappPhone: prefsData.whatsappPhone || '',
        }));
      }
      if (logsData) setLogs(logsData);
      setProviderStatus(providerData);
    } catch (e) {
      if (e instanceof ApiClientError) {
        toast.error(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!storeId) return;
    setSaving(true);
    try {
      const updated = await notificationApi.updatePreferences(storeId, {
        emailEnabled: prefs.emailEnabled,
        emailAddress: prefs.emailAddress || undefined,
        smsEnabled: prefs.smsEnabled,
        smsPhone: prefs.smsPhone || undefined,
        whatsappEnabled: prefs.whatsappEnabled,
        whatsappPhone: prefs.whatsappPhone || undefined,
        orderCreated: prefs.orderCreated,
        paymentSuccess: prefs.paymentSuccess,
        paymentFailed: prefs.paymentFailed,
        shippingUpdate: prefs.shippingUpdate,
        lowStock: prefs.lowStock,
        abandonedCart: prefs.abandonedCart,
      });
      if (updated) {
        setPrefs(prev => ({ ...prev, ...updated }));
      }
      toast.success(t('notifications.saved'));
    } catch (e) {
      if (e instanceof ApiClientError) {
        toast.error(e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const channelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Smartphone className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const locale = i18n.language === 'ar' ? 'ar-SA' : i18n.language;
    return new Date(dateStr).toLocaleString(locale);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        <Skeleton className="h-10 w-32 rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-blue-500" />
        <h1 className="text-2xl font-bold text-neutral-900">{t('notifications.title')}</h1>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">تنبيه: قنوات الاتصال تحتاج إعداد مزودات حقيقية</p>
        <p className="text-amber-700">
          البريد يعمل كقناة تواصل رسمية عبر info@haasoft.com حتى إعداد SMTP. واتساب هنا رابط/QR تواصل فقط، وليس WhatsApp Business API.
        </p>
      </div>

      {providerStatus && (
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { label: 'Geidea', value: providerStatus.payment.status, detail: providerStatus.payment.configured ? 'Sandbox configured' : 'Not configured' },
            { label: 'OTO', value: providerStatus.shipping.status, detail: `${providerStatus.shipping.integrationModel} / ${providerStatus.shipping.mode}` },
            { label: 'OTO Label', value: providerStatus.shippingLabel.status, detail: providerStatus.shippingLabel.labelType },
            { label: 'Email', value: providerStatus.email.status, detail: providerStatus.email.realDelivery ? 'SMTP delivery' : `contact-only ${providerStatus.email.fromEmail}` },
            { label: 'WhatsApp', value: providerStatus.whatsapp.status, detail: 'QR contact only' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-neutral-100 bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-neutral-900">{item.label}</p>
                <Badge variant={item.value === 'configured' || item.value === 'sandbox' ? 'default' : 'secondary'}>{item.value}</Badge>
              </div>
              <p className="mt-1 text-xs text-neutral-500">{item.detail}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-neutral-900">{t('notifications.channels')}</h2>

            <div className="border border-neutral-100 rounded-2xl bg-white/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-neutral-400" />
                  <span className="font-medium text-sm text-neutral-900">{t('notifications.email')}</span>
                </div>
                <Switch
                  checked={prefs.emailEnabled}
                  onCheckedChange={(v) => setPrefs(p => ({ ...p, emailEnabled: v }))}
                />
              </div>
              {prefs.emailEnabled && (
                <div>
                  <Label htmlFor="email" className="text-sm text-neutral-500">{t('notifications.emailLabel')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={prefs.emailAddress || ''}
                    onChange={e => setPrefs(p => ({ ...p, emailAddress: e.target.value }))}
                    placeholder={t('notifications.emailPlaceholder')}
                    className="h-9 text-sm mt-1"
                  />
                </div>
              )}
            </div>

            <div className="border border-neutral-100 rounded-2xl bg-white/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-neutral-400" />
                  <span className="font-medium text-sm text-neutral-900">{t('notifications.sms')}</span>
                </div>
                <Switch
                  checked={prefs.smsEnabled}
                  onCheckedChange={(v) => setPrefs(p => ({ ...p, smsEnabled: v }))}
                />
              </div>
              {prefs.smsEnabled && (
                <div>
                  <Label htmlFor="smsPhone" className="text-sm text-neutral-500">{t('notifications.smsLabel')}</Label>
                  <Input
                    id="smsPhone"
                    value={prefs.smsPhone || ''}
                    onChange={e => setPrefs(p => ({ ...p, smsPhone: e.target.value }))}
                    placeholder={t('notifications.phonePlaceholder')}
                    className="h-9 text-sm mt-1"
                  />
                </div>
              )}
            </div>

            <div className="border border-neutral-100 rounded-2xl bg-white/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-neutral-400" />
                  <span className="font-medium text-sm text-neutral-900">{t('notifications.whatsapp')}</span>
                </div>
                <Switch
                  checked={prefs.whatsappEnabled}
                  onCheckedChange={(v) => setPrefs(p => ({ ...p, whatsappEnabled: v }))}
                />
              </div>
              {prefs.whatsappEnabled && (
                <div>
                  <Label htmlFor="whatsappPhone" className="text-sm text-neutral-500">{t('notifications.whatsappLabel')}</Label>
                  <Input
                    id="whatsappPhone"
                    value={prefs.whatsappPhone || ''}
                    onChange={e => setPrefs(p => ({ ...p, whatsappPhone: e.target.value }))}
                    placeholder={t('notifications.phonePlaceholder')}
                    className="h-9 text-sm mt-1"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-bold text-lg text-neutral-900">{t('notifications.notificationTypes')}</h2>
            {[
              { key: 'orderCreated' as const, label: t('notifications.type_orderCreated'), desc: t('notifications.type_orderCreatedDesc') },
              { key: 'paymentSuccess' as const, label: t('notifications.type_paymentSuccess'), desc: t('notifications.type_paymentSuccessDesc') },
              { key: 'paymentFailed' as const, label: t('notifications.type_paymentFailed'), desc: t('notifications.type_paymentFailedDesc') },
              { key: 'shippingUpdate' as const, label: t('notifications.type_shippingUpdate'), desc: t('notifications.type_shippingUpdateDesc') },
              { key: 'lowStock' as const, label: t('notifications.type_lowStock'), desc: t('notifications.type_lowStockDesc') },
              { key: 'abandonedCart' as const, label: t('notifications.type_abandonedCart'), desc: t('notifications.type_abandonedCartDesc') },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <div>
                  <p className="font-medium text-sm text-neutral-900">{item.label}</p>
                  <p className="text-xs text-neutral-400">{item.desc}</p>
                </div>
                <Switch
                  checked={prefs[item.key]}
                  onCheckedChange={(v) => setPrefs(p => ({ ...p, [item.key]: v }))}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <Button onClick={handleSave} disabled={saving} className="h-9 text-sm px-4 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('notifications.save')}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        <div className="p-6 space-y-4">
          <h2 className="font-bold text-lg text-neutral-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-neutral-400" />
            {t('notifications.logs')}
          </h2>
          {logs.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">{t('notifications.noLogs')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-500">
                    <th className="text-right py-2 font-medium text-sm text-neutral-500">{t('notifications.logChannel')}</th>
                    <th className="text-right py-2 font-medium text-sm text-neutral-500">{t('notifications.logSubject')}</th>
                    <th className="text-right py-2 font-medium text-sm text-neutral-500">{t('notifications.logRecipient')}</th>
                    <th className="text-right py-2 font-medium text-sm text-neutral-500">{t('notifications.logStatus')}</th>
                    <th className="text-right py-2 font-medium text-sm text-neutral-500">{t('notifications.logTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          {channelIcon(log.channel)}
                          <span className="text-xs text-neutral-900">{log.channel}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-sm text-neutral-900">{log.subject || log.templateCode || '-'}</td>
                      <td className="py-2 px-3 text-xs text-neutral-900">{log.recipient}</td>
                      <td className="py-2 px-3">
                        <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className="text-xs px-2.5 py-0.5">
                          {log.status === 'sent' ? t('notifications.sent') : t('notifications.failed')}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-xs text-neutral-400">{formatDate(log.sentAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
