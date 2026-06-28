const HTML_TEXT_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export type HtmlTextValue = string | number | boolean | null | undefined;

export function escapeHtmlText(value: HtmlTextValue): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_TEXT_ESCAPES[char] ?? char);
}
