import { type MailContent, renderLayout } from './layout';

export function buildPasswordResetEmail(resetUrl: string, expiresInMinutes: number): MailContent {
  const subject = 'Reset your RentStar password';
  const text =
    `Reset your RentStar password using the link below:\n\n` +
    `${resetUrl}\n\n` +
    `This link expires in ${expiresInMinutes} minutes.\n\n` +
    `If you did not request a password reset, you can safely ignore this email.`;
  const html = renderLayout({
    heading: 'Reset your password',
    body:
      `<p style="margin:0 0 16px;">We received a request to reset the password on your RentStar account. Click the button below to choose a new one.</p>` +
      `<p style="margin:0;color:#64748b;">This link expires in <strong>${expiresInMinutes} minutes</strong>.</p>`,
    ctaLabel: 'Reset password',
    ctaUrl: resetUrl,
    footnote:
      'If you did not request a password reset, you can safely ignore this email — your password will not change.',
  });
  return { subject, text, html };
}
