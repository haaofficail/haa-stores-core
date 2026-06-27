const SCRIPT_STYLE_BLOCK_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
const HTML_TAG_RE = /<\/?[a-z][^>]*>/gi;
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const DANGEROUS_PROTOCOL_RE = /\b(?:javascript|data|vbscript):/gi;

export function sanitizeGiftMessage(input: unknown): string | null {
  if (typeof input !== 'string') return null;

  const cleaned = input
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS_RE, '')
    .replace(HTML_COMMENT_RE, '')
    .replace(SCRIPT_STYLE_BLOCK_RE, '')
    .replace(HTML_TAG_RE, '')
    .replace(DANGEROUS_PROTOCOL_RE, '')
    .replace(/[<>]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}
