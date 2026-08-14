'use client';

import {
  Building2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Home,
  Search,
  Shield,
  Undo2,
  UserRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import {
  ALL_FAQ_KEYS,
  FAQ_CATEGORIES,
  FAQ_ITEMS_BY_CATEGORY,
  faqItemId,
  type FaqCategory,
} from '@/lib/faq/catalog';
import { getFaqI18nValues } from '@/lib/faq/json-ld';

const FAQ_I18N_VALUES = getFaqI18nValues();

const CATEGORY_ICONS: Record<FaqCategory, typeof Search> = {
  about: Building2,
  search: Search,
  booking: CreditCard,
  cancellations: Undo2,
  stay: Shield,
  hosting: Home,
  account: UserRound,
};

function matchesQuery(question: string, answer: string, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = `${question} ${answer}`.toLowerCase();
  return haystack.includes(query);
}

export function FaqPage(): React.JSX.Element {
  const t = useTranslations('faq');
  const values = FAQ_I18N_VALUES;
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleByCategory = useMemo(() => {
    return FAQ_CATEGORIES.map((category) => ({
      category,
      keys: FAQ_ITEMS_BY_CATEGORY[category].filter((key) =>
        matchesQuery(t(`items.${key}.q`), t(`items.${key}.a`, values), normalizedQuery),
      ),
    })).filter((group) => group.keys.length > 0);
  }, [normalizedQuery, t, values]);
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) {
      return;
    }
    if (
      ALL_FAQ_KEYS.some((key) => faqItemId(key) === hash) ||
      (FAQ_CATEGORIES as readonly string[]).includes(hash)
    ) {
      setOpenId(hash);
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);
  return (
    <div>
      <section className="relative overflow-hidden bg-foreground py-12">
        <div
          className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{t('hero.badge')}</span>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight text-background md:text-5xl">
              {t('hero.title', { siteName: values.siteName })}
            </h1>
            <p className="text-lg leading-relaxed text-background/60">{t('hero.subtitle')}</p>
          </div>
        </div>
      </section>
      <section className="border-b border-border bg-card py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative mb-4 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('search_placeholder')}
              className="h-11 rounded-xl pl-9"
              aria-label={t('search_placeholder')}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FAQ_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <a
                  key={category}
                  href={`#${category}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(`categories.${category}`)}
                </a>
              );
            })}
          </div>
        </div>
      </section>
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {visibleByCategory.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="mb-4 text-sm text-muted-foreground">{t('empty')}</p>
              <Button asChild className="rounded-xl">
                <Link href="/contact">{t('empty_cta')}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              {visibleByCategory.map((group) => {
                const Icon = CATEGORY_ICONS[group.category];
                return (
                  <div key={group.category} id={group.category} className="scroll-mt-24">
                    <div className="mb-4 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">
                        {t(`categories.${group.category}`)}
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {group.keys.map((key) => {
                        const itemId = faqItemId(key);
                        const isOpen = openId === itemId;
                        return (
                          <article
                            key={key}
                            id={itemId}
                            className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card"
                          >
                            <h3 className="text-base font-semibold">
                              <button
                                type="button"
                                aria-expanded={isOpen}
                                onClick={() => setOpenId(isOpen ? null : itemId)}
                                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                              >
                                <span className="text-sm font-semibold text-foreground">
                                  {t(`items.${key}.q`)}
                                </span>
                                {isOpen ? (
                                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                              </button>
                            </h3>
                            {isOpen ? (
                              <div className="border-t border-border px-5 pb-4">
                                <p className="pt-3 text-sm leading-relaxed text-muted-foreground">
                                  {t.rich(`items.${key}.a`, {
                                    ...values,
                                    search: (chunks) => (
                                      <Link
                                        href="/search"
                                        className="font-medium text-primary hover:underline"
                                      >
                                        {chunks}
                                      </Link>
                                    ),
                                    ai: (chunks) => (
                                      <Link
                                        href="/ai-search"
                                        className="font-medium text-primary hover:underline"
                                      >
                                        {chunks}
                                      </Link>
                                    ),
                                    cancellation: (chunks) => (
                                      <Link
                                        href="/cancellation"
                                        className="font-medium text-primary hover:underline"
                                      >
                                        {chunks}
                                      </Link>
                                    ),
                                    contact: (chunks) => (
                                      <Link
                                        href="/contact"
                                        className="font-medium text-primary hover:underline"
                                      >
                                        {chunks}
                                      </Link>
                                    ),
                                    host: (chunks) => (
                                      <Link
                                        href="/host/onboarding"
                                        className="font-medium text-primary hover:underline"
                                      >
                                        {chunks}
                                      </Link>
                                    ),
                                  })}
                                </p>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <p className="mb-1 text-sm font-bold text-foreground">{t('cta.title')}</p>
            <p className="mb-4 text-sm text-muted-foreground">{t('cta.body')}</p>
            <Button asChild className="rounded-xl">
              <Link href="/contact">{t('cta.link')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
