import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Coins, Loader2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loyaltyApi, type LoyaltyRules } from '@/lib/api';
import { messageFromError } from '@/lib/error-mapper';

// Loyalty settings page (L-PR-4).
//
// Lets the merchant configure their loyalty programme rules + see a live
// preview of how many points a 100 SAR order would earn. All numbers
// move server-side once the user clicks "حفظ" — the server is the
// source of truth for the rules, the preview is purely client-math
// using the same DEFAULT_LOYALTY_RULES shape from packages/loyalty-core.
export default function LoyaltyPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const storeId = user?.activeStoreId ?? 0;
  const [rules, setRules] = useState<LoyaltyRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewAmount, setPreviewAmount] = useState(100);

  useEffect(() => {
    if (!storeId) return;
    loyaltyApi
      .getSettings(storeId)
      .then((r) => {
        setRules(r);
        setLoading(false);
      })
      .catch((err) => {
        toast.error(messageFromError(err, t));
        setLoading(false);
      });
  }, [storeId, t]);

  async function handleSave() {
    if (!rules) return;
    setSaving(true);
    try {
      const updated = await loyaltyApi.updateSettings(storeId, rules);
      setRules(updated);
      toast.success(t('loyalty.saved', 'تم حفظ إعدادات الولاء'));
    } catch (err) {
      toast.error(messageFromError(err, t));
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof LoyaltyRules>(key: K, value: LoyaltyRules[K]) {
    if (!rules) return;
    setRules({ ...rules, [key]: value });
  }

  const earnedPreview = rules?.enabled
    ? Math.floor(previewAmount * (rules.earnRatePerCurrency ?? 0))
    : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" aria-hidden="true" />
      </div>
    );
  }

  if (!rules) {
    return (
      <div className="mx-auto max-w-3xl p-4 lg:p-6">
        <p className="text-sm text-danger">{t('loyalty.loadFailed', 'تعذّر تحميل الإعدادات.')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
          <Coins className="h-6 w-6 text-primary-500" aria-hidden="true" />
          {t('loyalty.title', 'نقاط الولاء')}
        </h1>
        <p className="text-sm text-neutral-500">
          {t('loyalty.subtitle', 'اضبط قواعد كسب واستبدال النقاط لعملاء متجرك.')}
        </p>
      </header>

      <section className="dashboard-card space-y-5 p-6">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-neutral-900">
            {t('loyalty.enabled', 'تفعيل برنامج الولاء')}
          </span>
          <input
            type="checkbox"
            checked={rules.enabled}
            onChange={(e) => update('enabled', e.target.checked)}
            className="h-5 w-5 cursor-pointer rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm">{t('loyalty.earnRate', 'نقاط لكل ريال')}</Label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={rules.earnRatePerCurrency}
              onChange={(e) => update('earnRatePerCurrency', Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-sm">{t('loyalty.redeemValue', 'قيمة كل نقطة (ر.س)')}</Label>
            <Input
              type="number"
              min={0}
              step={0.001}
              value={rules.redeemValuePerPoint}
              onChange={(e) => update('redeemValuePerPoint', Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-sm">{t('loyalty.minRedeem', 'الحد الأدنى للاستبدال (نقاط)')}</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={rules.minRedeemPoints}
              onChange={(e) => update('minRedeemPoints', Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-sm">{t('loyalty.maxRedeemPct', 'أقصى نسبة من الطلب (٠-١)')}</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={rules.maxRedeemPercent}
              onChange={(e) => update('maxRedeemPercent', Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-sm">{t('loyalty.expiryMonths', 'انتهاء النقاط (شهر، ٠ = لا تنتهي)')}</Label>
            <Input
              type="number"
              min={0}
              max={120}
              step={1}
              value={rules.pointsExpiryMonths}
              onChange={(e) => update('pointsExpiryMonths', Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-sm">{t('loyalty.minOrderForEarn', 'حد أدنى للطلب لكسب نقاط (ر.س)')}</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={rules.minOrderForEarn}
              onChange={(e) => update('minOrderForEarn', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            <span>{t('loyalty.save', 'حفظ الإعدادات')}</span>
          </Button>
        </div>
      </section>

      <section className="dashboard-card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary-500" aria-hidden="true" />
          {t('loyalty.previewTitle', 'حاسبة المعاينة')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-sm">{t('loyalty.previewAmount', 'قيمة الطلب (ر.س)')}</Label>
            <Input
              type="number"
              min={0}
              value={previewAmount}
              onChange={(e) => setPreviewAmount(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <p className="text-sm text-neutral-700">
              {t('loyalty.previewEarn', 'النقاط المكتسبة')}: <span className="font-bold text-primary-700">{earnedPreview}</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          {t('loyalty.previewNote', 'الحساب على الإجمالي الخاضع للكسب (بدون ضريبة/شحن ما لم تُفعّل أعلاه).')}
        </p>
      </section>
    </div>
  );
}
