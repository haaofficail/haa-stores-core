/**
 * Haa — Landing Page · AI Chat Content (standalone)
 *
 * The full content + matcher for the "جرّب ذكاء Haa" Conversational Agent
 * in the storefront Hero. This file is **self-contained**: it does NOT
 * import from `@haa/commerce-core/landing-ai-agent` so the storefront works
 * even if the engine submodule isn't built / aliased. The backend route
 * (`/api/landing-ai-agent/chat`) is what gets used in production; this file
 * is the offline fallback AND the source of truth for persona, copy, and
 * quick prompts.
 *
 * Editing rules
 * ─────────────
 *  - No competitor names (سلة / زد / نون) as attacks
 *  - No revenue guarantees (نضمن، سنضاعف، ستحقق)
 *  - Always end every reply with a practical next step (ctaLabel)
 *  - Saudi professional tone, RTL Arabic
 *  - No PII collection — sanitize.ts handles stripping before any I/O
 */

export type AgentRole = 'user' | 'assistant';

export interface AgentMessage {
  role: AgentRole;
  content: string;
}

export type ReplyId =
  | 'perfumes'
  | 'fashion'
  | 'food'
  | 'electronics'
  | 'furniture'
  | 'services'
  | 'medical'
  | 'migrate'
  | 'start'
  | 'differentiator'
  | 'marketing'
  | 'pricing'
  | 'followup_pricing'
  | 'followup_marketing'
  | 'followup_themes'
  | 'followup_signup'
  | 'fallback';

export interface AgentReply {
  id: ReplyId;
  body: string;
  ctaLabel: string;
  followUps: string[];
}

export interface ChatEngine {
  /** human-readable name (debug only) */
  readonly name: string;
  /** returns a reply for the given conversation history */
  reply: (history: AgentMessage[], locale: string, signal?: AbortSignal) => Promise<AgentReply>;
}

/* ────────────────────────────────────────────────────────────────
   1. Feature flag
   ──────────────────────────────────────────────────────────────── */

export function isAIPreviewEnabled(): boolean {
  if (typeof window !== 'undefined' && (window as unknown as { __HAA_DISABLE_AI_CHAT__?: boolean }).__HAA_DISABLE_AI_CHAT__) {
    return false;
  }
  // Vite injects import.meta.env at build time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any)?.env?.VITE_LANDING_AI_CHAT;
  if (env === '0' || env === 'false') return false;
  return true;
}

/* ────────────────────────────────────────────────────────────────
   2. Intro & quick prompts
   ──────────────────────────────────────────────────────────────── */

export const PERSONA_NAME = 'مساعد Haa الذكي';
export const PERSONA_TONE = 'سعودي مهني بسيط';
export const MAX_MESSAGES_BEFORE_SIGNUP = 8;

export const AI_INTRO_MESSAGE =
  'أهلًا، أنا مساعد Haa الذكي. قل لي وش تبيع، وأشرح لك كيف تبدأ متجرك وتديره وتسوق له من منصة واحدة.';

export interface QuickPrompt {
  id: string;
  label: string;
  seed: string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  { id: 'qp-perfumes',  label: 'أبيع عطور',                       seed: 'أبيع عطور' },
  { id: 'qp-migrate',   label: 'عندي متجر في سلة وأفكر أنقل',   seed: 'عندي متجر في سلة وأفكر أنقل' },
  { id: 'qp-start',     label: 'أبي أعرف كيف أبدأ',              seed: 'أبي أعرف كيف أبدأ' },
  { id: 'qp-diff',      label: 'وش يميز Haa عن غيره؟',           seed: 'وش يميز Haa عن غيره' },
  { id: 'qp-marketing', label: 'كيف تساعدني أدوات التسويق؟',     seed: 'كيف تساعدني أدوات التسويق' },
  { id: 'qp-fashion',   label: 'عندي محل ملابس',                 seed: 'عندي محل ملابس' },
  { id: 'qp-food',      label: 'عندي مطعم وأبي أبيع أونلاين',    seed: 'عندي مطعم وأبي أبيع أونلاين' },
  { id: 'qp-electronics', label: 'أبيع إلكترونيات',              seed: 'أبيع إلكترونيات' },
  { id: 'qp-pricing',   label: 'كم تكلفة الباقات؟',              seed: 'كم تكلفة الباقات' },
  { id: 'qp-services',  label: 'عندي شركة خدمات',                seed: 'عندي شركة خدمات' },
];

