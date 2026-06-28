const HTML_TEXT_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtmlText(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_TEXT_ESCAPES[char] ?? char);
}
