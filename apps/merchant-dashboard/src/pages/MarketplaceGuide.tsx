import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, BookOpen, ExternalLink, Store,
} from 'lucide-react';

const PROVIDERS = [
  {
    code: 'salla', name: 'سلة', color: 'from-green-400 via-green-600 to-green-800',
    subtitle: 'marketplaceGuide.salla.subtitle',
    steps: [
      { title: 'marketplaceGuide.salla.step1Title', desc: 'marketplaceGuide.salla.step1Desc' },
      { title: 'marketplaceGuide.salla.step2Title', desc: 'marketplaceGuide.salla.step2Desc' },
      { title: 'marketplaceGuide.salla.step3Title', desc: 'marketplaceGuide.salla.step3Desc' },
      { title: 'marketplaceGuide.salla.step4Title', desc: 'marketplaceGuide.salla.step4Desc' },
    ],
  },
  {
    code: 'zid', name: 'زد', color: 'from-blue-400 via-blue-600 to-blue-800',
    subtitle: 'marketplaceGuide.zid.subtitle',
    steps: [
      { title: 'marketplaceGuide.zid.step1Title', desc: 'marketplaceGuide.zid.step1Desc' },
      { title: 'marketplaceGuide.zid.step2Title', desc: 'marketplaceGuide.zid.step2Desc' },
      { title: 'marketplaceGuide.zid.step3Title', desc: 'marketplaceGuide.zid.step3Desc' },
    ],
  },
  {
    code: 'noon', name: 'نون', color: 'from-amber-300 via-amber-500 to-amber-600',
    subtitle: 'marketplaceGuide.noon.subtitle',
    steps: [
      { title: 'marketplaceGuide.noon.step1Title', desc: 'marketplaceGuide.noon.step1Desc' },
      { title: 'marketplaceGuide.noon.step2Title', desc: 'marketplaceGuide.noon.step2Desc' },
      { title: 'marketplaceGuide.noon.step3Title', desc: 'marketplaceGuide.noon.step3Desc' },
    ],
  },
  {
    code: 'amazon', name: 'أمازون', color: 'from-orange-400 via-orange-600 to-gray-900',
    subtitle: 'marketplaceGuide.amazon.subtitle',
    steps: [
      { title: 'marketplaceGuide.amazon.step1Title', desc: 'marketplaceGuide.amazon.step1Desc' },
      { title: 'marketplaceGuide.amazon.step2Title', desc: 'marketplaceGuide.amazon.step2Desc' },
      { title: 'marketplaceGuide.amazon.step3Title', desc: 'marketplaceGuide.amazon.step3Desc' },
      { title: 'marketplaceGuide.amazon.step4Title', desc: 'marketplaceGuide.amazon.step4Desc' },
    ],
  },
];

export default function MarketplaceGuide() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [active, setActive] = useState('salla');

  const current = PROVIDERS.find(p => p.code === active) || PROVIDERS[0];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('marketplaceGuide.title', 'دليل الربط')}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t('marketplaceGuide.subtitle', 'خطوات ربط متجرك بمنصات البيع الإلكترونية')}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => navigate('/channels')}
        >
          <ArrowRight className="h-3.5 w-3.5 ms-1" />
          {t('syncLogs.back', 'العودة للقنوات')}
        </Button>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-3 flex-wrap">
        {PROVIDERS.map(p => (
          <button
            key={p.code}
            onClick={() => setActive(p.code)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
              active === p.code
                ? `bg-gradient-to-r ${p.color} text-white shadow-lg`
                : 'bg-white/80 border border-neutral-200/50 text-neutral-700 hover:bg-white'
            }`}
          >
            <div className={`w-6 h-6 rounded-lg ${active === p.code ? 'bg-white/20' : `bg-gradient-to-br ${p.color}`} flex items-center justify-center text-white text-xs font-bold`}>
              {p.name.charAt(0)}
            </div>
            {p.name}
          </button>
        ))}
      </div>

      {/* Steps */}
      <Card className="overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${current.color}`} />
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center text-white shadow-lg`}>
              <Store className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{current.name}</h2>
              <p className="text-sm text-neutral-500">{t(current.subtitle, '')}</p>
            </div>
          </div>

          <div className="space-y-6">
            {current.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${current.color} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md`}>
                    {i + 1}
                  </div>
                  {i < current.steps.length - 1 && <div className="w-0.5 flex-1 bg-neutral-200 my-2 rounded-full" />}
                </div>
                <div className="flex-1 pb-6">
                  <h3 className="text-base font-bold text-neutral-900 mb-1">{t(step.title, step.title)}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{t(step.desc, step.desc)}</p>
                </div>
                <div className="shrink-0 pt-2">
                  <CheckCircle2 className="h-5 w-5 text-neutral-300" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-bold text-blue-900">{t('marketplaceGuide.overview', 'نظرة عامة')}</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {active === 'salla' && 'تستخدم سلة بروتوكول OAuth 2.0 للربط الآمن. بعد الربط، يمكنك استيراد الطلبات والمنتجات والمخزون.'}
                  {active === 'zid' && 'تستخدم زد بروتوكول OAuth 2.0. يتطلب الربط رمزين: Authorization و X-Manager-Token.'}
                  {active === 'noon' && 'تستخدم نون توكن JWT ذاتي التوقيع (RS256) بدلاً من OAuth. تحتاج Client ID ومفتاح RSA خاص.'}
                  {active === 'amazon' && 'تستخدم أمازون OAuth 2.0 مع توقيع AWS Signature V4. تحتاج بيانات اعتماد AWS بالإضافة إلى بيانات تطبيق أمازون.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              className="rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              onClick={() => navigate(`/channels/${active}`)}
            >
              <ExternalLink className="h-4 w-4 ms-1" />
              {t('marketplaceGuide.connect', 'ربط')} {current.name}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}