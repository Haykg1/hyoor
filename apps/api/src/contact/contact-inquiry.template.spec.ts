import { buildContactInquiryEmail } from './contact-inquiry.template';

describe('buildContactInquiryEmail', () => {
  it('includes sender fields and escapes HTML in the body', () => {
    const email = buildContactInquiryEmail({
      name: 'A <script>alert(1)</script>',
      email: 'guest@example.com',
      role: 'guest',
      topic: 'technical',
      message: 'Broken page <b>bold</b>',
    });
    expect(email.subject).toBe('[guest / technical] A <script>alert(1)</script>');
    expect(email.text).toContain('guest@example.com');
    expect(email.text).toContain('Broken page <b>bold</b>');
    expect(email.html).toContain('A &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).toContain('Broken page &lt;b&gt;bold&lt;/b&gt;');
    expect(email.html).not.toContain('<script>alert(1)</script>');
  });
});
