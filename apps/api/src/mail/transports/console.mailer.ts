import { Injectable, Logger } from '@nestjs/common';

import { MailerService, type SendMailOptions } from '../mailer.service';

@Injectable()
export class ConsoleMailer extends MailerService {
  private readonly logger = new Logger('ConsoleMailer');

  send(opts: SendMailOptions): Promise<void> {
    const divider = '─'.repeat(60);
    this.logger.log(
      [
        '',
        divider,
        `📧  To:      ${opts.to}`,
        `    Subject: ${opts.subject}`,
        divider,
        opts.text,
        divider,
      ].join('\n'),
    );
    return Promise.resolve();
  }
}
