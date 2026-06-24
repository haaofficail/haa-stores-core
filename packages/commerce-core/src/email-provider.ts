import {
  SmtpEmailProvider,
  ResendEmailProvider,
  type NotificationProvider,
} from '@haa/notification-core';

/**
 * Shared transactional-email provider selector.
 *
 * Provider precedence mirrors `OrdersService.pickOrderEmailProvider`
 * + the landing-contact path: SMTP first (merchant-owned deliverability
 * via Hostinger/Workspace/Outlook), Resend as the managed-API fallback.
 * Returns null when neither is configured so callers can no-op silently.
 *
 * Originally inlined in `auth-flow.ts` for the merchant welcome email;
 * extracted here so the publish-success email (and any future one-shot
 * merchant emails) can reuse the EXACT same precedence without
 * duplicating the helper.
 */
export function pickWelcomeEmailProvider(): NotificationProvider | null {
  const smtp = new SmtpEmailProvider();
  if (smtp.isAvailable) return smtp;
  const resend = new ResendEmailProvider();
  if (resend.isAvailable) return resend;
  return null;
}
