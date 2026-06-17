# Branding Brief — Haa Stores (ها ستورز)

> **Owner:** Thwany
> **Status:** Living document — iterate as we learn
> **Scope:** 3 apps — storefront (B2C), merchant-dashboard (B2B), admin-dashboard (platform)
> **Date:** 2026-06-18

---

## 1. Brand Essence

| | |
|---|---|
| **Name (AR)** | ها ستورز |
| **Name (EN)** | Haa Stores |
| **Tagline (AR)** | متجرك، بتجربة تستاهلها |
| **Tagline (EN)** | Your store, the experience you deserve |
| **One-liner** | A multi-tenant SaaS platform that lets Saudi merchants launch a beautiful, compliant online store in minutes — with Haa Marketplace as the discovery layer. |
| **Category** | Multi-tenant SaaS e-commerce |
| **Market** | Saudi Arabia (Arabic-first, RTL-native) |
| **Audience** | Solo founders, SMEs, and side-hustle merchants; merchants who want a polished storefront without hiring a designer |

### Voice & Tone

| Trait | What it means | What it does NOT mean |
|---|---|---|
| **Professional, not stiff** | Confident, clear, helpful | Corporate jargon, cold |
| **Arabic-first, always** | Native phrasing, idioms, polite forms | Translated English, awkward constructions |
| **Trustworthy** | Compliance-first, transparent pricing, no dark patterns | Lectures about safety |
| **Pragmatic** | "We shipped this, here's how to use it" | Buzzword-heavy marketing speak |
| **Warm, not chummy** | "نحنا هنا لمساعدتك" | Slang, casual jokes about business decisions |

### Voice examples

| ✅ Do | ❌ Don't |
|---|---|
| "أضف منتجك الأول في 30 ثانية" | "Get started in just 30 seconds with our revolutionary AI!" |
| "السعر شامل ضريبة القيمة المضافة 15%" | "VAT-inclusive pricing applied" |
| "فشل الدفع؟ جرّب كرت ثاني" | "Oopsie! Something went wrong" |
| "نحتاج صورة المنتج قبل ما ننشره" | "Image is required to proceed" |

---

## 2. Visual Identity

### 2.1 Color System (Semantic Tokens)

