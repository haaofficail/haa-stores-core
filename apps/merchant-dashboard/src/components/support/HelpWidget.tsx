import {
  useState, useEffect, useRef, useCallback,
  type KeyboardEvent,
} from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  HelpCircle, X, Search, Sparkles, MessageSquare,
  ChevronLeft, Send, Loader2, BookOpen, LifeBuoy,
  ExternalLink, RotateCcw,
} from 'lucide-react';
import { useHelp } from '@/contexts/HelpContext';
import { useAuth } from '@/hooks/useAuth';
import { getStoreId, supportApi, aiApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Per-page contextual tips ───────────────────────────────────────────────

const PAGE_TIPS: Record<string, { title: string; tip: string }> = {
  '/':               { title: 'الرئيسية',      tip: 'استعرض ملخص متجرك اليومي من البطاقات في الأعلى، وتابع الإشعارات الفورية.' },
  '/orders':         { title: 'الطلبات',       tip: 'صفّر الطلبات بالحالة أو طريقة الدفع أو التوصيل، ثم صدّرها بصيغة Excel.' },
  '/products':       { title: 'المنتجات',      tip: 'استخدم أداة AI لتوليد عنوان المنتج ووصفه تلقائياً من اسمه فقط.' },
  '/customers':      { title: 'العملاء',       tip: 'يمكنك تصدير قائمة العملاء، أو البحث بالاسم والهاتف والبريد.' },
  '/coupons':        { title: 'الكوبونات',     tip: 'حدد تاريخ انتهاء للكوبون لتجنب استخدامه بعد انتهاء الحملة.' },
  '/promotions':     { title: 'العروض',        tip: 'العروض تُطبّق تلقائياً — لا يحتاج العميل لإدخال رمز.' },
  '/reports':        { title: 'التقارير',      tip: 'اختر نطاقاً زمنياً مخصصاً للمقارنة بين فترات مختلفة.' },
  '/settings':       { title: 'الإعدادات',    tip: 'بعد تغيير الـ slug يجب تحديث الرابط في قنوات التسويق.' },
  '/marketing':      { title: 'التسويق',      tip: 'الإجراءات المُقترحة من AI تستند لسلوك عملائك الفعلي.' },
  '/support/kb':     { title: 'قاعدة المعرفة', tip: 'المقالات المنشورة تظهر للعملاء في الواجهة الأمامية لمتجرك.' },
  '/support/tickets':{ title: 'تذاكر الدعم',  tip: 'الرد الأسرع من 24 ساعة يرفع رضا العملاء بشكل ملحوظ.' },
  '/wallet':         { title: 'المحفظة',      tip: 'كل عملية مالية مسجّلة بـ ID فريد لضمان عدم التكرار.' },
  '/shipping':       { title: 'الشحن',        tip: 'أضف أكثر من منطقة شحن لتفعيل أسعار مخصصة لكل منطقة.' },
  '/employees':      { title: 'الموظفون',     tip: 'امنح الصلاحيات بدقة — لا تعطِ صلاحية "المالك" إلا للمسؤول الرئيسي.' },
  '/theme':          { title: 'محرر الثيم',   tip: 'احفظ التغييرات وانتظر ثوانٍ قبل معاينتها في المتجر.' },
  '/live':           { title: 'الرادار الحي',  tip: 'يتحدث الرادار كل 30 ثانية — ابقَ في الصفحة لمتابعة حية.' },
};

function getPageTip(pathname: string) {
  if (PAGE_TIPS[pathname]) return PAGE_TIPS[pathname];
  for (const [key, val] of Object.entries(PAGE_TIPS)) {
    if (pathname.startsWith(key) && key !== '/') return val;
  }
  return null;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface KbArticle {
  id: number;
  title: string;
  content: string;
  category: string | null;
  isPublished: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type Tab = 'articles' | 'ai' | 'contact';

// ── Main component ─────────────────────────────────────────────────────────

export function HelpWidget() {
  const { isOpen, close, toggle } = useHelp();
  const { user } = useAuth();
  const location = useLocation();
  const storeIdStr = getStoreId();
  const storeId = storeIdStr ? Number(storeIdStr) : null;

  const [tab, setTab] = useState<Tab>('articles');
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [articlesLoading, setArticlesLoading] = useState(false);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const pageTip = getPageTip(location.pathname);

  // Load articles when panel opens
  useEffect(() => {
    if (!isOpen || !storeId) return;
    setArticlesLoading(true);
    supportApi.listArticles(storeId)
      .then(r => setArticles((r.articles ?? []).filter((a: KbArticle) => a.isPublished)))
      .catch(() => {})
      .finally(() => setArticlesLoading(false));
  }, [isOpen, storeId]);

  // Scroll AI chat to bottom
  useEffect(() => {
    if (tab === 'ai') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, tab]);

  const filteredArticles = articles.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.category ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || !storeId || chatLoading) return;
    const prompt = chatInput.trim();
    setChatInput('');
    const nextHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: prompt }];
    setChatHistory(nextHistory);
    setChatLoading(true);
    try {
      const pageCtx = pageTip ? ` (المستخدم حالياً في صفحة: ${pageTip.title})` : '';
      const res = await aiApi.chat(storeId, prompt + pageCtx, chatHistory);
      const reply = res?.data?.reply ?? res?.reply ?? 'عذراً، لا يمكنني الإجابة الآن.';
      setChatHistory([...nextHistory, { role: 'assistant', content: reply }]);
    } catch {
      setChatHistory([...nextHistory, { role: 'assistant', content: 'حدث خطأ، يرجى المحاولة مجدداً.' }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatHistory, chatLoading, storeId, pageTip]);

  const onChatKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  };

  const resetChat = () => { setChatHistory([]); setChatInput(''); };

  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        aria-label="مركز المساعدة"
        className={cn(
          'fixed bottom-6 left-6 z-50',
          'w-12 h-12 rounded-full',
          'bg-primary-500 text-white',
          'shadow-lg shadow-primary-500/30',
          'flex items-center justify-center',
          'transition-all duration-200',
          'hover:bg-primary-600 hover:scale-110 hover:shadow-xl hover:shadow-primary-500/40',
          'active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400',
        )}
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-neutral-900/20 backdrop-blur-[2px]"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed bottom-0 left-0 top-0 z-50',
          'w-80 flex flex-col',
          'bg-white border-l border-neutral-200',
          'shadow-xl',
          'animate-slide-in-left',
        )}
        dir="rtl"
        role="dialog"
        aria-label="مركز المساعدة"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100">
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <LifeBuoy className="h-4 w-4 text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900">مركز المساعدة</p>
            <p className="text-xs text-neutral-400">كيف يمكننا مساعدتك؟</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={close} aria-label="إغلاق">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 px-1">
          {([
            { key: 'articles', label: 'المقالات',   icon: BookOpen },
            { key: 'ai',       label: 'مساعد AI',   icon: Sparkles },
            { key: 'contact',  label: 'تواصل',      icon: MessageSquare },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
                tab === key
                  ? 'text-primary-600 border-primary-500'
                  : 'text-neutral-500 border-transparent hover:text-neutral-700',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Articles */}
        {tab === 'articles' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setExpandedId(null); }}
                  placeholder="ابحث في المقالات..."
                  className="w-full pr-8 pl-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1 bg-neutral-50"
                />
              </div>
            </div>

            {/* Contextual tip */}
            {pageTip && !search && (
              <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl bg-primary-50 border border-primary-100">
                <p className="text-xs font-semibold text-primary-600 mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  نصيحة — {pageTip.title}
                </p>
                <p className="text-xs text-primary-700 leading-relaxed">{pageTip.tip}</p>
              </div>
            )}

            {/* Article list */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
              {articlesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">
                    {search ? `لا نتائج لـ "${search}"` : 'لا توجد مقالات منشورة'}
                  </p>
                </div>
              ) : (
                filteredArticles.map(article => (
                  <div key={article.id} className="rounded-xl border border-neutral-100 overflow-hidden">
                    <button
                      onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 text-right hover:bg-neutral-50 transition-colors"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-neutral-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-800 leading-snug">{article.title}</p>
                        {article.category && (
                          <p className="text-xs text-neutral-400 mt-0.5">{article.category}</p>
                        )}
                      </div>
                      <ChevronLeft className={cn(
                        'h-3.5 w-3.5 text-neutral-300 shrink-0 mt-0.5 transition-transform',
                        expandedId === article.id && '-rotate-90',
                      )} />
                    </button>
                    {expandedId === article.id && (
                      <div className="px-3 pb-3 pt-1 border-t border-neutral-100">
                        <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                          {article.content.slice(0, 400)}{article.content.length > 400 ? '...' : ''}
                        </p>
                        <Link
                          to="/support/kb"
                          onClick={close}
                          className="inline-flex items-center gap-1 mt-2 text-xs text-primary-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          عرض المقال كاملاً
                        </Link>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: AI Chat */}
        {tab === 'ai' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {chatHistory.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="h-5 w-5 text-primary-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-700 mb-1">مساعد هاء الذكي</p>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    اسألني عن أي شيء في متجرك —<br />الطلبات، المنتجات، التقارير، وأكثر.
                  </p>
                  <div className="mt-4 space-y-1.5">
                    {[
                      'كيف أضيف منتجاً جديداً؟',
                      'كيف أُنشئ كوبون خصم؟',
                      'ما أفضل طريقة لزيادة المبيعات؟',
                    ].map(q => (
                      <button
                        key={q}
                        onClick={() => { setChatInput(q); }}
                        className="block w-full text-right px-3 py-2 text-xs rounded-lg bg-neutral-50 border border-neutral-100 text-neutral-600 hover:bg-primary-50 hover:border-primary-100 hover:text-primary-700 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary-500 text-white self-end mr-auto rounded-tr-sm'
                      : 'bg-neutral-100 text-neutral-800 self-start ml-auto rounded-tl-sm',
                  )}
                >
                  {msg.content}
                </div>
              ))}

              {chatLoading && (
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-neutral-100 ml-auto">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {chatHistory.length > 0 && (
              <div className="px-3 pt-1">
                <button
                  onClick={resetChat}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  محادثة جديدة
                </button>
              </div>
            )}

            <div className="px-3 py-3 border-t border-neutral-100">
              <div className="flex items-end gap-2">
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={onChatKey}
                  rows={2}
                  placeholder="اكتب سؤالك هنا... (Enter للإرسال)"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1 resize-none leading-relaxed"
                />
                <Button
                  size="icon-sm"
                  onClick={sendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="shrink-0 mb-0.5"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Contact */}
        {tab === 'contact' && (
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            <p className="text-xs text-neutral-500 text-center">
              لم تجد ما تبحث عنه؟ تواصل مع فريق الدعم.
            </p>

            {/* Ticket CTA */}
            <div className="rounded-xl border border-neutral-100 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-800">تذاكر الدعم</p>
                  <p className="text-xs text-neutral-400">رد خلال 24 ساعة</p>
                </div>
              </div>
              <Button asChild className="w-full" size="sm">
                <Link to="/support/tickets" onClick={close}>
                  إنشاء تذكرة دعم
                </Link>
              </Button>
            </div>

            {/* KB CTA */}
            <div className="rounded-xl border border-neutral-100 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-neutral-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-800">قاعدة المعرفة</p>
                  <p className="text-xs text-neutral-400">مقالات وأدلة مفصّلة</p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full" size="sm">
                <Link to="/support/kb" onClick={close}>
                  تصفّح المقالات
                </Link>
              </Button>
            </div>

            {/* Email */}
            <div className="rounded-xl border border-neutral-100 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <LifeBuoy className="h-4 w-4 text-neutral-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-800">البريد الإلكتروني</p>
                  <p className="text-xs text-neutral-400">support@haastores.com</p>
                </div>
              </div>
              <Button asChild variant="secondary" className="w-full" size="sm">
                <a
                  href={`mailto:support@haastores.com?subject=طلب دعم — ${user?.name ?? ''}&body=المتجر: ${storeId ?? ''}`}
                >
                  إرسال بريد
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
