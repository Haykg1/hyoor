import { renderLayout, type MailContent } from './layout';

export interface DepositChargedEmailData {
  guestFirstName: string;
  propertyTitle: string;
  checkInDate: string;
  checkOutDate: string;
  amountLabel: string;
  reason: string;
  bookingUrl: string;
  frontendUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildDepositChargedEmail(data: DepositChargedEmailData): MailContent {
  const subject = `Security deposit charged for your stay at ${data.propertyTitle}`;
  const text =
    `Hi ${data.guestFirstName},\n\n` +
    `The host of ${data.propertyTitle} filed a damage claim for your stay ` +
    `(${data.checkInDate} – ${data.checkOutDate}), and it was approved after review.\n\n` +
    `Amount charged from your security deposit: ${data.amountLabel}\n\n` +
    `Host's reason:\n${data.reason}\n\n` +
    `You can view the booking here: ${data.bookingUrl}\n\n` +
    `RentStar — ${data.frontendUrl}`;
  const body =
    `<p style="margin:0 0 16px;">Hi ${escapeHtml(data.guestFirstName)},</p>` +
    `<p style="margin:0 0 16px;">The host of <strong>${escapeHtml(
      data.propertyTitle,
    )}</strong> filed a damage claim for your stay (${escapeHtml(data.checkInDate)} – ${escapeHtml(
      data.checkOutDate,
    )}), and it was approved after review.</p>` +
    `<p style="margin:0 0 8px;font-weight:600;">Amount charged from your security deposit</p>` +
    `<p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0f172a;">${escapeHtml(
      data.amountLabel,
    )}</p>` +
    `<p style="margin:0 0 8px;font-weight:600;">Host's reason</p>` +
    `<div style="background:#f8fafc;border-radius:8px;padding:12px 14px;border-left:3px solid #f97316;margin:0 0 16px;">${escapeHtml(
      data.reason,
    )}</div>`;
  const html = renderLayout({
    heading: 'Security deposit charged',
    body,
    ctaLabel: 'View booking',
    ctaUrl: data.bookingUrl,
    footnote:
      'If you believe this charge is incorrect, please contact our support team and reference your booking.',
  });
  return { subject, text, html };
}
