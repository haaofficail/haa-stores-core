import { useState, useEffect, useMemo, useCallback, useRef, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Headphones, Search, Plus, ChevronLeft, Clock,
  CheckCircle2, AlertCircle, ShoppingCart, CreditCard,
  Truck, Package, Wrench, HelpCircle, FileText,
  ThumbsUp, ThumbsDown, X, Upload, Loader2, RefreshCw, Ticket,
} from 'lucide-react';
import { toast } from 'sonner';
import { getStoreId, supportApi, uploadFile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

/* ─── Types ─── */
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

interface TicketItem {
  id: number;
  name: string;
  email: string | null;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

/* ─── Constants ─── */
const TICKET_CATEGORIES = [
  { key: 'orders',    label: 'الطلبات',        Icon: ShoppingCart, color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   ring: 'ring-amber-200'   },
  { key: 'payments',  label: 'المدفوعات',      Icon: CreditCard,   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-200' },
  { key: 'shipping',  label: 'الشحن',          Icon: Truck,        color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    ring: 'ring-blue-200'    },
  { key: 'products',  label: 'المنتجات',       Icon: Package,      color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200',  ring: 'ring-purple-200'  },
  { key: 'technical', label: 'مشكلة تقنية',   Icon: Wrench,       color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     ring: 'ring-red-200'     },
  { key: 'other',     label: 'أخرى',           Icon: HelpCircle,   color: 'text-neutral-600', bg: 'bg-neutral-50', border: 'border-neutral-200', ring: 'ring-neutral-200' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open:                { label: 'مفتوح',         bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  in_progress:         { label: 'قيد المراجعة',  bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  waiting_on_customer: { label: 'بانتظار ردك',   bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500'  },
  resolved:            { label: 'تم الحل',        bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed:              { label: 'مغلق',           bg: 'bg-neutral-100',text: 'text-neutral-500', dot: 'bg-neutral-400' },
};

function relativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  const d = Math.floor(h / 24);
  if (h < 1) return 'منذ قليل';
  if (h < 24) return `منذ ${h} ساعة`;
  if (d === 1) return 'أمس';
  if (d < 7) return `منذ ${d} أيام`;
  return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}

/* ─── Article Card ─── */
function ArticleCard({ article, onOpen }: { article: KbArticle; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all group text-right"
    >
      <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-neutral-400 group-hover:text-primary-500 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-neutral-800 text-sm group-hover:text-primary-600 transition-colors leading-snug">
          {article.title}
        </h3>
        <p className="text-xs text-neutral-400 mt-0.5 truncate">{article.content.slice(0, 120)}</p>
        {article.category && (
          <span className="mt-1.5 inline-block px-2 py-0.5 rounded-full bg-neutral-100 text-xs text-neutral-500">
            {article.category}
          </span>
        )}
      </div>
      <ChevronLeft className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition-colors shrink-0" />
    </button>
  );
}

/* ─── Article Modal ─── */
function ArticleModal({ article, onClose, onCreateTicket }: {
  article: KbArticle;
  onClose: () => void;
  onCreateTicket: () => void;
}) {
  const [helpful, setHelpful] = useState<boolean | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-neutral-100">
          <div className="flex-1">
            {article.category && (
              <span className="text-xs text-neutral-400 font-medium mb-1 block">{article.category}</span>
            )}
            <h2 className="text-lg font-bold text-neutral-900 leading-snug">{article.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 transition-colors shrink-0 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap text-sm">{article.content}</p>
        </div>

        {/* Feedback footer */}
        <div className="border-t border-neutral-100 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">هل كان هذا مفيداً؟</span>
            {helpful === null ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHelpful(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                >
                  <ThumbsUp className="h-3.5 w-3.5" /> نعم
                </button>
                <button
                  onClick={() => setHelpful(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                >
                  <ThumbsDown className="h-3.5 w-3.5" /> لا
                </button>
              </div>
            ) : (
              <span className="text-xs text-neutral-500">
                {helpful ? '✓ شكراً على ملاحظتك' : 'حسناً، سنحسّن هذا المحتوى'}
              </span>
            )}
          </div>
          {helpful === false && (
            <button
              onClick={() => { onClose(); onCreateTicket(); }}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              إرسال تذكرة دعم ←
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Ticket Form Modal ─── */
interface Attachment { file: File; url?: string; uploading: boolean }

function TicketFormModal({ storeId, defaultName, defaultEmail, onClose, onSuccess }: {
  storeId: number;
  defaultName: string;
  defaultEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const toAdd = Array.from(files).slice(0, 5 - attachments.length);
    const pending: Attachment[] = toAdd.map(f => ({ file: f, uploading: true }));
    setAttachments(prev => [...prev, ...pending]);

    for (const att of pending) {
      try {
        const result = await uploadFile(storeId, att.file);
        setAttachments(prev =>
          prev.map(a => a.file === att.file ? { ...a, url: result.url, uploading: false } : a)
        );
      } catch {
        setAttachments(prev => prev.filter(a => a.file !== att.file));
        toast.error(`فشل رفع الصورة: ${att.file.name}`);
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const catLabel = TICKET_CATEGORIES.find(c => c.key === category)?.label ?? '';
      const fullSubject = catLabel ? `[${catLabel}] ${subject}` : subject;
      const uploadedUrls = attachments.filter(a => a.url).map(a => a.url!);
      const fullMessage = message + (uploadedUrls.length > 0
        ? `\n\n📎 الصور المرفقة:\n${uploadedUrls.join('\n')}`
        : '');

      await supportApi.createTicket(storeId, {
        name: name.trim(),
        email: defaultEmail || undefined,
        subject: fullSubject,
        message: fullMessage,
      });
      toast.success('تم إرسال تذكرتك بنجاح، سيرد عليك فريق الدعم قريباً');
      onSuccess();
    } catch {
      toast.error('فشل إرسال التذكرة، حاول مجدداً');
    }
    setSubmitting(false);
  }

  const isUploading = attachments.some(a => a.uploading);
  const canSubmit = name.trim() && subject.trim() && message.trim() && !isUploading;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[88vh] overflow-hidden flex flex-col z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-bold text-neutral-900">إرسال تذكرة دعم</h2>
            <p className="text-xs text-neutral-400 mt-0.5">سيرد عليك فريق هاء خلال 24 ساعة</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">الاسم *</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="اسمك الكامل"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">نوع المشكلة</label>
            <div className="grid grid-cols-3 gap-2">
              {TICKET_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(v => v === cat.key ? '' : cat.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                    category === cat.key
                      ? `${cat.bg} ${cat.color} ${cat.border} border-2`
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <cat.Icon className={`h-3.5 w-3.5 shrink-0 ${category === cat.key ? cat.color : 'text-neutral-400'}`} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">عنوان المشكلة *</label>
            <input
              type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="وصف مختصر للمشكلة"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">تفاصيل المشكلة *</label>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-y"
              placeholder="اشرح مشكلتك بالتفصيل حتى يتمكن فريق الدعم من مساعدتك بشكل أسرع..."
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              صور أو لقطات شاشة
              <span className="font-normal text-neutral-400 mr-1">(اختياري — حد أقصى 5)</span>
            </label>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((a, idx) => (
                  <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50">
                    {a.url ? (
                      <img src={a.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-neutral-400 animate-spin" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {attachments.length < 5 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => handleFileSelect(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500 hover:bg-neutral-50 hover:border-neutral-400 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  اضغط لرفع صور
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 px-5 py-4 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={!canSubmit || submitting}>
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري الإرسال...</>
              : 'إرسال التذكرة'
            }
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SupportPage() {
  const { user } = useAuth();
  const storeId = Number(getStoreId());

  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [kbCategories, setKbCategories] = useState<string[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KbArticle | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);

  const loadArticles = useCallback(() => {
    if (!storeId) return;
    setLoadingArticles(true);
    supportApi.listArticles(storeId)
      .then(d => { setArticles(d.articles); setKbCategories(d.categories); })
      .catch(() => toast.error('فشل تحميل المقالات'))
      .finally(() => setLoadingArticles(false));
  }, [storeId]);

  const loadTickets = useCallback(() => {
    if (!storeId) return;
    setLoadingTickets(true);
    supportApi.listTickets(storeId)
      .then(d => setTickets(d.tickets))
      .catch(() => {})
      .finally(() => setLoadingTickets(false));
  }, [storeId]);

  useEffect(() => { loadArticles(); loadTickets(); }, [loadArticles, loadTickets]);

  const filteredArticles = useMemo(() => {
    let list = articles;
    if (catFilter) list = list.filter(a => a.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q));
    }
    return list;
  }, [articles, catFilter, search]);

  const isFiltering = search.trim().length > 0 || catFilter.length > 0;

  const ticketStats = useMemo(() => ({
    open:     tickets.filter(t => t.status === 'open').length,
    active:   tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  }), [tickets]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-primary-200 text-sm font-medium mb-3">
            <Headphones className="h-4 w-4" />
            مركز دعم هاء ستورز
          </div>
          <h1 className="text-2xl font-bold mb-1">كيف يمكننا مساعدتك اليوم؟</h1>
          <p className="text-primary-200 text-sm mb-5">ابحث في قاعدة المعرفة، أو تواصل مع فريق الدعم مباشرةً</p>
          <div className="relative max-w-lg">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-white text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
              placeholder="ابحث عن مشكلتك... (مثال: كيف أضيف منتجاً)"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-4 right-12 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* ── Category Tiles (KB categories, shown when not text-searching) ── */}
      {!search.trim() && kbCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCatFilter('')}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              !catFilter ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            الكل
          </button>
          {kbCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(v => v === cat ? '' : cat)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                catFilter === cat ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Main two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* KB Articles — 2/3 width */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-neutral-900 text-base">
              {isFiltering ? `نتائج البحث (${filteredArticles.length})` : 'مقالات الدعم'}
            </h2>
            {isFiltering && (
              <button
                onClick={() => { setSearch(''); setCatFilter(''); }}
                className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> مسح الفلاتر
              </button>
            )}
          </div>

          {loadingArticles ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            /* Deflect First: no articles → prominent create-ticket CTA */
            <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-neutral-300" />
              </div>
              <h3 className="font-semibold text-neutral-800 mb-1.5">
                {isFiltering ? 'لم نجد مقالاً يطابق بحثك' : 'لا توجد مقالات دعم بعد'}
              </h3>
              <p className="text-sm text-neutral-500 mb-5">
                {isFiltering
                  ? 'لم نعثر على إجابة مناسبة؟ فريق الدعم جاهز لمساعدتك'
                  : 'سيتم إضافة مقالات مساعدة من فريق هاء قريباً'}
              </p>
              {isFiltering && (
                <Button onClick={() => setShowTicketForm(true)}>
                  <Plus className="h-4 w-4" />
                  إرسال تذكرة دعم
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredArticles.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onOpen={() => setSelectedArticle(article)}
                />
              ))}
            </div>
          )}
        </div>

        {/* My Tickets Sidebar — 1/3 width */}
        <div className="space-y-4">
          {/* Create ticket CTA */}
          <button
            onClick={() => setShowTicketForm(true)}
            className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl shadow-lg shadow-primary-500/20 hover:from-primary-600 hover:to-primary-700 transition-all group text-right"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">رفع تذكرة دعم</div>
              <div className="text-xs text-primary-200 mt-0.5">تواصل مع فريق هاء ستورز</div>
            </div>
          </button>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'مفتوحة',  value: ticketStats.open,     Icon: AlertCircle,  color: 'text-amber-600',   bg: 'bg-amber-50'   },
              { label: 'تم الحل', value: ticketStats.resolved, Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(({ label, value, Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-neutral-200 p-3">
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                <div className="text-xl font-bold text-neutral-900">{value}</div>
                <div className="text-xs text-neutral-500">{label}</div>
              </div>
            ))}
          </div>

          {/* Tickets list */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-800 text-sm">تذاكري</h2>
              <div className="flex items-center gap-2">
                {ticketStats.active > 0 && (
                  <span className="min-w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center px-1">
                    {ticketStats.active}
                  </span>
                )}
                <button
                  onClick={loadTickets}
                  className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {loadingTickets ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-neutral-100 animate-pulse" />)}
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center">
                <Ticket className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">لا توجد تذاكر بعد</p>
                <p className="text-xs text-neutral-300 mt-0.5">ابدأ بإرسال تذكرة دعم</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {tickets.slice(0, 6).map(ticket => {
                  const sc = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
                  return (
                    <Link
                      key={ticket.id}
                      to={`/support/tickets/${ticket.id}`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors group"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${sc.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-800 leading-snug line-clamp-2 group-hover:text-neutral-900">
                          {ticket.subject}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                            {sc.label}
                          </span>
                          <span className="text-xs text-neutral-400 flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {relativeDate(ticket.createdAt)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {tickets.length > 6 && (
                  <div className="px-4 py-2.5 text-center">
                    <span className="text-xs text-neutral-400">+{tickets.length - 6} تذكرة أخرى</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onCreateTicket={() => setShowTicketForm(true)}
        />
      )}

      {showTicketForm && (
        <TicketFormModal
          storeId={storeId}
          defaultName={user?.name ?? ''}
          defaultEmail={user?.email ?? ''}
          onClose={() => setShowTicketForm(false)}
          onSuccess={() => { setShowTicketForm(false); loadTickets(); }}
        />
      )}
    </div>
  );
}
