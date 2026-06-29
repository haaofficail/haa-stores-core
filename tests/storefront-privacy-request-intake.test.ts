import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');
const supportPage = readFileSync(
  resolve(projectRoot, 'apps/storefront/src/pages/Support.tsx'),
  'utf-8',
);

describe('Storefront privacy request intake', () => {
  it('offers explicit buyer privacy actions on the support page', () => {
    expect(supportPage).toContain("data-privacy-request=\"data-export\"");
    expect(supportPage).toContain("data-privacy-request=\"data-deletion\"");
    expect(supportPage).toContain("t('support.privacy.dataExportAction', 'طلب نسخة من بياناتي')");
    expect(supportPage).toContain("t('support.privacy.dataDeletionAction', 'طلب حذف بياناتي')");
  });

  it('prefills structured privacy data export and deletion ticket templates', () => {
    expect(supportPage).toContain("subject: '[خصوصية] طلب نسخة من بياناتي'");
    expect(supportPage).toContain('أرغب بطلب نسخة من بياناتي الشخصية المرتبطة بهذا المتجر.');
    expect(supportPage).toContain("subject: '[خصوصية] طلب حذف بياناتي'");
    expect(supportPage).toContain('أرغب بطلب حذف أو إتلاف بياناتي الشخصية المرتبطة بهذا المتجر قدر الإمكان نظامياً.');
    expect(supportPage).toContain('سيتم التحقق من الهوية');
    expect(supportPage).toContain('قد تُحفظ لمدة نظامية');
  });

  it('reuses the existing support ticket path and keeps tokens out of URLs', () => {
    expect(supportPage).toContain('supportApi.createTicket(slug');
    expect(supportPage).toContain('localStorage.setItem(`support-ticket-token:${slug}:${result.id}`, result.accessToken)');
    expect(supportPage).toContain('const ticketPath = ticket && slug ? `/s/${slug}/support/tickets/${ticket.id}` : \'\';');
    expect(supportPage).not.toContain('?accessToken=');
  });
});
