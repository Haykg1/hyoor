export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

interface LayoutOptions {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
}

export function renderLayout(opts: LayoutOptions): string {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto;"><tr><td style="background-color:#f97316;border-radius:9999px;"><a href="${opts.ctaUrl}" style="display:inline-block;padding:12px 28px;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${opts.ctaLabel}</a></td></tr></table>`
      : '';
  const footnote = opts.footnote
    ? `<p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">${opts.footnote}</p>`
    : '';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;box-shadow:0 1px 2px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0;font-size:14px;font-weight:600;color:#f97316;letter-spacing:0.08em;text-transform:uppercase;">RentStar</p>
                <h1 style="margin:8px 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">${opts.heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;font-size:15px;line-height:1.6;color:#334155;">
                ${opts.body}
                ${cta}
                ${footnote}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center;">
                © ${new Date().getFullYear()} RentStar. Short-term rentals in Armenia and beyond.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
