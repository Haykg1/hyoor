import type { INestApplication } from '@nestjs/common';
import {
  CONTACT_INFO_EMAIL,
  CONTACT_SUPPORT_EMAIL,
  type ContactInquiryRequest,
} from '@repo/shared';
import request from 'supertest';

import { MailerService } from '../../src/mail/mailer.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';

const validInquiry: ContactInquiryRequest = {
  name: 'Armen Petrosyan',
  email: 'armen@example.com',
  role: 'guest',
  topic: 'booking',
  message: 'Need help with an upcoming booking in Yerevan.',
};

describe('Contact (e2e)', () => {
  let app: INestApplication;
  let send: jest.SpyInstance;

  beforeAll(async () => {
    const ctx: TestAppContext = await createTestApp();
    app = ctx.app;
    send = jest.spyOn(app.get(MailerService), 'send').mockResolvedValue(undefined);
  });

  beforeEach(() => {
    send.mockClear();
  });

  afterAll(async () => {
    send.mockRestore();
    await app.close();
  });

  it('returns 400 when required fields are missing', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/contact').send({}).expect(400);
    expect(response.body.success).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('routes guest booking mail to support', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/contact')
      .send(validInquiry)
      .expect(201);
    expect(response.body).toEqual({ success: true, data: { inbox: 'support' } });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: CONTACT_SUPPORT_EMAIL,
        replyTo: validInquiry.email,
      }),
    );
  });

  it('routes partner mail to info', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/contact')
      .send({ ...validInquiry, role: 'partner', topic: 'general' })
      .expect(201);
    expect(response.body.data).toEqual({ inbox: 'info' });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: CONTACT_INFO_EMAIL }));
  });

  it('routes partnership_press mail to info', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/contact')
      .send({ ...validInquiry, topic: 'partnership_press' })
      .expect(201);
    expect(response.body.data).toEqual({ inbox: 'info' });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: CONTACT_INFO_EMAIL }));
  });
});
