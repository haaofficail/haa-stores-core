import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Plus, Search, Edit3, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { getStoreId, supportApi } from '@/lib/api';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Button } from '@/components/ui/button';

interface KbArticle {
  id: number;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}

const emptyForm = { title: '', slug: '', content: '', category: '', isPublished: false, sortOrder: 0 };

export default function SupportKb() {
  const { t } = useTranslation();
  const storeId = Number(getStoreId());
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  function load() {
    if (!storeId) return;
    setLoading(true);
    setFetchError(false);
    supportApi.listArticles(storeId)
      .then(d => { setArticles(d.articles); setCategories(d.categories); })
      .catch((err) => {
        console.error(err);
        setFetchError(true);
        toast.error('فشل تحميل المقالات');
      })
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load recreated each render; effect intentionally runs on [storeId] only to avoid a fetch/re-run loop
  useEffect(() => { load(); }, [storeId]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSave() {
    if (!storeId || !form.title || !form.content || !form.slug) return;
    setSaving(true);
    try {
      if (editingId) {
        await supportApi.updateArticle(storeId, editingId, form);
        toast.success('تم تحديث المقال');
      } else {
        await supportApi.createArticle(storeId, form);
        toast.success('تم حفظ المقال');
      }
      resetForm();
      load();
    } catch (err) {
      console.error(err);
      toast.error('فشل حفظ المقال');
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!storeId || !confirm(t('support.kb.confirmDelete', 'هل أنت متأكد من حذف المقال؟'))) return;
    try {
      await supportApi.deleteArticle(storeId, id);
      load();
    } catch (err) {
      console.error(err);
      toast.error('فشل حذف المقال');
    }
  }

  function startEdit(article: KbArticle) {
    setForm({
      title: article.title,
      slug: article.slug,
      content: article.content,
      category: article.category || '',
      isPublished: article.isPublished,
      sortOrder: article.sortOrder,
    });
    setEditingId(article.id);
    setShowForm(true);
  }

  async function togglePublish(article: KbArticle) {
    if (!storeId) return;
    try {
      await supportApi.updateArticle(storeId, article.id, { isPublished: !article.isPublished });
      load();
    } catch (err) {
      console.error(err);
      toast.error('فشل تغيير حالة النشر');
    }
  }

  const filtered = articles.filter(a =>
    !searchQuery || a.title.includes(searchQuery) || a.content.includes(searchQuery)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">{t('support.kb.title', 'قاعدة المعرفة')}</h1>
            <p className="text-sm text-neutral-500">{articles.length} {t('support.kb.articles', 'مقال')}</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> {t('support.kb.add', 'إضافة مقال')}
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pe-10 px-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={t('support.kb.search', 'بحث...')} />
      </div>

      {showForm && (
        <div className="mb-6 p-5 rounded-xl border border-primary-200 bg-primary-50/50 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('support.kb.titleField', 'العنوان')}</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('support.kb.slug', 'الرابط المختصر')}</label>
              <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('support.kb.content', 'المحتوى')}</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={8}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('support.kb.category', 'التصنيف')}</label>
              {categories.length > 0 ? (
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">{t('support.kb.noCategory', 'بدون تصنيف')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('support.kb.sortOrder', 'الترتيب')}</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })}
                className="rounded border-neutral-300" />
              {t('support.kb.publish', 'نشر')}
            </label>
            <div className="flex-1" />
            <Button variant="outline" onClick={resetForm}>
              {t('common.cancel', 'إلغاء')}
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.content || !form.slug}>
              {saving ? t('common.saving', 'جاري الحفظ...') : editingId ? t('common.update', 'تحديث') : t('common.save', 'حفظ')}
            </Button>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton /> : fetchError ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">{t('support.kb.loadError', 'تعذّر تحميل المقالات، حاول مجدداً')}</p>
          <Button className="mt-4" onClick={load}>
            {t('common.retry', 'إعادة المحاولة')}
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">{t('support.kb.noArticles', 'لا توجد مقالات')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(article => (
            <div key={article.id} className="flex items-center gap-4 p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-neutral-900 truncate">{article.title}</h3>
                  {article.isPublished ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">{t('support.kb.published', 'منشور')}</span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-xs font-medium">{t('support.kb.draft', 'مسودة')}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                  <span>/{article.slug}</span>
                  {article.category && <span>{article.category}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Row action icons — hit area ≥ 44x44 (WCAG 2.5.5). */}
                <button onClick={() => togglePublish(article)}
                  aria-label={article.isPublished ? t('support.kb.unpublish', 'إلغاء النشر') : t('support.kb.publish', 'نشر')}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400"
                  title={article.isPublished ? t('support.kb.unpublish', 'إلغاء النشر') : t('support.kb.publish', 'نشر')}>
                  {article.isPublished ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </button>
                <button onClick={() => startEdit(article)}
                  aria-label={t('common.edit', 'تعديل')}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-primary-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(article.id)}
                  aria-label={t('common.delete', 'حذف')}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