/* ────────────────────────────────────────────────────────────────
   3. Reply bank
   ──────────────────────────────────────────────────────────────── */

const REPLIES: Record<Exclude<ReplyId, 'fallback'>, AgentReply> = {
  perfumes: {
    id: 'perfumes',
    body:
      'حلو، سوق العطور يناسبه Haa بشكل قوي: متجر عربي بثيم فاخر يناسب المنتجات، إدارة مخزون للعطور والمناسبات، صفحة منتج تبرز النوتات (خشب العود، الكمبودي، الزهور)، شحن آمن مع تتبّع، وتنبيهات تسويقية تخليك تعرف أي عطر يحتاج دفعة إعلانية.',
    ctaLabel: 'ابدأ بتجربة المتجر',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟'],
  },
  fashion: {
    id: 'fashion',
    body:
      'تمام، للملابس والأزياء عندك في Haa: صفحات منتج بمقاسات وألوان، ربط مع الشحن السعودي (سبل، أرامكس، ناقل)، بوابات دفع تدعم مدى وآبل باي وتقسيم تابي/تمارا، وعرض المجموعات بشكل يخلي الزائر يضيف للسلة بسرعة.',
    ctaLabel: 'سجّل كتاجر — مجانًا',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟'],
  },
  food: {
    id: 'food',
    body:
      'حلو، للأكل والمشروبات Haa يدعم صفحات منتج مع خيارات وإضافات (الحجم، الإضافات، التوابل)، منطقة توصيل حسب المدينة، دفع عند الاستلام أو إلكتروني، وتنبيهات فورية للطلبات الجديدة.',
    ctaLabel: 'جرّب نموذج متجر أكل',
    followUps: ['وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟', 'كم تكلفة الباقات؟'],
  },
  electronics: {
    id: 'electronics',
    body:
      'ممتاز. للإلكترونيات Haa يعطيك صفحات منتج تفصيلية (مواصفات، صور، فيديو)، إدارة مخزون دقيقة ومتغيرات، تقسيم دفع عبر تابي/تمارا، وتتبع طلبات من نفس اللوحة بدون ما تحتاج أدوات خارجية.',
    ctaLabel: 'ابدأ بتجربة المتجر',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟'],
  },
  furniture: {
    id: 'furniture',
    body:
      'تمام. للأثاث والديكور Haa يوفّر صورًا كبيرة للمنتج، خيارات متعددة (لون/مقاس/قماش)، حاسبة شحن للقطع الكبيرة، وصفحات هيرو تبرز المشاريع السابقة لزيادة الثقة.',
    ctaLabel: 'اكتب نشاطك التجاري بالتفصيل',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟'],
  },
  services: {
    id: 'services',
    body:
      'تمام. لشركة الخدمات، Haa يوفّر صفحة احترافية للحجز أو طلب الخدمة، نماذج تواصل ذكية، متابعة العملاء المحتملين، وإشعارات للطلبات الواردة — بدون ما تبني موقع من الصفر.',
    ctaLabel: 'تواصل مع المبيعات للمؤسسات',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟'],
  },
  medical: {
    id: 'medical',
    body:
      'للقطاع الصحي Haa يوفّر صفحة احترافية للحجز، نماذج استشارة أولية، وحماية لبيانات العملاء. تنبيه مهم: Haa متخصص بالمتاجر والمنتجات، ولا يتعامل مع السجلات الطبية.',
    ctaLabel: 'تواصل مع المبيعات',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟'],
  },
  migrate: {
    id: 'migrate',
    body:
      'نقل المتاجر عملية شائعة عندنا. فريق Haa ينزّل منتجاتك وعملاءك وطلباتك الجارية، ويخلّيك تشتغل من Haa بدون توقّف للمتجر. تقدر تبدأ بنقل قسم واحد وتكمل الباقي بالتدريج.',
    ctaLabel: 'تواصل مع فريق الهجرة',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟'],
  },
  start: {
    id: 'start',
    body:
      'تبدأ بثلاث خطوات بسيطة: ١) أنشئ حسابك مجانًا (بدون بطاقة بنكية)، ٢) اختر ثيمًا يناسب نشاطك، ٣) أضف أول منتج وفعّل بوابة الدفع. كل خطوة تأخذ أقل من دقيقة.',
    ctaLabel: 'سجّل كتاجر — مجانًا',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'أبيع عطور'],
  },
  differentiator: {
    id: 'differentiator',
    body:
      'Haa يتميز بأربع نقاط: البساطة (تبدأ في أقل من دقيقة)، التجربة العربية الكاملة من الألف للياء، أدوات التسويق المدمجة (كوبونات، استعادة سلات، واتساب)، والمساعد الذكي اللي يساعدك في قرارات المتجر. ما نقول إننا الأفضل، نقول إننا نركّز على اللي يحتاجه التاجر السعودي.',
    ctaLabel: 'جرّب Haa بنفسك',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟'],
  },
  marketing: {
    id: 'marketing',
    body:
      'أدوات التسويق في Haa تشمل: كوبونات وخصومات مرنة، استعادة سلات متروكة عبر إيميل وواتساب، تنبيهات المنتجات (نفاد المخزون، بطء الحركة)، حملات واتساب جاهزة، ولوحة تحليلات تخليك تعرف وش ينجح ووش يحتاج تحسين.',
    ctaLabel: 'تعرّف على أدوات التسويق',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'سجّل كتاجر — مجانًا'],
  },
  pricing: {
    id: 'pricing',
    body:
      'الأسعار واضحة في صفحة الباقات — تقدر تختار الخطة المناسبة لحجم متجرك، وتبدأ بخطة بسيطة ثم تطوّر مع نمو مبيعاتك. لا توجد رسوم خفية أو نسبة على المبيعات.',
    ctaLabel: 'شوف الباقات',
    followUps: ['وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟', 'سجّل كتاجر — مجانًا'],
  },
  // Follow-up variants
  followup_pricing: {
    id: 'followup_pricing',
    body:
      'تمام، نرجع لسؤالك عن الأسعار. Haa يوفّر خطط شهرية وسنوية تبدأ من باقات بسيطة للمتاجر الجديدة، وتوجد خطة مخصصة للمتاجر الكبيرة. كل الباقات تشمل الدعم بالعربي وأدوات التسويق الأساسية.',
    ctaLabel: 'شوف الباقات بالتفصيل',
    followUps: ['وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟'],
  },
  followup_marketing: {
    id: 'followup_marketing',
    body:
      'أدوات التسويق تشمل: كوبونات وخصومات، استعادة سلات متروكة (إيميل + واتساب)، تنبيهات ذكية للمنتجات، حملات واتساب جماعية، وتحليلات أداء المنتجات.',
    ctaLabel: 'شوف أدوات التسويق',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟'],
  },
  followup_themes: {
    id: 'followup_themes',
    body:
      'الثيمات في Haa مصممة من مصممين محترفين — تجد ثيمات تناسب كل نشاط: عطور، ملابس، أكل، إلكترونيات، أثاث، خدمات. كل ثيم قابل للتعديل (ألوان، خطوط) بدون لمس الكود.',
    ctaLabel: 'شوف معرض الثيمات',
    followUps: ['كم تكلفة الباقات؟', 'كيف يساعدني التسويق؟'],
  },
  followup_signup: {
    id: 'followup_signup',
    body:
      'سجّل كتاجر في أقل من دقيقة. ما تحتاج بطاقة بنكية للتجربة، وتقدر تطلق متجرك وفعّل بوابات الدفع لاحقًا. لو احتجت مساعدة، الدعم بالعربي موجود ٢٤/٧.',
    ctaLabel: 'سجّل كتاجر — مجانًا',
    followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟'],
  },
};

