import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Resend } from 'resend';

import { MailerService, type SendMailOptions } from '../mailer.service';

@Injectable()
export class ResendMailer extends MailerService {
  private readonly logger = new Logger('ResendMailer');
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    super();
    this.client = new Resend(apiKey);
  }

  async send(opts: SendMailOptions): Promise<void> {
    const result = await this.client.emails.send({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? opts.text,
    });
    if (result.error) {
      this.logger.error(`Resend send failed: ${JSON.stringify(result.error)}`);
      throw new InternalServerErrorException('Failed to deliver email');
    }
    this.logger.debug(`Sent email ${result.data?.id} to ${opts.to}`);
  }
}
