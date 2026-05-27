import { type MailContent, renderLayout } from './layout';

export function buildOtpEmail(code: string, expiresInMinutes: number): MailContent {
  const subject = 'Your RentStar verification code';
  const text =
    `Your RentStar verification code is: ${code}\n\n` +
    `This code expires in ${expiresInMinutes} minutes.\n\n` +
    `If you did not request this code, you can safely ignore this email.`;
  const html = renderLayout({
    heading: 'Verify your email',
    body:
      `<p style="margin:0 0 16px;">Use the code below to verify your RentStar account:</p>` +
      `<div style="margin:24px 0;padding:20px;background-color:#f1f5f9;border-radius:8px;text-align:center;">` +
      `<span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.32em;color:#0f172a;">${code}</span>` +
      `</div>` +
      `<p style="margin:0;color:#64748b;">This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>`,
    footnote: 'If you did not request this code, you can safely ignore this email.',
  });
  return { subject, text, html };
}