export const FALLBACK_REPLY: AgentReply = {
  id: 'fallback',
  body:
    'حلو. عشان أقدر أفيدك أكثر، اكتب لي وش تبيع بالضبط (عطور، ملابس، أكل، إلكترونيات، خدمات…) وأعطيك فكرة واضحة كيف Haa يناسب نشاطك.',
  ctaLabel: 'اكتب نشاطك التجاري',
  followUps: ['أبيع عطور', 'عندي محل ملابس', 'عندي مطعم', 'وش يميز Haa عن غيره؟'],
};

/* ────────────────────────────────────────────────────────────────
   4. Sanitize (PII strip)
   ──────────────────────────────────────────────────────────────── */

const MAX_LEN = 500;

export function sanitizeUserMessage(raw: unknown): string {
  if (raw == null) return '';
  const text = String(raw);
  let out = text.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '');
  out = out.replace(/\+?\d[\d\s\-().]{6,}\d/g, '');
  out = out.replace(/https?:\/\/\S+/g, '');
  out = out.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
  out = out.replace(/\s+/g, ' ').trim();
  if (out.length > MAX_LEN) out = out.slice(0, MAX_LEN);
  return out;
}

/* ────────────────────────────────────────────────────────────────
   5. Matcher (pure, multi-turn aware)
   ──────────────────────────────────────────────────────────────── */

