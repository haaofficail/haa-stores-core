import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Search, ChevronLeft, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supportApi, type KbArticle, type KbListResult } from '@/lib/api';

const FOCUS_VISIBLE = 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]';

export default function KnowledgeBase() {
  const { slug, articleSlug } = useParams<{ slug: string; articleSlug?: string }>();
  const { t } = useTranslation();
  const [data, setData] = useState<KbListResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [article, setArticle] = useState<KbArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setLoadError('');

    if (articleSlug) {
      supportApi.getKbArticle(slug, articleSlug)
        .then(setArticle)
        .catch(() => setLoadError(t('support.kb.notFound', 'المقال غير موجود')))
        .finally(() => setLoading(false));
    } else {
      supportApi.listKbArticles(slug, selectedCategory || undefined)
        .then(d => { setData(d); setArticle(null); })
        .catch(() => setLoadError(t('support.kb.loadError', 'حدث خطأ أثناء تحميل المقالات')))
        .finally(() => setLoading(false));
    }
  }, [slug, articleSlug, selectedCategory, t]);

  if (loading) {
    return (
      <div className="container-store py-8 space-y-6">
        <div className="h-10 w-48 bg-surface-2 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-surface-2 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (loadError && !article) {
    return (
      <div className="container-store py-12 max-w-2xl mx-auto text-center">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
        <p className="text-text-secondary">{loadError}</p>
      </div>
    );
  }

  if (article) {
    return (
      <div className="container-store py-8 sm:py-12 max-w-3xl mx-auto">
        <Link to={`/s/${slug}/support/kb`} className={`inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary-600 transition-colors mb-6 ${FOCUS_VISIBLE}`}>
          <ChevronLeft className="h-4 w-4" />
          {t('support.kb.back', 'العودة للمقالات')}
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{article.title}</h1>
            {article.category && <span className="text-xs text-text-tertiary">{article.category}</span>}
          </div>
        </div>
        <div className="prose prose-sm sm:prose-base max-w-none text-text-secondary">
          {article.content.split('\n').map((p, i) => p.trim() ? <p key={i} className="leading-relaxed mb-4">{p}</p> : null)}
        </div>
      </div>
    );
  }

  const filtered = data?.articles.filter(a =>
    !searchQuery || a.title.includes(searchQuery) || a.content.includes(searchQuery)
  ) || [];

  return (
    <div className="container-store py-8 sm:py-12 max-w-4xl mx-auto">
      <Link to={`/s/${slug}`} className={`inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary-600 transition-colors mb-8 ${FOCUS_VISIBLE}`}>
        <ArrowRight className="h-4 w-4" />
        {t('store.home')}
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
          <BookOpen className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            {t('support.kb.title')}
          </h1>
          <p className="text-text-secondary text-sm">{t('support.kb.desc')}</p>
        </div>
      </div>

      <div className="relative mt-6 mb-8">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <input
          type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className={`w-full px-4 py-3 pr-12 rounded-xl border border-border-primary bg-white text-text-primary ${FOCUS_VISIBLE}`}
          placeholder={t('support.kb.search')}
        />
      </div>

      {data && data.categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${FOCUS_VISIBLE} ${!selectedCategory ? 'bg-primary-600 text-white' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'}`}
          >
            {t('support.kb.all', 'الكل')}
          </button>
          {data.categories.map(cat => (
            <button
              key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${FOCUS_VISIBLE} ${selectedCategory === cat ? 'bg-primary-600 text-white' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-10 w-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">{t('support.kb.noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(a => (
            <Link
              key={a.id}
              to={`/s/${slug}/support/kb/${a.slug}`}
              className={`block p-5 rounded-2xl border border-border-primary hover:bg-surface-1 transition-colors ${FOCUS_VISIBLE}`}
            >
              <h3 className="font-semibold text-text-primary mb-1">{a.title}</h3>
              {a.category && <span className="text-xs text-text-tertiary">{a.category}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
