import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';

import { MailerService } from './mailer.service';
import { ConsoleMailer } from './transports/console.mailer';
import { ResendMailer } from './transports/resend.mailer';

@Global()
@Module({
  providers: [
    {
      provide: MailerService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>): MailerService => {
        const logger = new Logger('MailModule');
        const apiKey = config.get('mail.resendApiKey', { infer: true });
        const from = config.get('mail.from', { infer: true });
        if (apiKey) {
          logger.log(`Mail transport: Resend (from ${from})`);
          return new ResendMailer(apiKey, from);
        }
        logger.log('Mail transport: Console (set RESEND_API_KEY to send real emails)');
        return new ConsoleMailer();
      },
    },
  ],
  exports: [MailerService],
})
export class MailModule {}
