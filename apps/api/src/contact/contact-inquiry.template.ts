import { type MailContent, renderLayout } from '../mail/templates/layout';

import type { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildContactInquiryEmail(dto: CreateContactInquiryDto): MailContent {
  const subject = `[${dto.role} / ${dto.topic}] ${dto.name}`;
  const text =
    `New contact form message\n\n` +
    `Name: ${dto.name}\n` +
    `Email: ${dto.email}\n` +
    `Role: ${dto.role}\n` +
    `Topic: ${dto.topic}\n\n` +
    `${dto.message}\n`;
  const html = renderLayout({
    heading: 'New contact form message',
    body:
      `<p style="margin:0 0 12px;"><strong>Name:</strong> ${escapeHtml(dto.name)}</p>` +
      `<p style="margin:0 0 12px;"><strong>Email:</strong> ${escapeHtml(dto.email)}</p>` +
      `<p style="margin:0 0 12px;"><strong>Role:</strong> ${escapeHtml(dto.role)}</p>` +
      `<p style="margin:0 0 16px;"><strong>Topic:</strong> ${escapeHtml(dto.topic)}</p>` +
      `<p style="margin:0;white-space:pre-wrap;">${escapeHtml(dto.message)}</p>`,
    footnote: 'Reply directly to this email to reach the sender.',
  });
  return { subject, text, html };
}
