'use client';

import { useLocale } from 'next-intl';
import type { ComponentProps } from 'react';

import { ViewTransitionLink } from '@/components/providers/view-transitions';

import { routing } from './routing';

type TransitionLinkProps = ComponentProps<typeof ViewTransitionLink>;

/**
 * Locale-aware link that navigates inside a View Transition (document.startViewTransition),
 * enabling shared-element morphs between pages. Falls back to a regular navigation in
 * browsers without View Transitions support. Mirrors next-intl's `localePrefix: 'as-needed'`
 * prefixing, since ViewTransitionLink is not locale-aware.
 */
export function TransitionLink({ href, ...props }: TransitionLinkProps): React.JSX.Element {
  const locale = useLocale();
  const localizedHref = locale === routing.defaultLocale ? href : `/${locale}${href}`;
  return <ViewTransitionLink href={localizedHref} {...props} />;
}
