import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Headphones, Ticket, BookOpen, Search, RefreshCw, Plus, ChevronLeft,
  Clock, CheckCircle2, AlertCircle, Users, Edit3, Trash2, X,
  FileText, Eye, EyeOff, Save, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { getStoreId, supportApi } from '@/lib/api';
import { Button } from '@/components/ui/button';

/* ─── Types ─── */
interface TicketItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

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

/* ─── Config maps ─── */
const STATUS_FILTERS = ['', 'open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open:                { label: 'مفتوح',           bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  in_progress:         { label: 'قيد المراجعة',    bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  waiting_on_customer: { label: 'بانتظار العميل',  bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500'  },
  resolved:            { label: 'تم الحل',          bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed:              { label: 'مغلق',             bg: 'bg-neutral-100',text: 'text-neutral-500', dot: 'bg-neutral-400' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; stripe: string }> = {
  low:    { label: 'منخفضة', color: 'text-neutral-400', stripe: 'bg-neutral-200' },
  medium: { label: 'متوسطة', color: 'text-amber-500',   stripe: 'bg-amber-400'   },
  high:   { label: 'عالية',  color: 'text-orange-600',  stripe: 'bg-orange-400'  },
  urgent: { label: 'عاجل',   color: 'text-red-600',     stripe: 'bg-red-500'     },
};

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function relativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  const d = Math.floor(h / 24);
  if (h < 1) return 'منذ قليل';
  if (h < 24) return `منذ ${h} س`;
  if (d === 1) return 'أمس';
  if (d < 7) return `منذ ${d} أيام`;
  return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}

const EMPTY_FORM = { title: '', slug: '', content: '', category: '', isPublished: false, sortOrder: 0 };

