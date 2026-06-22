import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Smartphone, QrCode, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { whatsappApi } from '@/lib/api';
import { messageFromError } from '@/lib/error-mapper';

type Status = 'disconnected' | 'pairing' | 'connected';

interface SessionEvent {
  type: 'qr' | 'connected' | 'disconnected' | 'failure';
  qrPngBase64?: string;
  phone?: string;
  displayName?: string;
  message?: string;
}

// WhatsApp Local pairing page (WA-PR-2).
//
// Flow:
//   1. On mount, fetch `/status` to know if a session already exists.
//   2. On "ابدأ الاقتران" click, POST /pair, then open an EventSource
//      to /qr-stream and render each emitted event.
//   3. On 'connected' event, show success state + phone + display name.
//   4. On 'disconnected' / 'failure', show error banner.
//
// Until WA-PR-3 lands the real Baileys runtime, the server-side stub
// fires a 'failure' event explaining the runtime isn't enabled yet —
// the UI surfaces this gracefully instead of hanging on the QR.
export default function WhatsAppPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('disconnected');
  const [phone, setPhone] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [qrPng, setQrPng] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [streamSource, setStreamSource] = useState<EventSource | null>(null);

  useEffect(() => {
    void refreshStatus();
    return () => {
      streamSource?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      toast.success(t('whatsapp.connected', 'تم ربط الجوال بنجاح'));
      es.close();
    });
    es.addEventListener('disconnected', () => {
      setStatus('disconnected');
      setQrPng(null);
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
    if (!confirm(t('whatsapp.confirmDisconnect', 'هل أنت متأكد من فصل الجوال؟ سيتوقف إرسال الرسائل التلقائية.'))) return;
    try {
      await whatsappApi.disconnect();
      setStatus('disconnected');
      setPhone(null);
      setDisplayName(null);
      toast.success(t('whatsapp.disconnected', 'تم فصل الجوال'));
    } catch (err) {
      toast.error(messageFromError(err, t));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {t('whatsapp.title', 'الواتساب المحلي')}
        </h1>
        <p className="text-sm text-neutral-500">
          {t(
            'whatsapp.subtitle',
            'اربط جوالك بـ QR لإرسال رسائل واتساب آلية للعملاء (السلال المتروكة، تأكيد الطلبات، الحملات).',
          )}
        </p>
      </header>

      {/* Connected state */}
      {status === 'connected' && (
        <section className="dashboard-card flex items-center gap-4 border border-success/30 bg-success/5 p-5">
          <CheckCircle2 className="h-10 w-10 shrink-0 text-success" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-bold text-neutral-900">
              {t('whatsapp.connectedLabel', 'متصل')}
              {displayName ? ` — ${displayName}` : ''}
            </p>
            {phone && <p className="text-xs text-neutral-500" dir="ltr">{phone}</p>}
          </div>
          <Button variant="outline" onClick={handleDisconnect}>
            {t('whatsapp.disconnect', 'فصل الجوال')}
          </Button>
        </section>
      )}

      {/* Failure banner */}
      {failure && (
        <section className="dashboard-card flex items-start gap-3 border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-sm text-neutral-800">{failure}</p>
        </section>
      )}

      {/* Disconnected / pairing state */}
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
                  'افتح واتساب على جوالك → الإعدادات → الأجهزة المرتبطة → ربط جهاز.',
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
                {t('whatsapp.qrExpiry', 'صلاحية الرمز ٣٠ ثانية — يتجدد تلقائياً.')}
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

      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-xs text-neutral-600">
        <p className="mb-1 font-semibold text-neutral-700">
          {t('whatsapp.safetyTitle', 'ملاحظات أمان مهمة')}
        </p>
        <ul className="list-disc space-y-1 ps-5">
          <li>{t('whatsapp.safetyEncrypted', 'بيانات الجلسة محفوظة مشفّرة (AES-256-GCM) في قاعدة البيانات. النص الأصلي لا يُسجّل أبداً.')}</li>
          <li>{t('whatsapp.safetyRate', 'الإرسال محدود (≤120 رسالة/الساعة) لتجنّب حظر الرقم من واتساب.')}</li>
          <li>{t('whatsapp.safetyOptOut', 'العملاء الذين أرسلوا "إيقاف" أو STOP يُستثنون تلقائياً من كل الحملات.')}</li>
          <li>{t('whatsapp.safetyIsolation', 'كل متجر له جلسة معزولة — لا يستطيع متجر آخر استخدام رقمك.')}</li>
        </ul>
      </section>
    </div>
  );
}
