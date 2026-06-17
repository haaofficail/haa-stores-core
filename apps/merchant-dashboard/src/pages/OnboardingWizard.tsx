import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { settingsApi, onboardingApi, productsApi } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Store, ShoppingBag, Rocket, Check, ArrowLeft, ArrowRight, Sparkles,
  Package, Globe, CreditCard, Truck, RefreshCw,
  Loader2
} from 'lucide-react';

const steps = [
  { key: 'store', icon: Store },
  { key: 'products', icon: ShoppingBag },
  { key: 'launch', icon: Rocket },
];

function getStorefrontOrigin(): string {
  return import.meta.env.VITE_STOREFRONT_URL || window.location.origin.replace(/:5173$/, ':5174');
}

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { storeId } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');

  // Step 1: Store settings
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeColor, setStoreColor] = useState('#56a1e3');

  // Step 2: Products
  const [aiProducts, setAiProducts] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [productsStep, setProductsStep] = useState<'idle' | 'generated' | 'saving'>('idle');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());

  // Step 3: Launch
  const [checklist, setChecklist] = useState({
    storeInfo: false,
    productsReady: false,
    shippingReady: false,
    paymentReady: false,
  });

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    settingsApi.get(storeId).then((s) => {
      setStoreName(s.name || '');
      setStoreDesc(s.description || '');
      setStorePhone(s.phone || '');
      setStoreColor(s.primaryColor || '#56a1e3');
      setStoreUrl(s.slug ? `${getStorefrontOrigin()}/s/${s.slug}` : '');
    }).catch(() => {
      toast.error(t('common.error'));
    }).finally(() => setLoading(false));
  }, [storeId, t]);

  const handleSaveStore = async () => {
    if (!storeId) return;
    setSaving(true);
    try {
      await settingsApi.update(storeId, {
        name: storeName,
        description: storeDesc,
        phone: storePhone,
        primaryColor: storeColor,
      });
      setChecklist((c) => ({ ...c, storeInfo: true }));
      toast.success(t('onboarding.storeSaved'));
      setStep(1);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateProducts = async () => {
    if (!storeId) return;
    setGenerating(true);
    try {
      const result = await onboardingApi.generateProducts(storeId, {});
      let products: any[];
      try {
        products = JSON.parse(result.text);
      } catch {
        toast.error(t('onboarding.invalidResponse'));
        return;
      }
      setAiProducts(products);
      setSelectedProducts(new Set(products.map((_: any, i: number) => i)));
      setProductsStep('generated');
    } catch (e) {
      toast.error(t('common.error'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveProducts = async () => {
    if (!storeId) return;
    setProductsStep('saving');
    try {
      const toSave = aiProducts.filter((_, i) => selectedProducts.has(i));
      for (const p of toSave) {
        await productsApi.create(storeId, p);
      }
      setChecklist((c) => ({ ...c, productsReady: true }));
      toast.success(t('onboarding.productsSaved', { count: toSave.length }));
      setStep(2);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setProductsStep(prev => prev === 'saving' ? 'generated' : prev);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_done', 'true');
    navigate('/onboarding/success');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50/30 to-white">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-2xl mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50/30 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 text-white mb-4">
            <Store className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">{t('onboarding.title')}</h1>
          <p className="text-neutral-400">{t('onboarding.subtitle')}</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                i === step ? 'bg-primary-500 text-white shadow-lg' :
                i < step ? 'bg-green-50 text-green-700 border border-green-200' :
                'bg-neutral-50 text-neutral-400 border border-neutral-200'
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                <span className="hidden sm:inline">{t(`onboarding.step${i + 1}`)}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-0.5 ${i < step ? 'bg-green-300' : 'bg-neutral-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Store Info */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex p-3 rounded-2xl bg-neutral-100 text-neutral-400">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">{t('onboarding.storeStepTitle')}</h2>
                    <p className="text-sm text-neutral-400">{t('onboarding.storeStepDesc')}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-900">{t('settings.storeName')}</Label>
                      <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder={t('onboarding.storeNamePlaceholder')} className="h-9 text-sm rounded-xl border border-neutral-200" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-900">{t('settings.phone')}</Label>
                      <Input dir="ltr" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="966500000000" className="h-9 text-sm rounded-xl border border-neutral-200" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-neutral-900">{t('settings.description')}</Label>
                    <textarea value={storeDesc} onChange={(e) => setStoreDesc(e.target.value)} rows={3} placeholder={t('onboarding.storeDescPlaceholder')} className="flex w-full rounded-xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical min-h-[80px]" />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-900">{t('onboarding.storeColor')}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={storeColor}
                          onChange={(e) => setStoreColor(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-200 p-0.5"
                        />
                        <span className="text-sm text-neutral-400 font-mono">{storeColor}</span>
                      </div>
                    </div>
                  </div>

                  {storeUrl && (
                    <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-neutral-100">
                      <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                        <Globe className="h-4 w-4" />
                        <span>{t('onboarding.storeUrl')}</span>
                      </div>
                      <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium">
                        {storeUrl}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" className="h-9 text-sm" onClick={() => navigate('/dashboard')}>
                    {t('onboarding.skip')}
                  </Button>
                  <Button className="h-9 text-sm px-4" onClick={handleSaveStore} disabled={saving || !storeName.trim()}>
                    {saving ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('common.saving')}</>
                    ) : (
                      <>{t('common.next')} <ArrowLeft className="h-4 w-4 mr-2" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-2 text-sm text-neutral-400">
              <Sparkles className="h-4 w-4" />
              <span>{t('onboarding.aiTip')}</span>
            </div>
          </div>
        )}

        {/* Step 1: Products */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex p-3 rounded-2xl bg-neutral-100 text-neutral-400">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">{t('onboarding.productsStepTitle')}</h2>
                    <p className="text-sm text-neutral-400">{t('onboarding.productsStepDesc')}</p>
                  </div>
                </div>

                {productsStep === 'idle' && (
                  <div className="text-center py-12 space-y-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 text-neutral-400 mb-2">
                      <Sparkles className="h-10 w-10" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900">{t('onboarding.generateProducts')}</h3>
                    <p className="text-neutral-400 max-w-md mx-auto">{t('onboarding.generateProductsDesc')}</p>
                    <div className="flex justify-center gap-3 pt-2">
                      <Button onClick={handleGenerateProducts} disabled={generating} className="h-9 text-sm px-4 gap-2">
                        {generating ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> {t('onboarding.generating')}</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> {t('onboarding.generateWithAi')}</>
                        )}
                      </Button>
                      <Button variant="outline" className="h-9 text-sm" onClick={() => { setProductsStep('generated'); setAiProducts([]); }}>
                        {t('onboarding.skipProducts')}
                      </Button>
                    </div>
                  </div>
                )}

                {productsStep === 'generated' && (
                  <div className="space-y-4">
                    {aiProducts.length > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-neutral-400">{t('onboarding.selectProducts')}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-sm"
                            onClick={() => {
                              if (selectedProducts.size === aiProducts.length) {
                                setSelectedProducts(new Set());
                              } else {
                                setSelectedProducts(new Set(aiProducts.map((_, i) => i)));
                              }
                            }}
                          >
                            {selectedProducts.size === aiProducts.length ? t('onboarding.deselectAll') : t('onboarding.selectAll')}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {aiProducts.map((p, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                const next = new Set(selectedProducts);
                                if (next.has(i)) next.delete(i);
                                else next.add(i);
                                setSelectedProducts(next);
                              }}
                              className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                                selectedProducts.has(i)
                                  ? 'border-white/50 bg-white/80 backdrop-blur-xl shadow-card'
                                  : 'border-neutral-100 bg-white/80 backdrop-blur-xl hover:bg-neutral-50'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                selectedProducts.has(i) ? 'bg-primary-500 border-primary-500' : 'border-neutral-300'
                              }`}>
                                {selectedProducts.has(i) && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-neutral-900">{p.name}</p>
                                <p className="text-xs text-neutral-400 truncate">{p.description}</p>
                              </div>
                              <div className="text-left">
                                <p className="font-bold text-primary-600">{formatNumber(p.price)} {t('common.sar')}</p>
                                <p className="text-xs text-neutral-400">{t('common.quantity')}: {p.stockQuantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50/80 backdrop-blur-xl border border-amber-200/50 text-amber-800 text-sm">
                      <RefreshCw className="h-4 w-4 shrink-0" />
                      <span>{t('onboarding.canRegenerate')}</span>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" className="h-9 text-sm" onClick={() => setStep(0)}>
                        <ArrowRight className="h-4 w-4 mr-2" /> {t('common.back')}
                      </Button>
                      <Button className="h-9 text-sm px-4" onClick={handleSaveProducts} disabled={selectedProducts.size === 0}>
                        {t('onboarding.saveAndContinue', { count: selectedProducts.size })}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Launch */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex p-3 rounded-2xl bg-neutral-100 text-neutral-400">
                    <Rocket className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">{t('onboarding.launchStepTitle')}</h2>
                    <p className="text-sm text-neutral-400">{t('onboarding.launchStepDesc')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`p-5 rounded-2xl border-2 transition-all ${
                    checklist.storeInfo ? 'border-green-200 bg-green-50/50' : 'border-neutral-100 bg-white/80 backdrop-blur-xl'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex p-3 rounded-2xl ${checklist.storeInfo ? 'bg-green-100 text-green-600' : 'bg-neutral-100 text-neutral-400'}`}>
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-neutral-900">{t('onboarding.checkStoreInfo')}</p>
                          <p className="text-xs text-neutral-400">{storeName || t('onboarding.notSet')}</p>
                        </div>
                      </div>
                      {checklist.storeInfo && <Check className="h-5 w-5 text-green-500" />}
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border-2 transition-all ${
                    checklist.productsReady ? 'border-green-200 bg-green-50/50' : 'border-neutral-100 bg-white/80 backdrop-blur-xl'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex p-3 rounded-2xl ${checklist.productsReady ? 'bg-green-100 text-green-600' : 'bg-neutral-100 text-neutral-400'}`}>
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-neutral-900">{t('onboarding.checkProducts')}</p>
                          <p className="text-xs text-neutral-400">{aiProducts.filter((_, i) => selectedProducts.has(i)).length || 0} {t('onboarding.products')}</p>
                        </div>
                      </div>
                      {checklist.productsReady && <Check className="h-5 w-5 text-green-500" />}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Badge variant="secondary" className="text-xs px-2.5 py-0.5">{t('onboarding.completed')}</Badge>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border-2 border-dashed border-neutral-200 bg-white/80 backdrop-blur-xl hover:border-neutral-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex p-3 rounded-2xl bg-neutral-100 text-neutral-400">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-neutral-900">{t('onboarding.checkShipping')}</p>
                          <p className="text-xs text-neutral-400">{t('onboarding.setupLater')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border-2 border-dashed border-neutral-200 bg-white/80 backdrop-blur-xl hover:border-neutral-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex p-3 rounded-2xl bg-neutral-100 text-neutral-400">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-neutral-900">{t('onboarding.checkPayment')}</p>
                          <p className="text-xs text-neutral-400">{t('onboarding.setupLater')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border-2 border-dashed border-neutral-200 bg-white/80 backdrop-blur-xl hover:border-neutral-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex p-3 rounded-2xl bg-neutral-100 text-neutral-400">
                          <Globe className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-neutral-900">{t('onboarding.checkDomain')}</p>
                          <p className="text-xs text-neutral-400">{t('onboarding.setupLater')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" className="h-9 text-sm" onClick={() => setStep(1)}>
                    <ArrowRight className="h-4 w-4 mr-2" /> {t('common.back')}
                  </Button>
                  <Button onClick={handleComplete} className="h-9 text-sm px-4 gap-2 bg-green-600 hover:bg-green-700">
                    <Rocket className="h-4 w-4" /> {t('onboarding.completeLaunch')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
