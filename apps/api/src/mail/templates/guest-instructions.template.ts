import { type MailContent } from './layout';

export interface GuestInstructionsEmailData {
  propertyTitle: string;
  propertyCity: string;
  propertyRegion: string | null;
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  guestCount: number;
  guestFirstName: string;
  formattedAddress: string;
  mapsUrl: string | null;
  guestInstructionsHtml: string;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  partiesAllowed: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  additionalRules: string | null;
  hostName: string;
  hostPhone: string | null;
  hostEmail: string;
  frontendUrl: string;
}

function formatTimeLabel(time: string | null, fallback: string): string {
  if (!time?.trim()) return fallback;
  return time;
}

function buildHouseRulesList(data: GuestInstructionsEmailData): string[] {
  const rules: string[] = [];
  if (!data.smokingAllowed) rules.push('No smoking indoors');
  if (!data.partiesAllowed) rules.push('No parties or events');
  if (!data.petsAllowed) rules.push('No pets');
  if (data.quietHoursStart && data.quietHoursEnd) {
    rules.push(`Quiet hours ${data.quietHoursStart} – ${data.quietHoursEnd}`);
  }
  if (data.additionalRules?.trim()) {
    rules.push(data.additionalRules.trim());
  }
  return rules;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildGuestInstructionsEmail(data: GuestInstructionsEmailData): MailContent {
  const locationLine = data.propertyRegion
    ? `${escapeHtml(data.propertyCity)}, ${escapeHtml(data.propertyRegion)}`
    : escapeHtml(data.propertyCity);
  const checkInLabel = `${escapeHtml(data.checkInDate)} · ${escapeHtml(
    formatTimeLabel(data.checkInTime, '15:00'),
  )}`;
  const checkOutLabel = `${escapeHtml(data.checkOutDate)} · ${escapeHtml(
    formatTimeLabel(data.checkOutTime, '11:00'),
  )}`;
  const houseRules = buildHouseRulesList(data);
  const houseRulesHtml =
    houseRules.length > 0
      ? houseRules.map((rule) => `<li style="margin:0;">${escapeHtml(rule)}</li>`).join('')
      : '<li style="margin:0;">Please respect the property during your stay.</li>';
  const mapsLink = data.mapsUrl
    ? `<p style="font-size:13px;color:#0f6e56;margin:6px 0 0;"><a href="${escapeHtml(
        data.mapsUrl,
      )}" style="color:#0f6e56;">View on Google Maps</a></p>`
    : '';
  const hostContactParts = [data.hostPhone, data.hostEmail].filter(Boolean).join(' · ');
  const subject = `Your check-in instructions for ${data.propertyTitle}`;
  const text =
    `Hi ${data.guestFirstName},\n\n` +
    `Your check-in at ${data.propertyTitle} is today.\n\n` +
    `Check-in: ${data.checkInDate} ${formatTimeLabel(data.checkInTime, '15:00')}\n` +
    `Check-out: ${data.checkOutDate} ${formatTimeLabel(data.checkOutTime, '11:00')}\n` +
    `Guests: ${data.guestCount}\n\n` +
    `Address: ${data.formattedAddress}\n\n` +
    `${data.mapsUrl ? `Maps: ${data.mapsUrl}\n\n` : ''}` +
    `Instructions:\n${stripHtml(data.guestInstructionsHtml)}\n\n` +
    `Host: ${data.hostName} — ${hostContactParts}\n\n` +
    `RentStar — ${data.frontendUrl}`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Inter,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#1a1a2e;padding:32px 32px 24px;text-align:center;">
                <p style="color:#a0a8c0;font-size:12px;margin:0 0 4px;letter-spacing:1px;text-transform:uppercase;">Welcome to</p>
                <h1 style="color:#ffffff;font-size:22px;font-weight:500;margin:0 0 4px;">${escapeHtml(
                  data.propertyTitle,
                )}</h1>
                <p style="color:#7b88a8;font-size:13px;margin:0;">${locationLine}</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f0f7ff;border-bottom:1px solid #b5d4f4;padding:16px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="33%" align="center" style="padding:4px;">
                      <p style="font-size:11px;color:#185fa5;margin:0;text-transform:uppercase;letter-spacing:0.5px;">Check-in</p>
                      <p style="font-size:15px;font-weight:500;color:#042c53;margin:4px 0 0;">${checkInLabel}</p>
                    </td>
                    <td width="33%" align="center" style="padding:4px;border-left:1px solid #b5d4f4;border-right:1px solid #b5d4f4;">
                      <p style="font-size:11px;color:#185fa5;margin:0;text-transform:uppercase;letter-spacing:0.5px;">Check-out</p>
                      <p style="font-size:15px;font-weight:500;color:#042c53;margin:4px 0 0;">${checkOutLabel}</p>
                    </td>
                    <td width="33%" align="center" style="padding:4px;">
                      <p style="font-size:11px;color:#185fa5;margin:0;text-transform:uppercase;letter-spacing:0.5px;">Guests</p>
                      <p style="font-size:15px;font-weight:500;color:#042c53;margin:4px 0 0;">${data.guestCount} guests</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <p style="font-size:15px;color:#0f172a;margin:0 0 24px;line-height:1.7;">Hi ${escapeHtml(
                  data.guestFirstName,
                )}, we're so excited to host you! Here's everything you need to get settled in.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
                  <tr>
                    <td>
                      <p style="font-size:14px;font-weight:500;color:#0f172a;margin:0 0 10px;">Address &amp; getting there</p>
                      <div style="background:#f8fafc;border-radius:8px;padding:12px 14px;border-left:3px solid #1d9e75;">
                        <p style="font-size:13px;color:#64748b;margin:0 0 4px;">Full address</p>
                        <p style="font-size:14px;font-weight:500;color:#0f172a;margin:0;">${escapeHtml(
                          data.formattedAddress,
                        )}</p>
                        ${mapsLink}
                      </div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
                  <tr>
                    <td>
                      <p style="font-size:14px;font-weight:500;color:#0f172a;margin:0 0 10px;">Your stay instructions</p>
                      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;font-size:13px;color:#334155;line-height:1.6;">
                        ${data.guestInstructionsHtml}
                      </div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
                  <tr>
                    <td width="50%" valign="top" style="padding-right:6px;">
                      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
                        <p style="font-size:13px;font-weight:500;color:#0f172a;margin:0 0 8px;">House rules</p>
                        <ul style="font-size:12px;color:#64748b;margin:0;padding-left:14px;line-height:1.9;">
                          ${houseRulesHtml}
                        </ul>
                      </div>
                    </td>
                    <td width="50%" valign="top" style="padding-left:6px;">
                      <div style="background:#f8fafc;border-radius:8px;padding:12px 14px;">
                        <p style="font-size:13px;font-weight:500;color:#0f172a;margin:0 0 8px;">Checkout</p>
                        <p style="font-size:12px;color:#64748b;margin:0;line-height:1.8;">Please check out by ${escapeHtml(
                          formatTimeLabel(data.checkOutTime, '11:00'),
                        )}. Lock all doors and windows before leaving.</p>
                      </div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f7ff;border:1px solid #b5d4f4;border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="font-size:13px;font-weight:500;color:#042c53;margin:0;">${escapeHtml(
                        data.hostName,
                      )}</p>
                      <p style="font-size:12px;color:#185fa5;margin:4px 0 0;">${escapeHtml(
                        hostContactParts,
                      )}</p>
                      <p style="font-size:12px;color:#185fa5;margin:8px 0 0;">Need help? Reach out anytime 24/7</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
                <p style="font-size:12px;color:#64748b;margin:0 0 4px;">RentStar</p>
                <p style="font-size:11px;color:#94a3b8;margin:0;"><a href="${escapeHtml(
                  data.frontendUrl,
                )}" style="color:#94a3b8;">${escapeHtml(data.frontendUrl)}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject, text, html };
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
