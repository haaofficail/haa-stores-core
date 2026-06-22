import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { marketplaceApi } from '@/lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight, RefreshCw, Unlink, Package, ExternalLink, Trash2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const PROVIDER_META: Record<string, { name: string; color: string }> = {
  salla: { name: 'سلة', color: 'from-green-400 via-green-600 to-green-800' },
  zid: { name: 'زد', color: 'from-primary-400 via-primary-600 to-primary-800' },
  noon: { name: 'نون', color: 'from-amber-300 via-amber-500 to-amber-600' },
  amazon: { name: 'أمازون', color: 'from-orange-400 via-orange-600 to-gray-900' },
};

export default function MarketplaceDetailPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const { provider } = useParams<{ provider: string }>();
  const navigate = useNavigate();
  const meta = PROVIDER_META[provider || ''] || { name: provider || '', color: 'from-neutral-400 to-neutral-600' };

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'listings'>('info');
  const [deletingListing, setDeletingListing] = useState<number | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const [noonCreds, setNoonCreds] = useState({ clientId: '', privateKey: '', sellerName: '', partnerId: '', warehouseCode: '' });
  const [amazonCreds, setAmazonCreds] = useState({ clientId: '', clientSecret: '', refreshToken: '', awsAccessKey: '', awsSecretKey: '' });
  const [amazonMarketplaceId, setAmazonMarketplaceId] = useState('sa');
  const usesOAuth = provider === 'salla' || provider === 'zid';
  const usesManualCreds = provider === 'noon' || provider === 'amazon';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') { toast.success(t('marketplaceDetail.connectedSuccess', 'تم الربط بنجاح')); window.history.replaceState({}, '', window.location.pathname); }
    if (params.get('error')) { toast.error(params.get('error')); window.history.replaceState({}, '', window.location.pathname); }
  }, [t]);

  const loadInfo = useCallback(() => {
    if (!storeId || !provider) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      marketplaceApi.list(storeId),
      marketplaceApi.getSales(storeId, provider).catch(() => null),
    ]).then(([list, sales]) => {
      const prov = list.find((p: any) => p.code === provider);
      if (prov?.connected) {
        setConnected(true);
        if (sales) setSalesData(sales);
        marketplaceApi.getInfo(storeId, provider).then(setStoreInfo).catch(() => toast.error('فشل تحميل البيانات'));
        marketplaceApi.listListings(storeId, provider).then(setListings).catch(() => toast.error('فشل تحميل البيانات'));
      }
    }).catch(() => toast.error(t('marketplaceDetail.loadError', 'فشل تحميل البيانات')))
    .finally(() => setLoading(false));
  }, [storeId, provider, t]);

  useEffect(() => { loadInfo(); }, [loadInfo]);

  async function handleConnect() {
    if (!storeId || !provider) return;
    if (usesOAuth) {
      setConnecting(true);
      try {
        const res: any = await marketplaceApi.connect(storeId, provider, {});
        if (res.url) window.location.href = res.url;
      } catch (err: any) { toast.error(err?.message || t('marketplaceDetail.error', 'حدث خطأ')); }
      finally { setConnecting(false); }
      return;
    }
    if (usesManualCreds) {
      const hasValidCreds = provider === 'noon'
        ? (noonCreds.clientId && noonCreds.privateKey)
        : (amazonCreds.clientId && amazonCreds.clientSecret);
      if (!hasValidCreds) { toast.error(t('marketplaceDetail.enterCredentials', 'يرجى إدخال بيانات الاعتماد')); return; }
      setConnecting(true);
      try {
        const creds = provider === 'noon'
          ? { clientId: noonCreds.clientId, privateKey: noonCreds.privateKey, sellerName: noonCreds.sellerName || undefined, partnerId: noonCreds.partnerId || undefined, warehouseCode: noonCreds.warehouseCode || undefined }
          : { clientId: amazonCreds.clientId, clientSecret: amazonCreds.clientSecret, refreshToken: amazonCreds.refreshToken, awsAccessKey: amazonCreds.awsAccessKey, awsSecretKey: amazonCreds.awsSecretKey, marketplaceId: amazonMarketplaceId };
        await marketplaceApi.connect(storeId, provider, creds);
        toast.success(t('marketplaceDetail.connectedSuccess', 'تم الربط بنجاح'));
        loadInfo();
      } catch (err: any) { toast.error(err?.message || t('marketplaceDetail.error', 'حدث خطأ')); }
      finally { setConnecting(false); }
    }
  }

  async function handleDisconnect() {
    if (!storeId || !provider) return;
    setConfirmDisconnect(false);
    try { await marketplaceApi.disconnect(storeId, provider); setConnected(false); setStoreInfo(null); setListings([]); toast.success(t('marketplaceDetail.disconnected', 'تم الفصل')); }
    catch { toast.error(t('marketplaceDetail.disconnectFailed', 'فشل الفصل')); }
  }

  async function handleSync() {
    if (!storeId || !provider) return;
    setSyncing(true);
    try { const orders = await marketplaceApi.syncOrders(storeId, provider); toast.success(t('marketplaceDetail.importedOrders', `تم استيراد ${orders.length || 0} طلب`)); loadInfo(); }
    catch { toast.error(t('marketplaceDetail.syncFailed', 'فشل المزامنة')); }
    finally { setSyncing(false); }
  }

  async function handleDeleteListing(listingId: number) {
    if (!storeId || !provider) return;
    setDeletingListing(listingId);
    try { await marketplaceApi.deleteListing(storeId, provider, listingId); toast.success(t('marketplaceDetail.listingDeleted', 'تم حذف المنتج')); loadInfo(); }
    catch { toast.error(t('marketplaceDetail.deleteFailed', 'فشل الحذف')); }
    finally { setDeletingListing(null); }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4"><div className="h-10 w-48 bg-neutral-100 rounded-2xl" /><div className="h-40 bg-neutral-100 rounded-3xl" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Back nav — touch target ≥ 44x44 (WCAG 2.5.5). */}
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate('/channels')} aria-label={t('common.back', 'رجوع')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white shadow-lg font-bold text-sm`}>
          {t('marketplaceDetail.provider.' + provider, meta.name).charAt(0)}
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{t('marketplaceDetail.provider.' + provider, meta.name)}</h1>
          <p className="text-xs text-neutral-500">{t('marketplaceDetail.pageSubtitle', 'تفاصيل الاتصال وإدارة القناة')}</p>
        </div>
        <Badge className={`me-auto ${connected ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-500'}`}>
          {connected ? t('marketplaceDetail.connected', 'متصل') : t('marketplaceDetail.disconnected', 'غير متصل')}
        </Badge>
      </div>

      {!connected ? (
        <Card className="overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center text-neutral-400 text-2xl font-bold">
              {t('marketplaceDetail.provider.' + provider, meta.name).charAt(0)}
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">{t('marketplaceDetail.notConnected', 'غير متصل')}</h2>
            <p className="text-sm text-neutral-500 mb-6">{t('marketplaceDetail.connectPrompt', `اربط متجر ${meta.name} للبدء في مزامنة المنتجات والطلبات`)}</p>

            {usesManualCreds && provider === 'noon' && (
              <div className="max-w-md mx-auto text-start space-y-4 mb-6">
                {(['clientId', 'privateKey', 'sellerName', 'partnerId', 'warehouseCode'] as const).map(field => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-sm font-medium text-neutral-700">
                      {field === 'clientId' ? 'Client ID' : field === 'privateKey' ? 'Private Key' : field === 'sellerName' ? 'Seller Name' : field === 'partnerId' ? 'Partner ID' : 'Warehouse Code'}
                    </Label>
                    {field === 'privateKey' ? (
                      <textarea dir="ltr" className="w-full rounded-xl border border-neutral-200 bg-white/50 p-3 text-sm font-mono text-end resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30" rows={3}
                        placeholder="-----BEGIN RSA PRIVATE KEY----- ..."
                        value={noonCreds[field]} onChange={(e) => setNoonCreds({ ...noonCreds, [field]: e.target.value })} />
                    ) : (
                      <Input dir="ltr" className="text-end rounded-xl border-neutral-200 bg-white/50" placeholder={t('marketplaceDetail.enterField', `ادخل ${field}`)}
                        value={noonCreds[field]} onChange={(e) => setNoonCreds({ ...noonCreds, [field]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
            )}
            {usesManualCreds && provider === 'amazon' && (
              <div className="max-w-md mx-auto text-start space-y-4 mb-6">
                {(['clientId', 'clientSecret', 'refreshToken', 'awsAccessKey', 'awsSecretKey'] as const).map(field => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-sm font-medium text-neutral-700">
                      {field === 'clientId' ? 'Client ID' : field === 'clientSecret' ? 'Client Secret' : field === 'refreshToken' ? 'Refresh Token' : field === 'awsAccessKey' ? 'AWS Access Key' : 'AWS Secret Key'}
                    </Label>
                    {field === 'clientSecret' ? (
                      <textarea dir="ltr" className="w-full rounded-xl border border-neutral-200 bg-white/50 p-3 text-sm font-mono text-end resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30" rows={3}
                        placeholder="SP-API Client Secret"
                        value={amazonCreds[field]} onChange={(e) => setAmazonCreds({ ...amazonCreds, [field]: e.target.value })} />
                    ) : (
                      <Input dir="ltr" className="text-end rounded-xl border-neutral-200 bg-white/50" placeholder={t('marketplaceDetail.enterField', `ادخل ${field}`)}
                        value={amazonCreds[field]} onChange={(e) => setAmazonCreds({ ...amazonCreds, [field]: e.target.value })} />
                    )}
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-neutral-700">{t('marketplaceDetail.marketplace', 'السوق')}</Label>
                  <select value={amazonMarketplaceId} onChange={(e) => setAmazonMarketplaceId(e.target.value)} className="w-full rounded-xl border border-neutral-200 bg-white/50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                    <option value="sa">{t('marketplaceDetail.country.sa', 'السعودية')}</option><option value="ae">{t('marketplaceDetail.country.ae', 'الإمارات')}</option><option value="eg">{t('marketplaceDetail.country.eg', 'مصر')}</option>
                    <option value="us">{t('marketplaceDetail.country.us', 'الولايات المتحدة')}</option><option value="uk">{t('marketplaceDetail.country.uk', 'بريطانيا')}</option><option value="de">{t('marketplaceDetail.country.de', 'ألمانيا')}</option>
                  </select>
                </div>
              </div>
            )}

            <Button className="rounded-md bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25" onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 ms-1 animate-spin" /> : <ExternalLink className="h-4 w-4 ms-1" />}
              {connecting ? t('marketplaceDetail.connecting', 'جاري...') : t('marketplaceDetail.connectButton', `ربط ${meta.name}`)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          {salesData && (
            <div className="grid gap-4 grid-cols-3">
              {[
                { label: t('marketplaceDetail.stat.totalSales', 'إجمالي المبيعات'), value: formatNumber(salesData.totalSales || 0), suffix: t('marketplaceDetail.currency', 'ر.س'), gradient: 'from-emerald-400 to-emerald-600' },
                { label: t('marketplaceDetail.stat.totalOrders', 'إجمالي الطلبات'), value: String(salesData.totalOrders || 0), suffix: '', gradient: 'from-primary-400 to-primary-600' },
                { label: t('marketplaceDetail.stat.marketedProducts', 'المنتجات المسوقة'), value: String(listings.length), suffix: '', gradient: 'from-amber-400 to-amber-600' },
              ].map(s => (
                <Card key={s.label} className="overflow-hidden">
                  <CardContent className="p-5">
                    <p className="text-2xl font-bold text-neutral-900 tabular-nums">{s.value}<span className="text-sm font-medium text-neutral-400 ms-1">{s.suffix}</span></p>
                    <p className="text-xs text-neutral-500 mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-neutral-100 rounded-2xl p-1 w-fit">
            {[
              { key: 'info', label: t('marketplaceDetail.tab.info', 'معلومات الاتصال') },
              { key: 'listings', label: t('marketplaceDetail.tab.listings', `المنتجات المسوقة (${listings.length})`) },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg text-neutral-900">{t('marketplaceDetail.contactInfo', 'معلومات الاتصال')}</h3>
                  {confirmDisconnect ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-medium">تأكيد الفصل؟</span>
                      <Button variant="destructive" size="sm" className="text-xs" onClick={handleDisconnect}>
                        {t('marketplaceDetail.yes', 'نعم')}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setConfirmDisconnect(false)}>
                        {t('marketplaceDetail.no', 'لا')}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 text-xs" onClick={() => setConfirmDisconnect(true)}>
                      <Unlink className="h-3.5 w-3.5 ms-1" />{t('marketplaceDetail.disconnect', 'فصل')}
                    </Button>
                  )}
                </div>
                {storeInfo && (
                  <div className="space-y-3">
                    {[
                      { label: t('marketplaceDetail.storeName', 'اسم المتجر'), value: storeInfo.name },
                      { label: t('marketplaceDetail.email', 'البريد الإلكتروني'), value: storeInfo.email || '—' },
                      { label: t('marketplaceDetail.storeId', 'معرف المتجر'), value: storeInfo.storeId },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-sm py-2 border-b border-neutral-100 last:border-0">
                        <span className="text-neutral-500">{item.label}</span>
                        <span className="font-medium text-neutral-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-5 flex gap-2">
                  <Button className="rounded-md bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md text-sm" onClick={handleSync} disabled={syncing}>
                    <RefreshCw className={`h-4 w-4 ms-1 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? t('marketplaceDetail.syncing', 'جاري...') : t('marketplaceDetail.syncOrders', 'مزامنة الطلبات')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'listings' && (
            <Card className="overflow-hidden">
              <div className="p-6 pb-0">
                <h3 className="font-bold text-lg text-neutral-900">{t('marketplaceDetail.marketedProducts', 'المنتجات المسوقة')}</h3>
              </div>
              {listings.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">{t('marketplaceDetail.noProducts', 'لا توجد منتجات مسوقة بعد')}</p>
                  <p className="text-xs text-neutral-400 mt-1">{t('marketplaceDetail.publishHint', 'انشر منتجاتك من صفحة المنتجات')}</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {listings.map((listing: any) => (
                    <div key={listing.id} className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">{listing.marketplaceSku || `#${listing.id}`}</p>
                        <p className="text-xs text-neutral-400">{listing.price && `${formatNumber(listing.price)} ${t('marketplaceDetail.currency', 'ر.س')}`} {listing.quantity != null && `${t('marketplaceDetail.quantityLabel', '— كمية: ')}${listing.quantity}`}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={listing.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200 text-xs' : 'bg-neutral-100 text-neutral-500 text-xs'}>
                          {listing.status === 'active' ? t('marketplaceDetail.status.active', 'نشط') : t('marketplaceDetail.status.inactive', 'غير نشط')}
                        </Badge>
                        {listing.marketplaceUrl && (
                          <a href={listing.marketplaceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button onClick={() => handleDeleteListing(listing.id)} disabled={deletingListing === listing.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
                          {deletingListing === listing.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
