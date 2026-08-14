'use client';

import { CONTACT_ROLES, CONTACT_TOPICS, type ContactRole, type ContactTopic } from '@repo/shared';
import { CheckCircle2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { submitContactInquiry } from '@/lib/api/contact';
import { cn } from '@/lib/utils';

const emptyForm = {
  name: '',
  email: '',
  topic: '' as ContactTopic | '',
  message: '',
  role: 'guest' as ContactRole,
};

const fieldClassName = 'h-11 rounded-xl border-border bg-background focus-visible:ring-primary/30';

export function ContactForm(): React.JSX.Element {
  const t = useTranslations('contact');
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form.topic) {
      return;
    }
    setIsSubmitting(true);
    try {
      await submitContactInquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        topic: form.topic,
        message: form.message.trim(),
      });
      setSubmitted(true);
    } catch {
      toast.error(t('form.error'));
    } finally {
      setIsSubmitting(false);
    }
  }
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-foreground">{t('form.sent_title')}</h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t('form.sent_body', { name: form.name, email: form.email })}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6 rounded-xl"
          onClick={() => {
            setSubmitted(false);
            setForm(emptyForm);
          }}
        >
          {t('form.send_another')}
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('form.i_am')}
        </p>
        <div className="flex gap-2">
          {CONTACT_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, role }))}
              className={cn(
                'flex-1 rounded-xl border py-2 text-sm font-semibold transition-all',
                form.role === role
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {t(`form.roles.${role}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name" className="mb-1.5 inline-block">
            {t('form.name')} <span className="text-destructive">{t('form.required')}</span>
          </Label>
          <Input
            id="contact-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={t('form.name_placeholder')}
            className={fieldClassName}
          />
        </div>
        <div>
          <Label htmlFor="contact-email" className="mb-1.5 inline-block">
            {t('form.email')} <span className="text-destructive">{t('form.required')}</span>
          </Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder={t('form.email_placeholder')}
            className={fieldClassName}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="contact-topic" className="mb-1.5 inline-block">
          {t('form.topic')} <span className="text-destructive">{t('form.required')}</span>
        </Label>
        <select
          id="contact-topic"
          name="topic"
          required
          value={form.topic}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, topic: event.target.value as ContactTopic }))
          }
          className={cn(
            'flex w-full rounded-xl border border-border bg-background px-3 text-sm ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
            fieldClassName,
          )}
        >
          <option value="" disabled>
            {t('form.topic_placeholder')}
          </option>
          {CONTACT_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {t(`topics.${topic}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="contact-message" className="mb-1.5 inline-block">
          {t('form.message')} <span className="text-destructive">{t('form.required')}</span>
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          placeholder={t('form.message_placeholder')}
          className="resize-none rounded-xl border-border bg-background focus-visible:ring-primary/30"
        />
      </div>
      <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-xl font-bold">
        <Send className="mr-2 h-4 w-4" />
        {isSubmitting ? t('form.submitting') : t('form.submit')}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {t.rich('form.privacy_notice', {
          privacy: (chunks) => (
            <Link href="/privacy" className="text-primary hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}
