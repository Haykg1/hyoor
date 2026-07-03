import type { MailContent } from './layout';
import { renderLayout } from './layout';

export interface BulkImportResultsEmailData {
  hostEmail: string;
  summary: { total: number; created: number; failed: number };
  createdRows: { rowIndex: number; title: string; propertyId?: string }[];
  failedRows: { rowIndex: number; title: string; error?: string }[];
  jobId: string;
  completedAt: string;
}

type Locale = 'en' | 'hy' | 'ru';

const COPY: Record<
  Locale,
  {
    subject: (summary: { created: number; failed: number }) => string;
    heading: string;
    summary: (s: { total: number; created: number; failed: number }) => string;
    created: string;
    failed: string;
    viewDashboard: string;
    footnote: (jobId: string, completedAt: string) => string;
  }
> = {
  en: {
    subject: ({ created, failed }) => `Bulk import complete — ${created} created, ${failed} failed`,
    heading: 'Bulk import complete',
    summary: ({ total, created, failed }) =>
      `<strong>${total}</strong> rows processed: <strong>${created}</strong> properties created, <strong>${failed}</strong> failed.`,
    created: 'Created properties',
    failed: 'Failed rows',
    viewDashboard: 'View dashboard',
    footnote: (jobId, completedAt) =>
      `Job ID: ${jobId} · Completed: ${new Date(completedAt).toUTCString()}`,
  },
  hy: {
    subject: ({ created, failed }) =>
      `Bulk ներմուծումն ավարտվեց — ${created} ստեղծված, ${failed} անհաջող`,
    heading: 'Bulk ներմուծումն ավարտվեց',
    summary: ({ total, created, failed }) =>
      `<strong>${total}</strong> տող մշակված. <strong>${created}</strong> գույք ստեղծված, <strong>${failed}</strong> անհաջող։`,
    created: 'Ստեղծված գույքեր',
    failed: 'Անհաջող տողեր',
    viewDashboard: 'Բացել dashboard',
    footnote: (jobId, completedAt) =>
      `Job ID: ${jobId} · Ավարտ. ${new Date(completedAt).toUTCString()}`,
  },
  ru: {
    subject: ({ created, failed }) =>
      `Массовый импорт завершён — создано ${created}, ошибок ${failed}`,
    heading: 'Массовый импорт завершён',
    summary: ({ total, created, failed }) =>
      `Обработано строк: <strong>${total}</strong>. Создано объявлений: <strong>${created}</strong>, ошибок: <strong>${failed}</strong>.`,
    created: 'Созданные объявления',
    failed: 'Строки с ошибками',
    viewDashboard: 'Открыть панель управления',
    footnote: (jobId, completedAt) =>
      `ID задачи: ${jobId} · Завершено: ${new Date(completedAt).toUTCString()}`,
  },
};

const APP_URL = process.env.WEB_BASE_URL ?? 'https://rentstar.am';

export function buildBulkImportResultsEmail(
  data: BulkImportResultsEmailData,
  rawLocale: string,
): MailContent {
  const locale = (COPY[rawLocale as Locale] ? rawLocale : 'en') as Locale;
  const copy = COPY[locale];

  const createdSection =
    data.createdRows.length > 0
      ? `<p style="font-weight:600;margin:16px 0 8px;">${copy.created}:</p>
         <ul style="margin:0;padding-left:20px;">${data.createdRows
           .map((r) => {
             const link = r.propertyId
               ? `<a href="${APP_URL}/${locale}/dashboard/listings/${r.propertyId}/edit" style="color:#f97316;">${r.title}</a>`
               : r.title;
             return `<li>Row ${r.rowIndex + 1} — ${link}</li>`;
           })
           .join('')}</ul>`
      : '';

  const failedSection =
    data.failedRows.length > 0
      ? `<p style="font-weight:600;margin:16px 0 8px;">${copy.failed}:</p>
         <ul style="margin:0;padding-left:20px;">${data.failedRows
           .map((r) => {
             const errorMsg = r.error ? ` — ${r.error}` : '';
             return `<li>Row ${r.rowIndex + 1} — ${r.title}${errorMsg}</li>`;
           })
           .join('')}</ul>`
      : '';

  const body = `<p>${copy.summary(data.summary)}</p>${createdSection}${failedSection}`;
  const dashboardUrl = `${APP_URL}/${locale}/dashboard`;
  const textCreated = data.createdRows.map((r) => `  Row ${r.rowIndex + 1}: ${r.title}`).join('\n');
  const textFailed = data.failedRows
    .map((r) => `  Row ${r.rowIndex + 1}: ${r.title} — ${r.error ?? ''}`)
    .join('\n');
  const text = `${copy.heading}\n\n${copy.summary(data.summary).replace(/<[^>]+>/g, '')}\n\n${copy.created}:\n${textCreated}\n\n${copy.failed}:\n${textFailed}\n\n${dashboardUrl}`;

  return {
    subject: copy.subject(data.summary),
    text,
    html: renderLayout({
      heading: copy.heading,
      body,
      ctaLabel: copy.viewDashboard,
      ctaUrl: dashboardUrl,
      footnote: copy.footnote(data.jobId, data.completedAt),
    }),
  };
}
