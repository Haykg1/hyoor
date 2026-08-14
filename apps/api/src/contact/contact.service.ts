import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveContactInbox, type ContactInbox } from '@repo/shared';

import type { AppConfig } from '../config/configuration';
import { MailerService } from '../mail/mailer.service';

import { buildContactInquiryEmail } from './contact-inquiry.template';
import type { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Forwards a public contact-form message to support@ or info@ based on role and topic.
   */
  async submit(dto: CreateContactInquiryDto): Promise<{ inbox: ContactInbox }> {
    const inbox = resolveContactInbox(dto.role, dto.topic);
    const to =
      inbox === 'info'
        ? this.config.get('mail.contactInfoEmail', { infer: true })
        : this.config.get('mail.contactSupportEmail', { infer: true });
    const content = buildContactInquiryEmail(dto);
    await this.mailer.send({
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      replyTo: dto.email,
    });
    return { inbox };
  }
}
