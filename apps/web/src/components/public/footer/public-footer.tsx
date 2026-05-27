'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { BrandWordmark } from '@/components/ui/brand-wordmark';
import { useAuthStore } from '@/store';

import { FooterBottom } from './footer-bottom';
import { FooterColumn, type FooterColumnLink } from './footer-column';

interface FooterColumnConfig {
  headingKey: 'about' | 'support' | 'hosting';
  links: Array<{ href: string; labelKey: string }>;
}

const FOOTER_COLUMNS: FooterColumnConfig[] = [
  {
    headingKey: 'about',
    links: [
      { href: '/', labelKey: 'careers' },
      { href: '/', labelKey: 'press' },
      { href: '/', labelKey: 'contact' },
    ],
  },
  {
    headingKey: 'support',
    links: [
      { href: '/', labelKey: 'help_center' },
      { href: '/', labelKey: 'safety' },
    ],
  },
  {
    headingKey: 'hosting',
    links: [
      { href: '/host/onboarding', labelKey: 'become_host' },
      { href: '/', labelKey: 'host_resources' },
    ],
  },
];

export function PublicFooter(): React.JSX.Element {
  const t = useTranslations('footer');
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const hideHosting = mounted && !!user;
  const columns = FOOTER_COLUMNS.map((column) => ({
    headingKey: column.headingKey,
    heading: t(column.headingKey),
    links: column.links.map<FooterColumnLink>((link) => ({
      href: link.href,
      label: t(link.labelKey),
    })),
  }));
  return (
    <footer className="mt-16 border-t border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <BrandWordmark className="mb-3 text-xl" />
            <p className="text-sm leading-relaxed text-muted-foreground">{t('tagline')}</p>
          </div>
          {columns.map((column) => (
            <FooterColumn
              key={column.headingKey}
              heading={column.heading}
              links={column.links}
              hidden={column.headingKey === 'hosting' && hideHosting}
            />
          ))}
        </div>
        <FooterBottom />
      </div>
    </footer>
  );
}
