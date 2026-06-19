import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2, BookOpen, X } from 'lucide-react';

const PROVIDERS = [
  {
    code: 'salla', name: 'سلة', color: 'from-green-400 via-green-600 to-green-800',
    subtitle: 'تستخدم سلة بروتوكول OAuth 2.0 للربط الآمن. بعد الربط، يمكنك استيراد الطلبات والمنتجات والمخزون.',
    steps: [
      { title: 'إنشاء تطبيق في سلة', desc: 'توجه إلى لوحة تحكم سلة، ثم إلى صفحة المطورين وأنشئ تطبيقاً جديداً.' },
      { title: 'الحصول على بيانات الاعتماد', desc: 'انسخ Client ID و Client Secret من صفحة التطبيق.' },
      { title: 'إدخال رابط إعادة التوجيه', desc: 'أدخل رابط إعادة التوجيه الموجود في صفحة الاتصال.' },
      { title: 'الربط عبر OAuth', desc: 'انقر على زر الربط وستتم إعادة توجيهك إلى سلة لتأكيد الاتصال.' },
    ],
  },
  {
    code: 'zid', name: 'زد', color: 'from-blue-400 via-blue-600 to-blue-800',
    subtitle: 'تستخدم زد بروتوكول OAuth 2.0. يتطلب الربط رمزين: Authorization و X-Manager-Token.',
    steps: [
      { title: 'إنشاء تطبيق في زد', desc: 'توجه إلى صفحة المطورين في زد وأنشئ تطبيقاً جديداً.' },
      { title: 'الحصول على بيانات الاعتماد', desc: 'انسخ Client ID و Client Secret و X-Manager-Token.' },
      { title: 'الربط عبر OAuth', desc: 'انقر على زر الربط واتبع خطوات التفويض.' },
    ],
  },
  {
    code: 'noon', name: 'نون', color: 'from-amber-300 via-amber-500 to-amber-600',
    subtitle: 'تستخدم نون توكن JWT ذاتي التوقيع (RS256) بدلاً من OAuth. تحتاج Client ID ومفتاح RSA خاص.',
    steps: [
      { title: 'التسجيل كشريك في نون', desc: 'سجل كبائع في منصة نون واحصل على بيانات الاعتماد.' },
      { title: 'الحصول على Client ID والمفتاح الخاص', desc: 'من لوحة تحكم نون، احصل على Client ID ومفتاح RSA الخاص.' },
      { title: 'إدخال بيانات الاعتماد', desc: 'أدخل Client ID والمفتاح الخاص في صفحة الاتصال.' },
    ],
  },
  {
    code: 'amazon', name: 'أمازون', color: 'from-orange-400 via-orange-600 to-gray-900',
    subtitle: 'تستخدم أمازون OAuth 2.0 مع توقيع AWS Signature V4. تحتاج بيانات اعتماد AWS بالإضافة إلى بيانات تطبيق أمازون.',
    steps: [
      { title: 'التسجيل في SP-API', desc: 'سجل في برنامج Selling Partner API (SP-API) من أمازون.' },
      { title: 'إعداد IAM', desc: 'أنشئ مستخدم IAM في AWS مع صلاحيات الوصول إلى SP-API.' },
      { title: 'إدخال بيانات الاعتماد', desc: 'أدخل Client ID, Client Secret, Refresh Token, ومفاتيح AWS.' },
      { title: 'الربط عبر OAuth', desc: 'أكمل عملية OAuth 2.0 مع أمازون.' },
    ],
  },
];

export default function MarketplaceGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [active, setActive] = useState('salla');
  const current = PROVIDERS.find(p => p.code === active) || PROVIDERS[0];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-neutral-100 shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-md">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">دليل الربط</h2>
              <p className="text-xs text-neutral-500">خطوات ربط متجرك بمنصات البيع</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
            <X className="h-5 w-5 text-neutral-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {PROVIDERS.map(p => (
              <button key={p.code} onClick={() => setActive(p.code)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active === p.code ? `bg-gradient-to-r ${p.color} text-white shadow-md` : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}>
                {p.name}
              </button>
            ))}
          </div>

          {/* Colored Divider */}
          <div className={`h-1 rounded-full bg-gradient-to-r ${current.color}`} />

          {/* Subtitle */}
          <p className="text-sm text-neutral-600 leading-relaxed">{current.subtitle}</p>

          {/* Steps */}
          <div className="space-y-4">
            {current.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${current.color} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                    {i + 1}
                  </div>
                  {i < current.steps.length - 1 && <div className="w-0.5 flex-1 bg-neutral-200 my-1.5 rounded-full" />}
                </div>
                <div className="flex-1 pb-4">
                  <h4 className="text-sm font-bold text-neutral-900 mb-0.5">{step.title}</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">{step.desc}</p>
                </div>
                <div className="shrink-0 pt-1"><CheckCircle2 className="h-4 w-4 text-neutral-300" /></div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25"
            onClick={() => { onClose(); navigate(`/channels/${active}`); }}>
            <ExternalLink className="h-4 w-4 ms-1" />ربط {current.name}
          </Button>
        </div>
      </div>
    </div>
  );
}
