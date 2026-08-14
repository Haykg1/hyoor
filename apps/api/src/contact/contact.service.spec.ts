import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  CONTACT_INFO_EMAIL,
  CONTACT_SUPPORT_EMAIL,
  type ContactInquiryRequest,
} from '@repo/shared';

import { MailerService } from '../mail/mailer.service';

import { ContactService } from './contact.service';

const baseInquiry: ContactInquiryRequest = {
  name: 'Armen Petrosyan',
  email: 'armen@example.com',
  role: 'guest',
  topic: 'booking',
  message: 'Need help with an upcoming booking in Yerevan.',
};

describe('ContactService', () => {
  let service: ContactService;
  let send: jest.MockedFunction<MailerService['send']>;

  beforeEach(async () => {
    send = jest.fn().mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: MailerService, useValue: { send } },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string): string | undefined => {
              if (key === 'mail.contactSupportEmail') {
                return CONTACT_SUPPORT_EMAIL;
              }
              if (key === 'mail.contactInfoEmail') {
                return CONTACT_INFO_EMAIL;
              }
              return undefined;
            },
          },
        },
      ],
    }).compile();
    service = module.get(ContactService);
  });

  it('sends guest booking mail to support with reply-to', async () => {
    const result = await service.submit(baseInquiry);
    expect(result).toEqual({ inbox: 'support' });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: CONTACT_SUPPORT_EMAIL,
        replyTo: baseInquiry.email,
        subject: '[guest / booking] Armen Petrosyan',
      }),
    );
  });

  it('sends partner mail to info even for a general topic', async () => {
    const result = await service.submit({ ...baseInquiry, role: 'partner', topic: 'general' });
    expect(result).toEqual({ inbox: 'info' });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: CONTACT_INFO_EMAIL }));
  });

  it('sends partnership_press mail to info for a guest writer', async () => {
    const result = await service.submit({ ...baseInquiry, topic: 'partnership_press' });
    expect(result).toEqual({ inbox: 'info' });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: CONTACT_INFO_EMAIL }));
  });
});
