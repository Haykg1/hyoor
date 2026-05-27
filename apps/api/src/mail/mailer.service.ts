export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export abstract class MailerService {
  abstract send(opts: SendMailOptions): Promise<void>;
}
