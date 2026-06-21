/**
 * Haa — Landing Page · HeroAIChat (Conversational AI Agent)
 *
 * The "جرّب ذكاء Haa" section inside the Hero. Full conversational agent:
 *  - Persona identity (مساعد Haa الذكي)
 *  - Multi-turn context (history sent to / remembered across messages)
 *  - Typewriter streaming effect
 *  - Suggested follow-ups after every reply
 *  - sessionStorage persistence (last 20 messages, per browser tab)
 *  - Soft signup gate after MAX_MESSAGES (polite, not a wall)
 *  - PII-safe — never sends PII to the engine (defense-in-depth)
 *  - Mobile-first responsive, RTL, accessible
 *  - Graceful fallback to offline engine if the API is unreachable
 *
 * Architecture
 * ────────────
 *  - This component is PRESENTATION only. All intelligence lives in
 *    `packages/commerce-core/src/landing-ai-agent/`.
 *  - The component calls `POST /api/landing-ai-agent/chat` by default.
 *  - If the API call fails (network or 5xx), it falls back to the local
 *    `mockEngine` so the visitor never sees a broken experience.
 *  - All copy comes from props or from the engine's reply — no hard-coded
 *    sales copy in the component.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Bot,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
} from 'lucide-react';

import {
  AI_INTRO_MESSAGE,
  QUICK_PROMPTS,
  mockEngine,
  type AgentReply,
  type ChatEngine,
  type AgentMessage,
} from './aiChatContent';


const API_PATH = '/api/landing-ai-agent/chat';
const STORAGE_KEY = 'haa:landing-ai-chat:v1';
const MAX_HISTORY = 20;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ctaLabel?: string;
  followUps?: string[];
  /** typewriter key — when set, render letter-by-letter */
  typewriter?: boolean;
}

let __msgCounter = 0;
const nextId = () => `m-${Date.now()}-${++__msgCounter}`;

export interface HeroAIChatProps {
  /** Optional engine override (mostly for tests). Defaults to API → mock. */
  engine?: ChatEngine;
  /** Section title override. */
  title?: string;
  /** Section description override. */
  description?: string;
  /** Primary signup CTA href. */
  primaryCtaHref?: string;
  /** Persona name override. */
  personaName?: string;
}

const PERSONA_NAME = 'مساعد Haa الذكي';
const PERSONA_TAGLINE = 'مساعدك لتجربة Haa';

