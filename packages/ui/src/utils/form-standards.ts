/**
 * Form standards — T3.3.
 *
 * AGENTS.md §9.5 + design plan T3.3: form accessibility and visual labels.
 *
 * ## Rules (binding for all 3 apps)
 *
 * 1. **Every input MUST have a `<label>` element** — not a placeholder-only label.
 *    Use `StoreInput` / `Label` from `@haa/ui` (they handle this automatically).
 *    Pattern: `label` prop on `StoreInput`, not `placeholder` alone.
 *
 * 2. **Required fields**: append a red `*` to the label text.
 *    Convention: `'البريد الإلكتروني *'` for required, `'البريد الإلكتروني (اختياري)'`
 *    for optional (default).
 *
 * 3. **Helper text**: use `hint` prop on `StoreInput` (renders below the
 *    input with `aria-describedby` automatically).
 *
 * 4. **Error text**: use `error` prop on `StoreInput` (renders below in red,
 *    wired to `aria-invalid` + `aria-describedby`).
 *
 * 5. **RTL**: use logical CSS (`ms-` / `me-`, `ps-` / `pe-`) for spacing, never
 *    hardcoded `left`/`right`. `StoreInput` already does this.
 *
 * 6. **Hit area**: min 44×44px tap target on all interactive form elements.
 *
 * 7. **Icon-only inputs** (e.g. search): add `aria-label` for screen readers.
 *
 * ## Examples
 *
 * ```tsx
 * // Good — has label, hint, error support
 * <StoreInput
 *   label={t('auth.email')}
 *   type="email"
 *   required
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   hint={t('auth.emailHint')}
 *   error={errors.email}
 * />
 *
 * // Bad — placeholder-only label
 * <input placeholder="Email" />
 * ```
 */

export const FORM_STANDARDS_VERSION = '1.0' as const;
