const SANITIZATION_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, replacement: '' },
  { pattern: /<!--[\s\S]*?-->/g, replacement: '' },
  { pattern: /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, replacement: '' },
  { pattern: /<\/?[a-z][^>]*>/gi, replacement: '' },
  { pattern: /\b(?:javascript|data|vbscript):/gi, replacement: '' },
  { pattern: /[<>]/g, replacement: '' },
  { pattern: /[ \t]+\n/g, replacement: '\n' },
  { pattern: /\n{3,}/g, replacement: '\n\n' },
];

export function sanitizeGiftMessage(input: unknown): string | null {
  if (typeof input !== 'string') return null;

  let cleaned = input.normalize('NFKC').replace(/\r\n?/g, '\n');
  for (const rule of SANITIZATION_RULES) {
    cleaned = cleaned.replace(rule.pattern, rule.replacement);
  }
  cleaned = cleaned.trim();

  return cleaned.length > 0 ? cleaned : null;
}