function detectPrimaryIntent(text: string): ReplyId | null {
  const t = text.toLowerCase();
  const rules: Array<{ id: ReplyId; keywords: string[] }> = [
    { id: 'perfumes',    keywords: ['عطر', 'عطور', 'بخور', 'عود', 'عودي', 'parfume', 'perfume'] },
    { id: 'fashion',     keywords: ['ملابس', 'ثوب', 'أزياء', 'فاشن', 'حذاء', 'أحذية', 'شنط', 'حقائب'] },
    { id: 'food',        keywords: ['مطعم', 'أكل', 'مأكولات', 'حلويات', 'تموين', 'كافيه', 'قهوة', 'شاهي', 'مشروب', 'عصير', 'حلوى'] },
    { id: 'electronics', keywords: ['إلكترونيات', 'جوال', 'جوالات', 'سماعة', 'لابتوب', 'تلفاز', 'اكسسوار', 'اكسسوارات'] },
    { id: 'furniture',   keywords: ['أثاث', 'كنب', 'مكتب', 'ديكور', 'إضاءة', 'سجاد', 'مفروشات'] },
    { id: 'services',    keywords: ['خدمات', 'استشار', 'صيان', 'تنظيف', 'مقاول', 'تقنية', 'تقني', 'تصميم', 'تسويق رقمي'] },
    { id: 'medical',     keywords: ['مستشفى', 'عيادة', 'طبي', 'صيدل', 'مريض', 'علاج', 'صحة'] },
    { id: 'migrate',     keywords: ['سلة', 'زد', 'أنقل', 'انقل', 'نقل', 'ترحيل', 'migrate'] },
    { id: 'marketing',   keywords: ['تسويق', 'حملة', 'كوبون', 'خصم', 'استعادة', 'واتساب', 'إعلان', 'اعلان'] },
    { id: 'pricing',     keywords: ['كم سعر', 'كم التكلف', 'كم تكلفة', 'أسعار', 'باقات', 'اشتراك', 'pricing', 'تكلف'] },
    { id: 'differentiator', keywords: ['يميّز', 'يميز', 'غيره', 'منافس', 'منافسين', 'الفرق', 'ليش', 'وش يمي', 'ما يمي', 'ما يفر', 'وش الفرق', 'وش يفر', 'وش يميزكم', 'ليش أختار', 'ليش haa'] },
    { id: 'start',       keywords: ['أبدأ', 'ابدا', 'أبي أبدأ', 'كيف أبدأ', 'جديد', 'أول مرة', 'من الصفر'] },
  ];
  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (t.includes(kw.toLowerCase())) {
        return rule.id;
      }
    }
  }
  return null;
}

