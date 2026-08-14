'use client';

import { COMPANY } from '@repo/shared';
import { Building2, ChevronDown, ChevronUp, Clock, Home, Mail, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ContactForm } from '@/components/contact/contact-form';
import { Link } from '@/i18n/navigation';
import { toMapsHref, toTelHref } from '@/lib/contact/company';
import { cn } from '@/lib/utils';

const FAQ_KEYS = ['list', 'currencies', 'ai', 'cancellation', 'report', 'armenia'] as const;
const SLA_ROWS = [
  { key: 'urgent', dot: 'bg-destructive' },
  { key: 'host', dot: 'bg-primary' },
  { key: 'general', dot: 'bg-muted-foreground' },
  { key: 'press', dot: 'bg-secondary-foreground' },
] as const;

const CHANNELS = [
  {
    key: 'support_email',
    icon: Mail,
    value: COMPANY.supportEmail,
    href: `mailto:${COMPANY.supportEmail}`,
    color: 'bg-primary/10 text-primary',
    external: false,
  },
  {
    key: 'phone',
    icon: Phone,
    value: COMPANY.phone,
    href: toTelHref(COMPANY.phone),
    color: 'bg-accent text-accent-foreground',
    external: false,
  },
  {
    key: 'info_email',
    icon: Building2,
    value: COMPANY.infoEmail,
    href: `mailto:${COMPANY.infoEmail}`,
    color: 'bg-secondary text-secondary-foreground',
    external: false,
  },
  {
    key: 'office',
    icon: MapPin,
    value: COMPANY.address,
    href: toMapsHref(COMPANY.address),
    color: 'bg-muted text-foreground',
    external: true,
  },
] as const;

export function ContactPage(): React.JSX.Element {
  const t = useTranslations('contact');
  const siteName = COMPANY.websiteName;
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  return (
    <div>
      <section className="relative overflow-hidden bg-foreground py-12">
        <div
          className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-3 py-1.5">
              <Mail className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{t('hero.badge')}</span>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight text-background md:text-5xl">
              {t('hero.title')}
              <br />
              <span className="text-primary">{t('hero.title_highlight', { siteName })}</span>
            </h1>
            <p className="text-lg leading-relaxed text-background/60">{t('hero.subtitle')}</p>
          </div>
        </div>
      </section>
      <section className="border-b border-border bg-card py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.key}
                  href={channel.href}
                  target={channel.external ? '_blank' : undefined}
                  rel={channel.external ? 'noreferrer' : undefined}
                  className="group flex flex-col gap-3 rounded-2xl border border-border bg-background p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl',
                      channel.color,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(`channels.${channel.key}.label`)}
                    </p>
                    <p className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                      {channel.value}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t(`channels.${channel.key}.description`)}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                <div className="mb-6">
                  <h2 className="mb-1 text-2xl font-bold text-foreground">{t('form.title')}</h2>
                  <p className="text-sm text-muted-foreground">{t('form.subtitle')}</p>
                </div>
                <ContactForm />
              </div>
            </div>
            <div className="flex flex-col gap-6 lg:col-span-2">
              <div>
                <h2 className="mb-1 text-2xl font-bold text-foreground">{t('faq.title')}</h2>
                <p className="text-sm text-muted-foreground">{t('faq.subtitle')}</p>
                <Link
                  href="/faq"
                  className="mt-2 inline-flex text-xs font-bold text-primary hover:underline"
                >
                  {t('faq.view_all')}
                </Link>
              </div>
              <div className="space-y-3">
                {FAQ_KEYS.map((faqKey, index) => (
                  <div
                    key={faqKey}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {t(`faq.${faqKey}.q`)}
                      </span>
                      {openFaq === index ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    {openFaq === index ? (
                      <div className="border-t border-border px-5 pb-4">
                        <p className="pt-3 text-sm leading-relaxed text-muted-foreground">
                          {t(`faq.${faqKey}.a`)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                    <Clock className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{t('sla.title')}</h3>
                </div>
                <div className="space-y-2">
                  {SLA_ROWS.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', row.dot)} />
                        <span className="text-xs text-muted-foreground">
                          {t(`sla.${row.key}_label`)}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        {t(`sla.${row.key}_time`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="mb-1 text-sm font-bold text-foreground">{t('host_cta.title')}</p>
                  <p className="mb-3 text-xs text-muted-foreground">{t('host_cta.body')}</p>
                  <Link
                    href="/host/onboarding"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    {t('host_cta.link')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
