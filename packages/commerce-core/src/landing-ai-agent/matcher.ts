/**
 * Landing AI Agent — Matcher & Composer
 *
 * The core intent detection + reply composition. Pure functions, no side
 * effects, no network. Used by the mock engine and (loosely) by the model
 * engine for fallback / post-processing.
 */

import { REPLIES, FALLBACK_REPLY, type AgentReply, type ReplyId } from './reply-bank.js';
import { sanitizeUserMessage } from './sanitize.js';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type { AgentReply, ReplyId };

/** Max user messages allowed before we ask the visitor to sign up. */
export const MAX_MESSAGES_BEFORE_SIGNUP = 8;

/** Public composer — returns a persona-bound reply with follow-up suggestions. */
export async function composeAgentReply(
  history: AgentMessage[],
  _locale: string = 'ar-SA'
): Promise<AgentReply> {
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  if (!lastUser) return FALLBACK_REPLY;

  const cleaned = sanitizeUserMessage(lastUser.content);
  if (!cleaned) return FALLBACK_REPLY;

  // 1. Detect follow-up intent (references earlier assistant reply)
  const followupId = detectFollowupIntent(cleaned, history);
  if (followupId) return (REPLIES as Record<string, AgentReply>)[followupId] ?? FALLBACK_REPLY;

  // 2. Detect primary intent
  const primaryId = detectPrimaryIntent(cleaned);
  if (primaryId) return (REPLIES as Record<string, AgentReply>)[primaryId] ?? FALLBACK_REPLY;

  return FALLBACK_REPLY;
}

/* ────────────────────────────────────────────────────────────────
   Intent detection
   ──────────────────────────────────────────────────────────────── */

function detectPrimaryIntent(text: string): ReplyId | null {
  const t = text.toLowerCase();
  const rules: Array<{ id: ReplyId; keywords: string[] }> = [
    // Specific verticals first
    { id: 'perfumes',    keywords: ['عطر', 'عطور', 'بخور', 'عود', 'عودي', ' parfume', 'perfume'] },
    { id: 'fashion',     keywords: ['ملابس', 'ثوب', 'أزياء', 'فاشن', 'حذاء', 'أحذية', 'شنط', 'حقائب'] },
    { id: 'food',        keywords: ['مطعم', 'أكل', 'مأكولات', 'حلويات', 'تموين', 'كافيه', 'قهوة', 'شاهي', 'مشروب', 'عصير', 'حلوى'] },
    { id: 'electronics', keywords: ['إلكترونيات', 'جوال', 'جوالات', 'سماعة', 'لابتوب', 'تلفاز', 'اكسسوار', 'اكسسوارات'] },
    { id: 'furniture',   keywords: ['أثاث', 'كنب', 'مكتب', 'ديكور', 'إضاءة', 'سجاد', 'مفروشات'] },
    { id: 'services',    keywords: ['خدمات', 'استشار', 'صيان', 'تنظيف', 'مقاول', 'تقنية', 'تقني', 'تصميم', 'تسويق رقمي'] },
    { id: 'medical',     keywords: ['مستشفى', 'عيادة', 'طبي', 'صيدل', 'مريض', 'علاج', 'صحة'] },
    // Competitor / migration
    { id: 'migrate',     keywords: ['سلة', 'زد', 'أنقل', 'انقل', 'نقل', 'ترحيل', 'migrate'] },
    // Marketing
    { id: 'marketing',   keywords: ['تسويق', 'حملة', 'كوبون', 'خصم', 'استعادة', 'واتساب', 'إعلان', 'اعلان'] },
    // Pricing — keep "كم" specific to pricing context only
    { id: 'pricing',     keywords: ['كم سعر', 'كم التكلف', 'كم تكلفة', 'أسعار', 'باقات', 'اشتراك', 'pricing', 'تكلف'] },
    // Differentiator — must come before start (catches "وش يميز" and similar)
    { id: 'differentiator', keywords: ['يميّز', 'يميز', 'غيره', 'منافس', 'منافسين', 'الفرق', 'ليش', 'وش يمي', 'ما يمي', 'ما يفر', 'وش الفرق', 'وش يفر', 'وش يميزكم', 'ليش أختار', 'ليش هaa'] },
    // Start (catches "كيف أبدأ")
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

/**
 * Follow-up detector — only triggers when the LAST assistant message already
 * answered something, and the user is asking a logical follow-up (price,
 * themes, signup, marketing). Prevents the assistant from re-asking
 * "وش تبيع" if the user already answered.
 */
function detectFollowupIntent(text: string, history: AgentMessage[]): ReplyId | null {
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant) return null;

  const t = text.toLowerCase();
  // Pricing follow-up
  if (/كم|سعر|تكلف|باق|اشتراك/.test(t) && /(باق|سعر|تكلف|كم)/.test(lastAssistant.content.toLowerCase()) === false) {
    return 'followup_pricing';
  }
  // Marketing follow-up
  if (/(تسويق|كوبون|استعادة|واتساب|حملة)/.test(t)) {
    return 'followup_marketing';
  }
  // Themes follow-up
  if (/(ثيم|ثيمات|تصميم|شكل)/.test(t)) {
    return 'followup_themes';
  }
  // Signup intent
  if (/(سجّل|سجل|تسجيل|أنشئ|انشئ|أبدأ|ابدا|سجلني|سجّلني)/.test(t)) {
    return 'followup_signup';
  }
  return null;
}
