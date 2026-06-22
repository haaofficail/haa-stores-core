import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { settingsApi } from '@/lib/api';
import { getAllThemeManifests, getDefaultThemeKey, type ThemeManifest } from '@haa/theme-system/server';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Palette, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGate } from '@/lib/permissions';

// Show full runtime themes plus the platform default theme, even when the
// default is still backed by a legacy config preset.
const STORE_THEMES = getAllThemeManifests().filter(
  theme => theme.kind === 'runtime' || theme.themeKey === getDefaultThemeKey()
);

function ThemeCard({ theme, active, onApply }: { theme: ThemeManifest; active: boolean; onApply: () => void }) {
  return (
    <div className={`bg-white rounded-3xl border-2 overflow-hidden transition-all duration-300 ${active ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-neutral-200 hover:border-neutral-300 hover:shadow-lg'}`}>
      {/* Preview */}
      <div className="aspect-[4/3] relative bg-neutral-100 overflow-hidden">
        <img src={theme.preview.thumbnailUrl} alt={theme.nameAr} className="w-full h-full object-cover" loading="lazy" />
        {active && (
          <div className="absolute top-2 end-2">
            <span className="px-2 py-1 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg">
              <CheckCircle2 className="h-3 w-3" /> نشط
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="font-bold text-neutral-900 flex items-center gap-1.5">
              {theme.nameAr}
              {theme.capabilities.featured && <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
            </h3>
            <p className="text-xs text-neutral-500">{theme.author}</p>
          </div>
          {theme.capabilities.free ? (
            <Badge variant="secondary" className="text-xs">مجاني</Badge>
          ) : (
            <Badge className="text-xs">{theme.price} ريال</Badge>
          )}
        </div>
        <p className="text-sm text-neutral-600 leading-relaxed mb-4 line-clamp-2">{theme.descriptionAr}</p>
        <div className="flex gap-1.5 flex-wrap mb-3">
          <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: theme.defaultConfig.colors.primary + '20', color: theme.defaultConfig.colors.primary }}>
            {theme.defaultConfig.font.family}
          </span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 text-neutral-600">
            {theme.defaultConfig.layout.productCardColumns} أعمدة
          </span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 text-neutral-600">
            {theme.status}
          </span>
        </div>
        {theme.categories && theme.categories.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-3">
            {theme.categories.map(c => (
              <span key={c} className="px-1.5 py-0.5 text-xs rounded-md bg-primary-50 text-primary-600">{c}</span>
            ))}
          </div>
        )}
        <PermissionGate permission="theme:apply">
          <Button onClick={onApply} variant={active ? 'outline' : 'default'} className="w-full" disabled={active}>
            {active ? 'مفعل ✓' : 'تطبيق الثيم'}
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}

export default function ThemeStore() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeThemeId, setActiveThemeId] = useState('minimal');

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    settingsApi.getTheme(storeId)
      .then((config) => setActiveThemeId(config.themeKey || config.preset || 'minimal'))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleApply = useCallback(async (theme: ThemeManifest) => {
    if (!storeId) return;
    try {
      await settingsApi.updateTheme(storeId, { ...theme.defaultConfig, preset: theme.themeKey, themeKey: theme.themeKey });
      setActiveThemeId(theme.themeKey);
      toast.success(t('theme.applied', `تم تطبيق ثيم ${theme.nameAr}`));
    } catch {
      toast.error(t('common.error'));
    }
  }, [storeId, t]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-96 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Palette className="h-6 w-6" /> متجر الثيمات
          </h1>
          <p className="text-sm text-neutral-500 mt-1">اختر ثيماً لمتجرك وخصصه كما تريد</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/theme')}>
          <Palette className="h-4 w-4 ms-2" />تخصيص الثيم الحالي
        </Button>
      </div>

      {/* Featured */}
      {STORE_THEMES.filter(theme => theme.capabilities.featured).length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-lg text-neutral-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> ثيمات مميزة
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {STORE_THEMES.filter(theme => theme.capabilities.featured).map((theme) => (
              <ThemeCard key={theme.themeKey} theme={theme} active={activeThemeId === theme.themeKey} onApply={() => handleApply(theme)} />
            ))}
          </div>
        </div>
      )}

      {/* All store themes */}
      <div>
        <h2 className="font-bold text-lg text-neutral-900 mb-4">كل الثيمات</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {STORE_THEMES.map((theme) => (
            <ThemeCard key={theme.themeKey} theme={theme} active={activeThemeId === theme.themeKey} onApply={() => handleApply(theme)} />
          ))}
        </div>
      </div>
    </div>
  );
}