export default function HeroAIChat({
  engine,
  title = 'جرّب ذكاء Haa قبل ما تبدأ',
  description = 'اسأل المساعد الذكي عن نشاطك، وسيشرح لك كيف يساعدك Haa في إطلاق متجرك وإدارته وتسويقه — بدون تسجيل.',
  primaryCtaHref = '/signup',
  personaName = PERSONA_NAME,
}: HeroAIChatProps) {
  /* ──────────────────── state ──────────────────── */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresSignup, setRequiresSignup] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ──────────────────── hydrate from sessionStorage ──────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { messages?: ChatMessage[] };
        if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          setMessages(parsed.messages.slice(-MAX_HISTORY));
          setHydrated(true);
          return;
        }
      }
    } catch {
      // ignore — fall through to intro
    }
    // First-time visitor — show intro (no follow-ups on intro; the header
    // already shows the quick prompts as chips, so repeating them inside
    // the bubble would be visual noise).
    setMessages([{ id: nextId(), role: 'assistant', text: AI_INTRO_MESSAGE }]);
    setHydrated(true);
  }, []);

  /* ──────────────────── persist to sessionStorage ──────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined' || !hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: messages.slice(-MAX_HISTORY) }));
    } catch {
      // ignore — storage may be full
    }
  }, [messages, hydrated]);

  /* ──────────────────── auto-scroll ──────────────────── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  /* ──────────────────── focus on mount (desktop) ──────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 640 && hydrated) {
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 500);
      return () => clearTimeout(t);
    }
    return;
  }, [hydrated]);

  /* ──────────────────── send message ──────────────────── */
  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || loading) return;
      setError(null);
      setInput('');

      const userMsg: ChatMessage = { id: nextId(), role: 'user', text };
      const nextHistory = [...messages, userMsg];
      setMessages(nextHistory);
      setLoading(true);

      // Build the agent history (assistant + user only)
      const agentHistory: AgentMessage[] = nextHistory.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      let reply: AgentReply | null = null;

      // 1. Try the API
      try {
        const res = await fetch(API_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: agentHistory.slice(0, -1) }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            reply: AgentReply;
            requiresSignup?: boolean;
            remaining?: number;
            engine?: string;
          };
          reply = data.reply;
          if (typeof data.requiresSignup === 'boolean') setRequiresSignup(data.requiresSignup);
          if (typeof data.remaining === 'number') setRemaining(data.remaining);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (_apiErr) {
        // 2. Fallback to the local mock engine
        try {
          reply = await (engine ?? mockEngine).reply(agentHistory, 'ar-SA');
          setUsedFallback(true);
        } catch (mockErr) {
          const msg = mockErr instanceof Error ? mockErr.message : 'تعذّر توليد رد';
          setError(msg);
          setMessages((m) => m.slice(0, -1));
          setInput(text);
          setLoading(false);
          return;
        }
      }

      if (!reply) {
        setError('لم يصل رد من المساعد');
        setMessages((m) => m.slice(0, -1));
        setInput(text);
        setLoading(false);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        text: reply.body,
        ctaLabel: reply.ctaLabel,
        followUps: reply.followUps,
        typewriter: true,
      };
      setMessages((m) => [...m, assistantMsg]);
      setLoading(false);
    },
    [messages, loading, engine]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const onQuickPrompt = (seed: string) => {
    if (loading) return;
    void sendMessage(seed);
  };

  const resetConversation = useCallback(() => {
    if (typeof window !== 'undefined') {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
    setMessages([{ id: nextId(), role: 'assistant', text: AI_INTRO_MESSAGE }]);
    setRequiresSignup(false);
    setRemaining(null);
    setError(null);
    setUsedFallback(false);
  }, []);

  /* ──────────────────── render ──────────────────── */
  return (
    <section
      aria-labelledby="hero-ai-chat-title"
      dir="rtl"
      className="mx-auto mt-8 w-full max-w-2xl sm:mt-10"
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/70 shadow-xl shadow-primary-500/5 backdrop-blur-xl">
        {/* Decorative top glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 start-1/2 -z-0 h-40 w-80 -translate-x-1/2 rounded-pill bg-gradient-to-b from-primary-200/40 via-primary-100/20 to-transparent blur-2xl"
        />

        <div className="relative z-10 p-5 sm:p-6">
          {/* Header — persona */}
          <div className="flex items-start gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30">
              <Bot className="h-5 w-5" aria-hidden="true" />
              <span aria-hidden="true" className="absolute -bottom-0.5 -end-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-success" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <h2
                  id="hero-ai-chat-title"
                  className="text-[18px] font-extrabold leading-tight text-text-primary sm:text-[20px]"
                >
                  {title}
                </h2>
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={resetConversation}
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-text-tertiary transition-colors hover:bg-text-primary/5 hover:text-text-primary"
                    aria-label="إعادة بدء المحادثة"
                  >
                    إعادة
                  </button>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-text-secondary sm:text-sm">
                {description}
              </p>
              <p className="mt-1 text-xs font-medium text-primary-600/80">
                <Sparkles className="inline h-3 w-3 align-text-bottom" aria-hidden="true" /> {personaName} · {PERSONA_TAGLINE}
              </p>
            </div>
          </div>

          {/* Signup-gate banner */}
          {requiresSignup && (
            <div
              role="status"
              className="mt-4 flex items-start gap-2.5 rounded-2xl border border-primary-200/70 bg-gradient-to-br from-primary-50 to-primary-100 px-3 py-2.5 text-[12.5px] text-primary-900"
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
              <div>
                <div className="font-semibold">استمريت بالتجربة المجانية — جاهز للخطوة الجاية؟</div>
                <div className="mt-0.5 text-primary-800/85">سجّل كتاجر مجانًا (بدون بطاقة بنكية) عشان تطلق متجرك وتفعّل بوابات الدفع.</div>
                <Link
                  to={primaryCtaHref}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
                >
                  سجّل كتاجر — مجانًا
                </Link>
              </div>
            </div>
          )}

          {/* Quick prompts (only show if intro is the latest message) */}
          {messages.length <= 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.id}
                  type="button"
                  onClick={() => onQuickPrompt(qp.seed)}
                  disabled={loading}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-primary-200/70 bg-white/80 px-3 py-1.5 text-[12.5px] font-medium text-text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-primary-500 transition-transform group-hover:scale-110" aria-hidden="true" />
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            aria-live="polite"
            aria-relevant="additions"
            className="mt-4 max-h-[300px] min-h-[120px] space-y-3 overflow-y-auto rounded-2xl bg-gradient-to-b from-white/60 to-white/30 p-3 ring-1 ring-white/60 sm:max-h-[340px] sm:p-4"
          >
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                primaryCtaHref={primaryCtaHref}
                onFollowUp={onQuickPrompt}
                onAnimationDone={() => {
                  // remove the typewriter flag once rendered
                  setMessages((curr) =>
                    curr.map((x) => (x.id === m.id ? { ...x, typewriter: false } : x))
                  );
                }}
              />
            ))}
            {loading && <LoadingBubble />}
          </div>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-xl border border-danger-soft bg-danger-soft/80 px-3 py-2 text-[12.5px] text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <div className="font-semibold">تعذّر توليد رد.</div>
                <div className="text-danger/90">{error}</div>
              </div>
            </div>
          )}

          {/* Input row */}
          {!requiresSignup && (
            <form
              onSubmit={onSubmit}
              className="mt-3 flex items-center gap-2 rounded-full border border-text-primary/10 bg-white/90 p-1.5 shadow-sm transition-all focus-within:border-primary-300 focus-within:shadow-md"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب نشاطك التجاري…"
                maxLength={200}
                disabled={loading}
                aria-label="اكتب سؤالك للمساعد الذكي"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[14px] text-text-primary outline-none placeholder:text-text-tertiary disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || input.trim().length === 0}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:from-primary-300 disabled:to-primary-400 disabled:shadow-none"
                aria-label="إرسال"
              >
                <Send className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </button>
            </form>
          )}

          {/* Primary CTA */}
          <div className="mt-4 flex justify-center">
            <Link
              to={primaryCtaHref}
              className="aurora-btn-primary group inline-flex h-12 min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-6 text-[15px] font-bold text-white shadow-lg shadow-primary-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:!text-white sm:w-auto"
            >
              ابدأ التجربة الآن
            </Link>
          </div>

          {/* Meta line */}
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-text-tertiary">
            <span>تجريبي · لا يطلب تسجيل · لا يجمع بيانات شخصية</span>
            {usedFallback && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-warning/90">يعمل في وضع عدم الاتصال</span>
              </>
            )}
            {remaining !== null && !requiresSignup && (
              <>
                <span aria-hidden="true">·</span>
                <span>متبقي {remaining} رسالة مجانية</span>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────────────────────────── */

function MessageBubble({
  message,
  primaryCtaHref,
  onFollowUp,
  onAnimationDone,
}: {
  message: ChatMessage;
  primaryCtaHref: string;
  onFollowUp: (seed: string) => void;
  onAnimationDone: () => void;
}) {
  const isAssistant = message.role === 'assistant';
  const [displayed, setDisplayed] = useState(message.typewriter ? '' : message.text);

  // Typewriter effect
  useEffect(() => {
    if (!message.typewriter) {
      setDisplayed(message.text);
      return;
    }
    let i = 0;
    const step = Math.max(8, Math.floor(message.text.length / 120));
    const id = setInterval(() => {
      i += step;
      if (i >= message.text.length) {
        setDisplayed(message.text);
        clearInterval(id);
        onAnimationDone();
      } else {
        setDisplayed(message.text.slice(0, i));
      }
    }, 24);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} animate-fade-in-up`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm sm:text-sm ${
          isAssistant
            ? 'rounded-s-md bg-white text-text-primary ring-1 ring-text-primary/5'
            : 'rounded-e-md bg-gradient-to-r from-primary-500 to-primary-600 text-white'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">
          {displayed}
          {message.typewriter && displayed.length < message.text.length && (
            <span aria-hidden="true" className="ms-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-current align-middle" />
          )}
        </div>
        {isAssistant && message.ctaLabel && !message.typewriter && (
          <div className="mt-2 -mb-0.5">
            <Link
              to={primaryCtaHref}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[12px] font-semibold text-primary-700 transition-colors hover:bg-primary-100"
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {message.ctaLabel}
            </Link>
          </div>
        )}
        {isAssistant && message.followUps && message.followUps.length > 0 && !message.typewriter && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.followUps.map((fu) => (
              <button
                key={fu}
                type="button"
                onClick={() => onFollowUp(fu)}
                className="rounded-full border border-text-primary/10 bg-white/70 px-2 py-0.5 text-[11.5px] font-medium text-text-secondary transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {fu}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-s-md bg-white px-4 py-3 text-text-secondary ring-1 ring-text-primary/5">
        <Loader2 className="h-4 w-4 animate-spin text-primary-500" aria-hidden="true" />
        <span className="text-[12.5px]">المساعد يكتب…</span>
      </div>
    </div>
  );
}
