import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { marketplaceApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, XCircle, RefreshCw, Clock, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

const PROVIDERS = [
  { code: 'salla', name: 'سلة', color: 'from-green-400 via-green-600 to-green-800' },
  { code: 'zid', name: 'زد', color: 'from-blue-400 via-blue-600 to-blue-800' },
  { code: 'noon', name: 'نون', color: 'from-amber-300 via-amber-500 to-amber-600' },
  { code: 'amazon', name: 'أمازون', color: 'from-orange-400 via-orange-600 to-gray-900' },
];

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString('en-US', {
      hour: '2-digit', minute: '2-digit',
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return d;
  }
}

const TYPE_FILTERS = [
  { value: '', label: 'syncLogs.all', fallback: 'الكل' },
  { value: 'orders', label: 'syncLogs.filterOrders', fallback: 'الطلبات' },
  { value: 'products', label: 'syncLogs.filterProducts', fallback: 'المنتجات' },
  { value: 'inventory', label: 'syncLogs.filterInventory', fallback: 'المخزون' },
];

export default function SyncLogs() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  const loadLogs = useCallback((page: number = 1) => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    marketplaceApi.syncLogs(storeId, { page, limit: 20, type: typeFilter || undefined })
      .then(res => {
        setLogs(res.logs);
        setPagination(res.pagination);
      })
      .catch(() => toast.error(t('common.error', 'حدث خطأ')))
      .finally(() => setLoading(false));
  }, [storeId, typeFilter, t]);

  useEffect(() => { loadLogs(1); }, [loadLogs]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('syncLogs.title', 'سجل المزامنة')}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t('syncLogs.subtitle', 'سجل عمليات المزامنة مع منصات البيع')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => navigate('/channels')}
          >
            <ArrowRight className="h-3.5 w-3.5 ms-1" />
            {t('syncLogs.back', 'العودة للقنوات')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => loadLogs(pagination.page)}
          >
            <RefreshCw className="h-3.5 w-3.5 ms-1" />
            {t('integrationHub.refresh', 'تحديث')}
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-neutral-400" />
        {TYPE_FILTERS.map(f => (
          <Button
            key={f.value}
            size="sm"
            variant={typeFilter === f.value ? 'default' : 'outline'}
            className={`text-xs ${typeFilter === f.value ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25' : 'border-neutral-200'}`}
            onClick={() => setTypeFilter(f.value)}
          >
            {t(f.label, f.fallback)}
          </Button>
        ))}
      </div>

      {/* Logs */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">{t('syncLogs.noLogs', 'لا توجد سجلات مزامنة')}</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => {
                const provider = PROVIDERS.find(p => p.code === log.providerCode);
                return (
                  <div key={log.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/50 hover:bg-white transition-colors border border-neutral-100/50">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${provider?.color || 'from-neutral-400 to-neutral-600'} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                      {log.providerName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900">{log.providerName}</span>
                        <span className="text-xs text-neutral-400">•</span>
                        <span className="text-xs text-neutral-500">
                          {log.syncType === 'orders' ? t('integrationSync.orders', 'طلبات') :
                           log.syncType === 'products' ? t('integrationSync.products', 'منتجات') :
                           log.syncType === 'inventory' ? t('integrationSync.inventory', 'مخزون') : log.syncType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-neutral-400" />
                        <span className="text-xs text-neutral-400">{formatDate(log.startedAt)}</span>
                        {log.itemsSynced > 0 && (
                          <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200 text-xs">
                            {log.itemsSynced} {t('syncLogs.items', 'عنصر')}
                          </Badge>
                        )}
                      </div>
                      {log.errorMessage && (
                        <p className="text-xs text-red-500 mt-1 truncate max-w-md">{log.errorMessage}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {log.status === 'completed' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5 ms-1" />
                          {t('integrationSync.completed', 'تم')}
                        </Badge>
                      ) : log.status === 'failed' ? (
                        <Badge className="bg-red-500/10 text-red-700 border-red-200">
                          <XCircle className="h-3.5 w-3.5 ms-1" />
                          {t('integrationSync.failed', 'فشل')}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-700 border-amber-200">
                          <RefreshCw className="h-3.5 w-3.5 ms-1 animate-spin" />
                          {t('integrationSync.running', 'قيد التشغيل')}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page <= 1}
            onClick={() => loadLogs(pagination.page - 1)}
          >
            {t('common.previous', 'السابق')}
          </Button>
          <span className="text-sm text-neutral-500 px-3">
            {t('syncLogs.page', 'صفحة')} {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => loadLogs(pagination.page + 1)}
          >
            {t('common.next', 'التالي')}
          </Button>
        </div>
      )}
    </div>
  );
}
