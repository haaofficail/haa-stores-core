// Notifications Inbox — IA W5 part 3.
//
// The audit (2026-06-25) flagged that `/notifications` is preferences
// only — there is no Inbox surface where the merchant can see what
// has actually been sent. The notification logs API exists
// (notificationApi.getLogs) but no UI consumed it as a feed.
//
// This page is the feed: most-recent-first list of every email /
// WhatsApp / SMS the platform sent on the merchant's behalf, with
// channel + recipient + status + error message. The Topbar bell now
// lands here (was /notifications).

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/icon';
import { notificationApi, ApiClientError } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { statusInfo, NOTIFICATION_STATUS } from '@/lib/status-labels';
import { messageFromError } from '@/lib/error-mapper';
import { toast } from 'sonner';

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

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'email') return <Icon name="Mail" size="xs" />;
  if (channel === 'sms') return <Icon name="Smartphone" size="xs" />;
  if (channel === 'whatsapp') return <Icon name="MessageSquare" size="xs" />;
  return <Icon name="Bell" size="xs" />;
}

function StatusBadge({ status }: { status: string }) {
  const label = statusInfo(NOTIFICATION_STATUS, status).label;
  if (status === 'sent' || status === 'delivered') {
    return (
      <Badge variant="success" className="text-xs gap-1">
        <Icon name="CheckCircle2" size="2xs" /> {label}
      </Badge>
    );
  }
  if (status === 'failed' || status === 'bounced') {
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <Icon name="XCircle" size="2xs" /> {label}
      </Badge>
    );
  }
  if (status === 'queued' || status === 'pending') {
    return (
      <Badge variant="secondary" className="text-xs gap-1">
        <Icon name="Clock" size="2xs" /> {label}
      </Badge>
    );
  }
  return <Badge variant="secondary" className="text-xs">{label}</Badge>;
}

type ChannelFilter = 'all' | 'email' | 'sms' | 'whatsapp';

export default function NotificationsInbox() {
  const { t, i18n } = useTranslation();
  const { storeId } = useAuth();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChannelFilter>('all');

  const load = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    notificationApi.getLogs(storeId, filter === 'all' ? undefined : filter)
      .then((data) => setLogs((data as NotificationLog[]) ?? []))
      .catch((e) => {
        if (!(e instanceof ApiClientError) || e.code !== 'NOT_FOUND') {
          toast.error(messageFromError(e, t));
        }
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [storeId, filter, t]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (iso: string) => {
    const locale = i18n.language === 'ar' ? 'ar-SA' : i18n.language;
    return new Date(iso).toLocaleString(locale, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const channels: ChannelFilter[] = ['all', 'email', 'whatsapp', 'sms'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon name="Bell" size="default" className="text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {t('notifications.inbox.title', 'صندوق الإشعارات')}
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {t('notifications.inbox.description', 'سجل كل إشعار أُرسل من متجرك')}
            </p>
          </div>
        </div>
        <Link
          to="/notifications"
          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
        >
          <Icon name="SettingsIcon" size="xs" />
          {t('notifications.inbox.preferencesLink', 'تفضيلات الإشعارات')}
        </Link>
      </div>

      {/* Channel filter */}
      <div className="flex gap-2 flex-wrap" role="tablist" aria-label={t('notifications.inbox.filterLabel', 'تصفية القناة')}>
        {channels.map((ch) => (
          <button
            key={ch}
            role="tab"
            aria-selected={filter === ch}
            onClick={() => setFilter(ch)}
            data-testid={`inbox-filter-${ch}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === ch
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {t(`notifications.inbox.channel.${ch}`, ch === 'all' ? 'الكل' : ch)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              <Icon name="Bell" size="lg" className="text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500">
              {t('notifications.inbox.empty', 'لا توجد إشعارات بعد')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100" data-testid="inbox-list">
            {logs.map((log) => (
              <li key={log.id} className="p-4 hover:bg-neutral-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    log.status === 'failed' || log.status === 'bounced'
                      ? 'bg-rose-50 text-rose-600'
                      : log.status === 'sent' || log.status === 'delivered'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    <ChannelIcon channel={log.channel} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {log.subject || log.templateCode || log.channel}
                      </p>
                      <StatusBadge status={log.status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span dir="ltr" className="font-mono truncate">{log.recipient}</span>
                      <span>·</span>
                      <span>{formatDate(log.sentAt)}</span>
                    </div>
                    {log.errorMessage && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-rose-600 bg-rose-50 rounded-lg p-2">
                        <Icon name="AlertTriangle" size="2xs" className="mt-0.5" />
                        <span className="break-words">{log.errorMessage}</span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