function detectFollowupIntent(text: string, history: AgentMessage[]): ReplyId | null {
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant) return null;

  const t = text.toLowerCase();
  if (/كم|سعر|تكلف|باق|اشتراك/.test(t) && !/باق|سعر|تكلف|كم/.test(lastAssistant.content.toLowerCase())) {
    return 'followup_pricing';
  }
  if (/(تسويق|كوبون|استعادة|واتساب|حملة)/.test(t)) return 'followup_marketing';
  if (/(ثيم|ثيمات|تصميم|شكل)/.test(t)) return 'followup_themes';
  if (/(سجّل|سجل|تسجيل|أنشئ|انشئ|سجلني|سجّلني)/.test(t)) return 'followup_signup';
  return null;
}

/** Compose a reply given the full conversation. Pure, deterministic. */
export function composeAgentReply(
  history: AgentMessage[],
  _locale: string = 'ar-SA'
): AgentReply {
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  if (!lastUser) return FALLBACK_REPLY;

  const cleaned = sanitizeUserMessage(lastUser.content);
  if (!cleaned) return FALLBACK_REPLY;

  const followupId = detectFollowupIntent(cleaned, history);
  if (followupId) return (REPLIES as Record<string, AgentReply>)[followupId] ?? FALLBACK_REPLY;

  const primaryId = detectPrimaryIntent(cleaned);
  if (primaryId) return (REPLIES as Record<string, AgentReply>)[primaryId] ?? FALLBACK_REPLY;

  return FALLBACK_REPLY;
}

/* ────────────────────────────────────────────────────────────────
   6. Engines
   ──────────────────────────────────────────────────────────────── */

/** Offline mock — pure, deterministic. */
export const mockEngine: ChatEngine = {
  name: 'mock-matcher',
  async reply(history, locale) {
    await new Promise((r) => setTimeout(r, 300));
    return composeAgentReply(history, locale);
  },
};

/** OpenAI-compatible model adapter. Activated when env is set on the API side. */
export interface ModelEngineConfig {
  url: string;
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}

export function createModelEngine(cfg: ModelEngineConfig): ChatEngine {
  return {
    name: `model:${cfg.model}`,
    async reply(history, locale, signal) {
      const sanitized = history.map((m) =>
        m.role === 'user' ? { ...m, content: sanitizeUserMessage(m.content) } : m
      );
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: 'system', content: `[locale: ${locale}] You are the Haa assistant.` },
            ...sanitized,
          ],
          max_tokens: cfg.maxTokens ?? 250,
          temperature: cfg.temperature ?? 0.5,
        }),
        signal,
      });
      if (!res.ok) throw new Error(`AI model API error: ${res.status}`);
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('AI model returned empty content');
      return {
        id: 'start',
        body: content.trim().slice(0, 800),
        ctaLabel: 'سجّل كتاجر — مجانًا',
        followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟'],
      };
    },
  };
}

/** Pick the active engine from env (only meaningful on the API side). */
export function getActiveEngine(env: Record<string, string | undefined> = {}): ChatEngine {
  const url = env.LANDING_AI_MODEL_URL;
  const model = env.LANDING_AI_MODEL_NAME;
  const apiKey = env.LANDING_AI_MODEL_KEY;
  if (url && model && apiKey) {
    return createModelEngine({ url, model, apiKey });
  }
  return mockEngine;
}
