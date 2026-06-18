import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; lucide icons as plain JSX
import { ArrowRight, FileText, Clock, AlertTriangle } from 'lucide-react';
import { policiesApi, type StorePolicy } from '@/lib/api';
import { useStore } from '@/hooks/useStore';
import { useTranslation } from 'react-i18next';

export default function PolicyPage() {
  const { slug, policyType } = useParams<{ slug: string; policyType: string }>();
  const { loading: storeLoading } = useStore();
  const { t } = useTranslation();
  const [policy, setPolicy] = useState<StorePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug || !policyType) return;
    setLoading(true);
    setNotFound(false);
    policiesApi.get(slug, policyType)
      .then(setPolicy)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug, policyType]);

  if (storeLoading || loading) {
    return (
      <div className="container-store py-8 space-y-6 overflow-x-hidden">
        <div className="h-10 w-48 bg-surface-2 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface-2 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container-store py-8 sm:py-12 max-w-4xl mx-auto text-center overflow-x-hidden">
        <div className="w-16 h-16 rounded-2xl bg-warning-soft flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-warning" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          {t('policy.notPublished', 'لم يتم نشر هذه السياسة بعد')}
        </h1>
        <p className="text-text-secondary mb-6">
          {t('policy.notPublishedDesc', 'التاجر لم يقم بإضافة هذه السياسة بعد. يمكنك العودة لاحقاً.' )}
        </p>
        <Link
          to={`/s/${slug}/contact`}
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
        >
          {t('policy.contact', 'تواصل مع التاجر')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-store py-8 sm:py-12 max-w-4xl mx-auto overflow-x-hidden">
      <Link
        to={`/s/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary-600 transition-colors mb-8"
      >
        <ArrowRight className="h-4 w-4" />
        {t('store.home')}
      </Link>

      {policy && (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{policy.title}</h1>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t('policy.lastUpdated', 'آخر تحديث')}: {new Date(policy.updatedAt).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="prose prose-sm sm:prose-base max-w-none">
            {policy.content.split('\n').map((paragraph, i) => (
              paragraph.trim() ? (
                <p key={i} className="text-text-secondary leading-relaxed mb-4">{paragraph}</p>
              ) : null
            ))}
          </div>
        </>
      )}
    </div>
  );
}
