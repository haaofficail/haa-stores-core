import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { feedsApi, ApiClientError } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Download,
  Store,
  ShoppingBag,
  FileSpreadsheet,
  Globe,
  Layers,
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export default function MigrationHub() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const navigate = useNavigate();
  const migrationSources = [
    {
      source: 'salla',
      name: t('migration.source_salla'),
      icon: Store,
      description: t('migration.sourceDesc_salla'),
      steps: [t('migration.step1', { source: t('migration.source_salla') }), t('migration.step2'), t('migration.step3'), t('migration.step4'), t('migration.step5')],
    },
    {
      source: 'zid',
      name: t('migration.source_zid'),
      icon: ShoppingBag,
      description: t('migration.sourceDesc_zid'),
      steps: [t('migration.step1', { source: t('migration.source_zid') }), t('migration.step2'), t('migration.step3'), t('migration.step4'), t('migration.step5')],
    },
    {
      source: 'shopify',
      name: t('migration.source_shopify'),
      icon: Globe,
      description: t('migration.sourceDesc_shopify'),
      steps: [t('migration.step1', { source: t('migration.source_shopify') }), t('migration.step2'), t('migration.step3'), t('migration.step4'), t('migration.step5')],
    },
    {
      source: 'csv',
      name: t('migration.source_csv'),
      icon: FileSpreadsheet,
      description: t('migration.sourceDesc_csv'),
      steps: [t('migration.step1_csv'), t('migration.step2_csv'), t('migration.step3_csv'), t('migration.step4_csv'), t('migration.step5_csv')],
    },
  ];

  const handleDownloadTemplate = async (source: string) => {
    if (!storeId) return;
    try {
      const res = await fetch(`${BASE_URL}${feedsApi.getTemplateCsv(storeId, source)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${source}-template.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('migration.templateDownloaded'));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('common.error'));
    }
  };

  const handleDownloadGoogleFeed = async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`${BASE_URL}${feedsApi.getGoogleFeed(storeId)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'google-merchant-feed.txt';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('common.error'));
    }
  };

  const handleDownloadMetaFeed = async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`${BASE_URL}${feedsApi.getMetaFeed(storeId)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meta-catalog-feed.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('common.error'));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('migration.title')}</h1>
        <p className="text-neutral-400 mt-1">{t('migration.subtitle')}</p>
      </div>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-neutral-100">
            <ArrowRightLeft className="h-5 w-5 text-neutral-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{t('migration.fromOther')}</h2>
            <p className="text-sm text-neutral-400">{t('migration.chooseSource')}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {migrationSources.map((src) => (
            <Card key={src.source} className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="inline-flex p-3 rounded-2xl bg-neutral-100">
                    <src.icon className="h-5 w-5 text-neutral-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-neutral-900">{src.name}</CardTitle>
                    <CardDescription className="text-xs text-neutral-400 mt-0.5">{src.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-1.5 mb-4 pr-5 list-decimal text-sm text-neutral-400">
                  {src.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-9 text-sm" onClick={() => handleDownloadTemplate(src.source)}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {t('migration.downloadTemplate')}
                  </Button>
                  <Button className="h-9 text-sm px-4" onClick={() => navigate('/imports')}>
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                    {t('migration.startMigration')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-neutral-100">
            <Layers className="h-5 w-5 text-neutral-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{t('migration.feeds')}</h2>
            <p className="text-sm text-neutral-400">{t('migration.feedsDesc')}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs px-2.5 py-0.5">{t('migration.googleMerchant')}</Badge>
              </div>
              <CardDescription className="text-sm text-neutral-400 mt-2">
                {t('migration.googleMerchantDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDownloadGoogleFeed} className="h-9 text-sm px-4 w-full">
                <Download className="h-4 w-4 mr-2" />
                {t('migration.downloadGoogleFeed')}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs px-2.5 py-0.5">{t('migration.metaCatalog')}</Badge>
              </div>
              <CardDescription className="text-sm text-neutral-400 mt-2">
                {t('migration.metaCatalogDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDownloadMetaFeed} className="h-9 text-sm px-4 w-full">
                <Download className="h-4 w-4 mr-2" />
                {t('migration.downloadMetaFeed')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