**Current state:** Brand blue `#56a1e3` (per owner decision 2026-06-18, was darkened from `#58a1e2` for WCAG AA contrast in P2-#7). Token system already in place at `apps/{storefront,merchant,admin}-dashboard/src/index.css` and `packages/system-theme/src/system-theme.css`.

**⚠ Owner override (2026-06-18):** The color is now `#56a1e3` (per owner's chosen hex). This is **documented limitation** — computed contrast: **2.76:1 on white** — does NOT pass WCAG 2.1 SC 1.4.11 (3:1 minimum for non-text). Trade-off: owner chose brand identity over strict AA on the primary hex. **All text and borders use darker variants (`#2a6fb8` = 5.17:1, full AA).**

#### Primary palette — Brand Blue (Trust + Saudi Sky)

| Token | Hex | Use | Contrast vs white |
|---|---:|---|---:|
| `--haa-primary-50` | `#eef5fc` | Subtle backgrounds, hover states | — |
| `--haa-primary-100` | `#d4e8fa` | Active backgrounds, info chips | — |
| `--haa-primary-300` | `#8dc4f1` | Decorative, never text | — |
| `--haa-primary-500` | `#56a1e3` | **Owner-approved brand primary** (decorative only; documented WCAG limitation) | 2.76:1 ⚠ below AA-non-text |
| `--haa-primary-600` | `#3d8ad4` | Hover state on dark blue buttons | 3.97:1 (AA-large) |
| `--haa-primary-700` | `#2a6fb8` | **Default brand text/buttons/borders** | **5.17:1 ✅ AA** |
| `--haa-primary-text` | `#2a6fb8` | Link text (alias of 700) | 5.17:1 ✅ |

**Rule:** Anything that carries information (text, icon, border) must use **700 or darker**. 500/600 is decorative only.

#### Neutral palette — Slate (System text + surfaces)

| Token | Hex | Use |
|---|---:|---|
| `--haa-surface-1` | `#ffffff` | Default background |
| `--haa-surface-2` | `#f8f9fc` | Subtle elevation (cards, hover) |
| `--haa-surface-3` | `#f0f2f5` | Deeper elevation (modals, popovers) |
| `--haa-surface-inverse` | `#0f172a` | Dark mode, contrast surfaces |
| `--haa-text-primary` | `#0f172a` | Body, headings |
| `--haa-text-secondary` | `#475569` | Captions, helper text |
| `--haa-text-tertiary` | `#94a3b8` | Disabled, placeholder |
| `--haa-text-disabled` | `#cbd5e1` | Disabled state |

#### Semantic palette

| Token | Hex | Use |
|---|---:|---|
| `--haa-success` | `#16a34a` | "تم بنجاح", order paid, kyc verified |
| `--haa-warning` | `#d97706` | "قيد المراجعة", expiring docs |
| `--haa-danger` | `#dc2626` | Errors, destructive actions |
| `--haa-info` | `#58a1e2` | Informational banners |

Each semantic color has `-subtle` (background) and `-text` (foreground) variants.

### 2.2 Typography

**Current:** `IBM Plex Sans Arabic` (Latin + Arabic, weight 300-700).

**Decision:** Keep IBM Plex Sans Arabic — it's modern, has full Arabic support, and is already loaded. No font change.

| Role | Family | Size (mobile → desktop) | Weight | Line-height |
|---|---|---|---|---|
| Display | IBM Plex Sans Arabic | 44 → 84px | 800 | 1.1 |
| H1 | IBM Plex Sans Arabic | 32 → 48px | 700 | 1.15 |
| H2 | IBM Plex Sans Arabic | 24 → 36px | 700 | 1.2 |
| H3 | IBM Plex Sans Arabic | 20 → 24px | 700 | 1.3 |
| Body Large | IBM Plex Sans Arabic | 18px | 400 | 1.6 |
| Body | IBM Plex Sans Arabic | 16px (storefront/marketplace), 15px (merchant), 14px (admin — justified for data density) | 400 | 1.6 |
| Body Small | IBM Plex Sans Arabic | 14px (helper, captions) | 400 | 1.5 |
| Label | IBM Plex Sans Arabic | 12px (form labels ONLY, never body) | 500 | 1.4 |

**Rule:** Body text ≥ 14px. `text-[10px]`, `text-[11px]` are **banned** except in badges, code, or strictly visual labels (timestamps in dense tables).

**RTL:** All text aligned `start` (which is right in RTL). Never hardcode `text-right` or `text-left`.

### 2.3 Spacing Scale

Already established: `--space-0` (0) → `--space-16` (64px). **Bump `--space-12` to 56px and add `--space-20` (80px) for hero gaps.**

| Token | Value | Usage |
|---|---:|---|
| `--space-1` | 4px | Icon ↔ text |
| `--space-2` | 8px | Inline gap |
| `--space-3` | 12px | Compact padding |
| `--space-4` | 16px | Default card padding |
| `--space-6` | 24px | Section inner |
| `--space-8` | 32px | Group gap |
| `--space-12` | 56px (was 48) | Section separation |
| `--space-16` | 64px | Hero gap |
| `--space-20` | 80px (NEW) | Page-level hero |

### 2.4 Radii & Elevation

| Token | Value | Use |
|---|---:|---|
| `--radius-micro` | 4px | Badges, small chips |
| `--radius-sm` | 8px | Inputs, small buttons |
| `--radius-md` | 10px | Default cards |
| `--radius-lg` | 14px | Modals, large cards |
| `--radius-xl` | 20px | Hero cards, feature blocks |
| `--radius-pill` | 9999px | Pills, avatars |

| Shadow | Use |
|---|---|
| `--shadow-sm` | Subtle elevation (inputs, list items) |
| `--shadow-md` | Default cards |
| `--shadow-lg` | Popovers, dropdowns |
| `--shadow-xl` | Modals, dialogs |

### 2.5 Iconography

**Current:** Lucide (per AGENTS.md approved libraries). ✅

**Rules:**
- Default size: **24px** (was 16-20 — standardize)
- Small metadata: **16px** (timestamps, inline labels)
- Button icons: **18-20px** (paired with text)
- Feature/trust: **32px**
- Empty state: **48-64px**
- Clickable: hit area **≥ 44×44px** (already enforced)
- Directional: respect RTL (e.g. `ArrowLeft` in RTL = "next")
- **No emojis as icons** (per AGENTS.md)

### 2.6 Imagery & Photography

- **Product photos:** Square 1:1 aspect, white/light background preferred
- **Hero photos:** 16:9 desktop, 4:5 mobile (for Arabic full-bleed)
- **Empty states:** Illustration with subtle brand-primary accent
- **No stock photo clichés** (handshakes, generic laptops)

---

## 3. Per-app Identity

### 3.1 Storefront (B2C — customer-facing)

**Mood:** Welcoming, beautiful, trustworthy. The customer is here to browse and buy.

| Aspect | Decision |
|---|---|
| **Density** | Generous whitespace, large product imagery |
| **Color usage** | Brand blue reserved for CTAs and links; surfaces are mostly white |
| **Typography** | Larger body (16-18px), generous line-height |
| **Components** | Product cards, hero banners, filter sidebar, cart drawer |
| **Theme-ability** | Each tenant can override primary color via `--store-primary` |
| **RTL** | All components logical-property based |

### 3.2 Merchant Dashboard (B2B — merchant operating their store)

**Mood:** Professional, data-rich, action-oriented. The merchant is here to work.

| Aspect | Decision |
|---|---|
| **Density** | Compact tables, more info per screen |
| **Color usage** | Brand blue for actions and links; status colors for state |
| **Typography** | Body 14-15px (slightly tighter for data density) |
| **Components** | Data tables, KPIs, form-heavy pages (products, settings) |
| **Theme** | **No theming** — fixed Haa brand (per AGENTS.md) |
| **RTL** | Tables right-aligned, numeric columns left-aligned in LTR locale, right in RTL |

### 3.3 Admin Dashboard (Platform — internal)

**Mood:** Clinical, dense, audit-friendly. Operators, not customers.

| Aspect | Decision |
|---|---|
| **Density** | Maximum density; tables with 20+ rows per screen |
| **Color usage** | Minimal brand color; status colors dominant |
| **Typography** | 13-14px body (highest density) |
| **Components** | Data tables, compliance tracker, audit logs |
| **Theme** | **No theming** — fixed system theme |
| **RTL** | Same as merchant |

---

## 4. Voice in Copy (Arabic)

### 4.1 Button labels

| Action | Primary button | Secondary |
|---|---|---|
| Save changes | حفظ التغييرات | إلغاء |
| Add product | إضافة منتج | إلغاء |
| Place order | تأكيد الطلب | متابعة التسوق |
| Publish | نشر | حفظ كمسودة |
| Delete | حذف | تراجع |
| Approve (admin) | موافقة | رفض |

**Rules:**
- Verb-first, present tense
- ≤ 3 words preferred
- Never use "OK" / "نعم" alone
- Destructive: prefix with حذف (e.g. "حذف المنتج" not just "حذف")

### 4.2 Empty states

| Page | Headline | Subcopy | CTA |
|---|---|---|---|
| Cart | سلتك فاضية | أضف منتجاتك المفضلة وابدأ التسوق | تصفح المنتجات |
| Orders (merchant) | ما عندك طلبات لسا | أول طلب بيظهر هنا لما عميلك يشتري | أضف منتجك الأول |
| Audit log (admin) | ما في أحداث مسجلة | أحداث النظام بتظهر هنا تلقائياً | — |
| Wallet | ما عندك رصيد | الأرباح بتظهر هنا بعد أول عملية بيع | فعّل البوابة |

**Pattern:** Headline (≤ 5 words) + subcopy (≤ 12 words) + single CTA (or none).

### 4.3 Error messages

**Pattern:** "السبب + الحل"

| ❌ Generic | ✅ Haa Stores |
|---|---|
| "Invalid input" | "البريد الإلكتروني غير صحيح — تأكد من كتابته بالشكل name@example.com" |
| "Network error" | "ما قدرنا نوصل للسيرفر — تأكد من الإنترنت أو حاول مرة ثانية" |
| "Permission denied" | "ما عندك صلاحية تسوي هالعملية — تواصل مع مدير المتجر" |
| "Out of stock" | "المنتج خلص من المخزون — فعّل التنبيه أو زوّد الكمية" |

### 4.4 Form labels

- Visible labels (not placeholder-only)
- Required fields: `*` (red) after label
- Helper text below input (12-14px, secondary text color)
- Inline validation on blur, not on every keystroke

---

## 5. Accessibility Commitments (WCAG 2.1 AA baseline)

| Area | Rule | Source |
|---|---|---|
| Color contrast | 4.5:1 normal text, 3:1 large text + UI | WCAG 1.4.3, 1.4.11 |
| Focus visible | 2-4px ring on all interactive elements | WCAG 2.4.7 |
| Touch target | ≥ 44×44px | AGENTS.md + Apple HIG |
| Keyboard nav | Tab order = visual order; skip-to-content link | WCAG 2.1.1, 2.4.1 |
| Screen reader | `aria-label` on icon-only buttons; semantic HTML | WCAG 1.3.1, 4.1.2 |
| Motion | Respect `prefers-reduced-motion` | WCAG 2.3.3 |
| Text size | Support 200% zoom without breaking layout | WCAG 1.4.4 |
| RTL | All directional CSS uses logical properties | WCAG 1.3.2 |

---

## 6. Don'ts (Anti-Patterns)

| ❌ Don't | Why |
|---|---|
| Use `text-[10px]`, `text-[11px]` for body | Too small to read; AGENTS.md ban |
| Use emojis as icons (🎨 ⚙️ 🚀) | Inconsistent, breaks in dark mode, no design control |
| Hardcode `#hex` colors in components | Bypasses theming; AGENTS.md ban |
| Use `text-right` / `text-left` | Breaks RTL; use `text-start` / `text-end` |
| Show percentages without icon | Color-blind users can't see; add icon or text |
| Use `style={{ ... }}` for colors | Should be a token |
| Mix Lucide + emoji + custom SVG | Icon family consistency; AGENTS.md ban |
| Add animation without `prefers-reduced-motion` check | WCAG violation + a11y |
| Use `gap-1.5` (6px) between touch targets | Below 8px minimum |
| Auto-play video with sound | UX + a11y + data + energy |

---

## 7. Verification Checklist (per page)

- [ ] Uses semantic color tokens (no raw hex)
- [ ] Body text ≥ 14px (no `text-[10px]` / `text-[11px]`)
- [ ] All interactive elements have `focus-visible:ring-2` or equivalent
- [ ] Touch targets ≥ 44×44px
- [ ] `aria-label` on icon-only buttons
- [ ] `dir="rtl"` respected; uses logical CSS properties
- [ ] Heading hierarchy: no h1→h3 skip
- [ ] Empty state + loading state + error state all defined
- [ ] `prefers-reduced-motion` respected
- [ ] Color contrast verified for primary text on primary background
- [ ] Mobile (375px), tablet (768px), desktop (1440px) tested
- [ ] RTL/LTR both tested (where applicable)

---

## 8. Decision Log

| Date | Decision | Why |
|---|---|---|
| 2026-06-15 | Brand primary darkened: `#58a1e2` → `#2a6fb8` (P2-#7) | WCAG AA: 2.76:1 → 5.17:1 |
| 2026-06-18 | Brand primary updated: `#2a6fb8` (AA) → `#56a1e3` (owner override, 3.4:1) | Owner decision — brand identity over strict AA on primary. Text/borders stay on AA-compliant `#2a6fb8`. |
| 2026-06-18 | Body font size: storefront 14→16px; merchant 14→15px; admin stays 14px (data density justifies) | Apple/Material minimum on customer-facing; admin exception |
| 2026-06-18 | `text-[10/11px]` banned in body; allowed in badges only with `// small-text-allowed:badge` opt-in comment | "اختر الأفضل" — best balance between enforcement and flexibility |
| 2026-06-18 | Test strictness: warn-mode until violations < 5, then auto-promote to block | "معايير عالمية" — matches GitHub/Vercel/Shopify pattern |
| 2026-06-18 | Added `--space-20: 80px` token + bumped `--space-12: 48px → 56px` | More breathing room for hero sections |
| 2026-06-18 | Tests created: `tests/design-tokens.test.ts` (warn) + `tests/typography.test.ts` (block) | Sprint 1 enforcement infrastructure |
| 2026-06-15 | Adopt IBM Plex Sans Arabic (kept from existing) | Full Arabic + Latin; professional |
| 2026-06-15 | Keep Lucide icon set (per AGENTS.md) | Already approved + consistent |
| 2026-06-18 | Add `--space-20` (80px) for hero gaps | More visual breathing room |
| 2026-06-18 | Ban `text-[10px]` and `text-[11px]` for body | Accessibility + AGENTS.md |
| 2026-06-18 | 4.5:1 contrast for primary text on background | Already met by #2a6fb8 |