/* ═══════════════════════════════════════════════════════
   TICKETS TAB
═══════════════════════════════════════════════════════ */
function TicketsTab({ storeId }: { storeId: number }) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback((quiet = false) => {
    if (!storeId) return;
    if (quiet) setRefreshing(true); else setLoading(true);
    supportApi.listTickets(storeId, statusFilter || undefined)
      .then(d => setTickets(d.tickets))
      .catch(() => toast.error('فشل تحميل التذاكر'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [storeId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tickets;
    const q = search.toLowerCase();
    return tickets.filter(t => t.subject.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [tickets, search]);

  const stats = useMemo(() => ({
    total:    tickets.length,
    open:     tickets.filter(t => t.status === 'open').length,
    progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }), [tickets]);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي التذاكر', value: stats.total,    Icon: Ticket,        iconCls: 'text-neutral-500', bg: 'bg-neutral-50'  },
          { label: 'مفتوحة',         value: stats.open,     Icon: AlertCircle,   iconCls: 'text-amber-600',   bg: 'bg-amber-50'    },
          { label: 'قيد المعالجة',   value: stats.progress, Icon: Clock,         iconCls: 'text-blue-600',    bg: 'bg-blue-50'     },
          { label: 'تم الحل',        value: stats.resolved, Icon: CheckCircle2,  iconCls: 'text-emerald-600', bg: 'bg-emerald-50'  },
        ].map(({ label, value, Icon, iconCls, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`h-4 w-4 ${iconCls}`} />
            </div>
            <div className="text-2xl font-bold text-neutral-900">{value}</div>
            <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {s ? (STATUS_CONFIG[s]?.label ?? s) : 'الكل'}
              </button>
            ))}
          </div>
          <button onClick={() => load(true)} disabled={refreshing} className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors shrink-0">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="بحث بالموضوع أو اسم العميل..."
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 py-20 flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center">
            <Ticket className="h-8 w-8 text-neutral-300" />
          </div>
          <p className="font-semibold text-neutral-700">لا توجد تذاكر</p>
          <p className="text-sm text-neutral-400">
            {search ? 'لم يتم العثور على نتائج' : 'لم يتواصل عملاؤك بعد عبر نظام التذاكر'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => {
            const sc = STATUS_CONFIG[ticket.status] ?? { label: ticket.status, bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-400' };
            const pc = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.medium;
            return (
              <Link
                key={ticket.id}
                to={`/support/tickets/${ticket.id}`}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all group"
              >
                {/* Priority stripe */}
                <div className={`w-1 h-12 rounded-full shrink-0 ${pc.stripe}`} />

                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {initials(ticket.name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-neutral-400 font-mono shrink-0">#{ticket.id}</span>
                    <h3 className="font-semibold text-neutral-900 truncate text-sm">{ticket.subject}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ticket.name}</span>
                    <span>{relativeDate(ticket.createdAt)}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>
                  <span className={`text-xs font-medium ${pc.color}`}>{pc.label}</span>
                </div>

                <ChevronLeft className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   KB TAB
═══════════════════════════════════════════════════════ */
function KbTab({ storeId }: { storeId: number }) {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    supportApi.listArticles(storeId)
      .then(d => { setArticles(d.articles); setCategories(d.categories); })
      .catch(() => toast.error('فشل تحميل المقالات'))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(a: KbArticle) {
    setForm({ title: a.title, slug: a.slug, content: a.content, category: a.category ?? '', isPublished: a.isPublished, sortOrder: a.sortOrder });
    setEditingId(a.id);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
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
      cancelForm();
      load();
    } catch {
      toast.error('فشل حفظ المقال');
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!storeId || !confirm('هل أنت متأكد من حذف المقال؟')) return;
    try {
      await supportApi.deleteArticle(storeId, id);
      toast.success('تم الحذف');
      load();
    } catch {
      toast.error('فشل الحذف');
    }
  }

  async function togglePublish(a: KbArticle) {
    if (!storeId) return;
    try {
      await supportApi.updateArticle(storeId, a.id, { isPublished: !a.isPublished });
      load();
    } catch {
      toast.error('فشل تغيير حالة النشر');
    }
  }

  const filtered = useMemo(() => articles.filter(a => {
    const matchCat = !catFilter || a.category === catFilter;
    const matchSearch = !search || a.title.includes(search) || a.content.includes(search);
    return matchCat && matchSearch;
  }), [articles, catFilter, search]);

  const publishedCount = articles.filter(a => a.isPublished).length;
  const draftCount = articles.length - publishedCount;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'إجمالي المقالات', value: articles.length, Icon: FileText,      iconCls: 'text-neutral-500', bg: 'bg-neutral-50'  },
          { label: 'منشورة',          value: publishedCount,   Icon: Eye,           iconCls: 'text-emerald-600', bg: 'bg-emerald-50'  },
          { label: 'مسودات',          value: draftCount,       Icon: EyeOff,        iconCls: 'text-neutral-400', bg: 'bg-neutral-50'  },
        ].map(({ label, value, Icon, iconCls, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`h-4 w-4 ${iconCls}`} />
            </div>
            <div className="text-2xl font-bold text-neutral-900">{value}</div>
            <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Article Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-800">
              {editingId ? 'تعديل المقال' : 'مقال جديد'}
            </h3>
            <button onClick={cancelForm} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">عنوان المقال *</label>
              <input
                type="text" value={form.title}
                onChange={e => {
                  const title = e.target.value;
                  const slug = title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                  setForm(f => ({ ...f, title, slug: editingId ? f.slug : slug }));
                }}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="مثال: كيف أضيف منتجاً جديداً؟"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">الرابط المختصر *</label>
              <input
                type="text" value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                placeholder="how-to-add-product"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">المحتوى *</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
              placeholder="اكتب محتوى المقال هنا..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">التصنيف</label>
              {categories.length > 0 ? (
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">بدون تصنيف</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input
                  type="text" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="اكتب تصنيفاً جديداً"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">الترتيب</label>
              <input
                type="number" value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setForm(f => ({ ...f, isPublished: !f.isPublished }))}
                className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${form.isPublished ? 'bg-emerald-500' : 'bg-neutral-200'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPublished ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm text-neutral-700">نشر المقال</span>
            </label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={cancelForm}>
                <RotateCcw className="h-3.5 w-3.5" /> إلغاء
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !form.title || !form.content || !form.slug}>
                <Save className="h-3.5 w-3.5" />
                {saving ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'حفظ'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters + Add Button */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
          <button
            onClick={() => setCatFilter('')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!catFilter ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
          >
            الكل
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c === catFilter ? '' : c)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${catFilter === c ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
            >
              {c}
            </button>
          ))}
          </div>
          {!showForm && (
            <Button size="sm" onClick={openNew} className="shrink-0">
              <Plus className="h-4 w-4" /> مقال جديد
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="بحث في المقالات..."
          />
        </div>
      </div>

      {/* Articles */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center">
            <BookOpen className="h-7 w-7 text-neutral-300" />
          </div>
          <p className="font-semibold text-neutral-700">لا توجد مقالات</p>
          <p className="text-sm text-neutral-400">ابدأ بإضافة أول مقال لمساعدة عملائك</p>
          {!showForm && (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4" /> إضافة مقال
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(article => (
            <div key={article.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 transition-colors">
              {/* Status dot */}
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${article.isPublished ? 'bg-emerald-500' : 'bg-neutral-300'}`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-neutral-900 text-sm truncate">{article.title}</h3>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${article.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {article.isPublished ? 'منشور' : 'مسودة'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <span className="font-mono">/{article.slug}</span>
                  {article.category && <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">{article.category}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => togglePublish(article)}
                  className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-emerald-600 transition-colors"
                  title={article.isPublished ? 'إلغاء النشر' : 'نشر'}
                >
                  {article.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEdit(article)}
                  className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                  title="تعديل"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(article.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
                  title="حذف"
                >
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

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
type Tab = 'tickets' | 'kb';

export default function SupportPage() {
  const storeId = Number(getStoreId());
  const [tab, setTab] = useState<Tab>('tickets');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
          <Headphones className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">مركز الدعم</h1>
          <p className="text-sm text-neutral-500 mt-0.5">إدارة التذاكر ومحتوى قاعدة المعرفة</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'tickets'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Ticket className="h-4 w-4" />
          تذاكر الدعم
        </button>
        <button
          onClick={() => setTab('kb')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'kb'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          قاعدة المعرفة
        </button>
      </div>

      {/* Tab content */}
      {tab === 'tickets' ? (
        <TicketsTab storeId={storeId} />
      ) : (
        <KbTab storeId={storeId} />
      )}
    </div>
  );
}
