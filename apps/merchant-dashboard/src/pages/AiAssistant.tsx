import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { aiApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Bot,
  Sparkles,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Percent,
  Wallet,
  ChevronLeft,
  ArrowUp,
  Zap,
  BrainCircuit,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
  actions?: Array<{ label: string; action: string; params?: Record<string, unknown> }>;
  confidence?: number;
  timestamp: Date;
}

interface QuickAction {
  label: string;
  icon: typeof Bot;
  action: () => Promise<void>;
  description: string;
}

export default function AiAssistant() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length > 1) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (storeId) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        text: t('ai.welcome'),
        timestamp: new Date(),
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable from useTranslation; effect intentionally runs on [storeId] only
  }, [storeId]);

  function addAssistantMessage(response: { text: string; suggestions?: string[]; actions?: Array<{ label: string; action: string; params?: Record<string, unknown> }>; confidence?: number }) {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: response.text,
        suggestions: response.suggestions,
        actions: response.actions,
        confidence: response.confidence,
        timestamp: new Date(),
      },
    ]);
  }

  function addUserMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text,
        timestamp: new Date(),
      },
    ]);
  }

  async function executeAction(action: string, fn: () => Promise<any>) {
    if (!storeId) return;
    addUserMessage(action);
    setLoading(true);
    try {
      const result = await fn();
      addAssistantMessage(result);
    } catch (err: any) {
      toast.error(err.message || t('ai.error'));
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestionClick(suggestion: string) {
    addUserMessage(suggestion);
  }

  async function handleChatSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inputText.trim() || !storeId || loading) return;

    const prompt = inputText.trim();
    addUserMessage(prompt);
    setInputText('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.text,
        }));

      const result = await aiApi.chat(storeId, prompt, history);
      addAssistantMessage(result);
    } catch (err: any) {
      toast.error(err.message || t('ai.error'));
    } finally {
      setLoading(false);
    }
  }

  function handleNavigate(path: string) {
    navigate(path);
  }

  const quickActions: QuickAction[] = [
    {
      label: t('ai.dailySummary'),
      description: 'نظرة سريعة على أداء اليوم',
      icon: BarChart3,
      action: () => executeAction(t('ai.dailySummary'), () => aiApi.dailySummary(storeId!)),
    },
    {
      label: t('ai.weeklySummary'),
      description: 'إحصائيات الأسبوع الكاملة',
      icon: TrendingUp,
      action: () => executeAction(t('ai.weeklySummary'), () => aiApi.weeklySummary(storeId!)),
    },
    {
      label: t('ai.salesAnalysis'),
      description: 'تحليل أسباب التغير في المبيعات',
      icon: Activity,
      action: () => executeAction(t('ai.salesAnalysis'), () => aiApi.salesDecline(storeId!)),
    },
    {
      label: t('ai.productSuggestions'),
      description: 'أفكار لتحسين منتجاتك',
      icon: Lightbulb,
      action: () => executeAction(t('ai.productSuggestions'), () => aiApi.productSuggestions(storeId!)),
    },
    {
      label: t('ai.promotionSuggestions'),
      description: 'خطط ترويجية مُحسّنة',
      icon: Percent,
      action: () => executeAction(t('ai.promotionSuggestions'), () => aiApi.suggestions(storeId!)),
    },
    {
      label: t('ai.walletAnalysis'),
      description: 'ملخص مالي ورسوم المنصة',
      icon: Wallet,
      action: () => executeAction(t('ai.walletAnalysis'), () => aiApi.wallet(storeId!)),
    },
  ];

  const hasStartedChat = messages.length > 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white relative overflow-hidden animate-fade-in">

      {/* Header */}
      <div className="relative z-10 px-6 py-5 border-b border-white/50 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-3xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 ring-4 ring-white">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">{t('ai.title')}</h1>
              <p className="text-xs text-neutral-500 font-medium">{t('ai.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
            <Zap className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">متصل</span>
          </div>
        </div>
      </div>

      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 relative z-10 scroll-smooth">
        
        {/* Welcome Hero (Only before chat starts) */}
        {!hasStartedChat && (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-2xl shadow-primary-500/30 mb-6 ring-8 ring-primary-100/50">
              <BrainCircuit className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">مرحباً، أحمد 👋</h2>
            <p className="text-neutral-500 max-w-md leading-relaxed mb-8">
              أنا مساعدك الذكي في إدارة متجرك. يمكنني مساعدتك في تحليل المبيعات، 
              مراجعة المخزون، واقتراح أفضل الاستراتيجيات لنمو أرباحك.
            </p>

            {/* Quick Action Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl">
              {quickActions.map((qa) => (
                <button
                  key={qa.label}
                  onClick={qa.action}
                  disabled={loading}
                  className="group relative flex flex-col items-start p-4 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-card transition-all duration-300 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-right"
                >
                  <div className="mb-3 p-2 rounded-xl bg-primary-50">
                    <qa.icon className="h-5 w-5 text-primary-600" />
                  </div>
                  <span className="text-sm font-bold text-neutral-900 mb-1">{qa.label}</span>
                  <span className="text-xs text-neutral-500 leading-snug">{qa.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {msg.role === 'assistant' && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-md shadow-primary-500/20">
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}
            
            <div className={`max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
              {/* Bubble */}
              <div className={`relative px-5 py-3.5 rounded-3xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/80 backdrop-blur-xl border border-white/50 text-neutral-900'
              }`}>
                {msg.text}
                
                {/* Confidence Badge */}
                {msg.confidence !== undefined && (
                  <div className={`mt-3 flex items-center gap-2 pt-2 border-t ${msg.role === 'user' ? 'border-white/20' : 'border-neutral-100'}`}>
                    <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${msg.confidence * 100}%`,
                          background: msg.confidence > 0.8 
                            ? 'var(--color-success)' 
                            : msg.confidence > 0.5 
                              ? 'var(--color-warning)' 
                              : 'var(--color-danger)',
                        }}
                      />
                    </div>
                     <span className={`text-xs font-bold ${msg.role === 'user' ? 'text-white/70' : 'text-neutral-400'}`}>
                      {Math.round(msg.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 mr-2">
                  {msg.suggestions.map((sug) => (
                    <button
                      key={sug}
                      onClick={() => handleSuggestionClick(sug)}
                      className="px-3 py-1.5 text-xs rounded-full border border-neutral-200 bg-white/80 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300 hover:text-neutral-800 transition-all shadow-sm hover:shadow-md backdrop-blur-xl"
                    >
                      <Sparkles className="h-3 w-3 inline mr-1 text-amber-500" />
                      {sug}
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 mr-2">
                  {msg.actions.map((act) => (
                    <Button
                      key={act.label}
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 px-4 rounded-full border-neutral-200 text-neutral-700 bg-white/80 hover:bg-neutral-50 backdrop-blur-xl shadow-sm hover:shadow-md transition-all"
                      onClick={() => {
                        if (act.action === 'navigate' && act.params?.path) {
                          handleNavigate(act.params.path as string);
                        }
                      }}
                    >
                      {act.label}
                      <ChevronLeft className="h-3 w-3 mr-1" />
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-neutral-200 to-neutral-300 flex items-center justify-center flex-shrink-0 mt-1 border-2 border-white shadow-sm">
                <span className="text-xs font-bold text-neutral-600">{t('ai.you')}</span>
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-500/20">
              <Bot className="h-4 w-4 text-white animate-pulse" />
            </div>
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl rounded-tl-sm px-5 py-4 shadow-sm">
              <div className="flex gap-1.5 items-center h-5">
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative z-20 p-4 bg-white/80 backdrop-blur-2xl border-t border-white/50">
        <form onSubmit={handleChatSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('ai.askPlaceholder') || 'اكتب سؤالك هنا...'}
              className="w-full pr-14 pl-5 py-3.5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/50 text-neutral-900 placeholder:text-neutral-400 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-300 transition-all"
              disabled={loading}
              dir="rtl"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              aria-label="إرسال الرسالة"
              className="absolute end-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
