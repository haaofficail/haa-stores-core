export const marketplaceTheme = {
  /* ── Container ── */
  container: 'max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8',

  /* ── Shell ── */
  shell: 'bg-white text-black',

  /* ── Card ── */
  card: 'rounded-2xl bg-white shadow-sm',
  cardHover: 'hover:shadow-md',
  elevated: 'rounded-2xl bg-white shadow-md',

  /* ── Surface ── */
  surface: 'rounded-2xl bg-white',
  softPanel: 'rounded-2xl bg-blue-50/40',

  /* ── Buttons ── */
  primaryButton: 'bg-primary-500 text-white hover:bg-primary-600 transition-colors duration-200',
  outlineButton: 'border border-gray-200 bg-white text-black hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200',
  ghostButton: 'bg-transparent text-primary-500 hover:bg-primary-50 transition-colors duration-200',

  /* ── Inputs ── */
  focusInput: 'outline-none focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/10',

  /* ── Text ── */
  mutedText: 'text-gray-500',
  secondaryText: 'text-gray-500',
  heading: 'text-black font-bold',
  accentText: 'text-primary-500',

  /* ── Price ── */
  priceStrike: 'text-gray-400 line-through',
  discountBadge: 'bg-[#dc2626] text-white',
  savingsText: 'text-[10px] font-bold text-[#16a34a]',
  outOfStock: 'bg-white/90 text-primary-600',
} as const;