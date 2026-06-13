import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Package, ShoppingCart, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { exportsApi } from '@/lib/api';

const EXPORT_TYPES = ['products', 'orders', 'customers', 'wallet'] as const;

const exportConfig: Record<string, { icon: React.ReactNode; titleKey: string; descKey: string }> = {
  products: {
    icon: <Package className="h-10 w-10 text-blue-500" />,
    titleKey: 'exports.products.title',
    descKey: 'exports.products.description',
  },
  orders: {
    icon: <ShoppingCart className="h-10 w-10 text-green-500" />,
    titleKey: 'exports.orders.title',
    descKey: 'exports.orders.description',
  },
  customers: {
    icon: <Users className="h-10 w-10 text-amber-500" />,
    titleKey: 'exports.customers.title',
    descKey: 'exports.customers.description',
  },
  wallet: {
    icon: <Wallet className="h-10 w-10 text-purple-500" />,
    titleKey: 'exports.wallet.title',
    descKey: 'exports.wallet.description',
  },
};

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export default function Exports() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = useCallback(async (type: string) => {
    if (!storeId) return;
    if (!(type in exportsApi)) { toast.error('Invalid export type'); return; }
    setDownloading(type);
    try {
      const url = exportsApi[type as keyof typeof exportsApi](storeId);
      const token = getToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message || t('exports.downloadError'));
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${type}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success(t('exports.downloadSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('exports.downloadError'));
    } finally {
      setDownloading(null);
    }
  }, [storeId, t]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('exports.title')}</h1>
        <p className="text-neutral-400 text-sm mt-1">{t('exports.description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {EXPORT_TYPES.map((type) => {
          const config = exportConfig[type];
          return (
            <div key={type} className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  {config.icon}
                  <h3 className="text-lg font-bold text-neutral-900">{t(config.titleKey)}</h3>
                </div>
                <p className="text-sm text-neutral-500 mb-4">{t(config.descKey)}</p>
                <Button
                  onClick={() => handleDownload(type)}
                  disabled={downloading === type}
                  className="h-9 text-sm px-4"
                >
                  {downloading === type ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {downloading === type ? t('exports.downloading') : t('exports.download')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
