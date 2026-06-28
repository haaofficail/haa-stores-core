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

export function preparePrintDocument(win: Window, title: HtmlTextValue, css: string) {
  const doc = win.document;
  doc.documentElement.dir = 'rtl';
  doc.head.replaceChildren();
  doc.body.replaceChildren();

  const titleEl = doc.createElement('title');
  titleEl.textContent = String(title ?? '');
  doc.head.append(titleEl);

  const style = doc.createElement('style');
  style.textContent = css;
  doc.head.append(style);

  return doc;
}
