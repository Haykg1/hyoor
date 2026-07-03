'use client';

import type { AiSearchQuota } from '@repo/shared';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

interface AiSearchQuotaBannerProps {
  quota: AiSearchQuota | null;
  isLoading: boolean;
  variant?: 'banner' | 'message';
}

export function AiSearchQuotaBanner({
  quota,
  isLoading,
  variant = 'banner',
}: AiSearchQuotaBannerProps): React.JSX.Element | null {
  const t = useTranslations('ai_search.quota');
  if (isLoading || !quota) return null;
  const exhausted = quota.remaining <= 0;
  const isVerifiedMember = quota.isAuthenticated && quota.isVerifiedProfile;
  const isAuthenticatedIncomplete = quota.isAuthenticated && !quota.isVerifiedProfile;
  const content = (
    <>
      <p>
        {exhausted
          ? isVerifiedMember
            ? t('exhausted_verified', { limit: quota.limit })
            : t('exhausted', { limit: quota.limit })
          : isVerifiedMember
            ? t('remaining_verified', { remaining: quota.remaining, limit: quota.limit })
            : t('remaining', { remaining: quota.remaining, limit: quota.limit })}
      </p>
      {isAuthenticatedIncomplete ? (
        <p className="mt-1">
          {t('complete_profile_hint')}{' '}
          <Link
            href="/account"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('complete_profile_link')}
          </Link>
        </p>
      ) : null}
      {!quota.isAuthenticated ? (
        <p className="mt-1">
          {t('register_hint')}{' '}
          <Link
            href="/auth/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('register_link')}
          </Link>
        </p>
      ) : null}
    </>
  );
  if (variant === 'message') {
    return (
      <div className="flex justify-start">
        <div
          className={
            exhausted
              ? 'max-w-[85%] rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm leading-relaxed'
              : 'max-w-[85%] rounded-2xl border border-border/60 bg-muted/50 px-4 py-2.5 text-sm leading-relaxed text-muted-foreground'
          }
        >
          {content}
        </div>
      </div>
    );
  }
  return (
    <div
      className={
        exhausted
          ? 'rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm'
          : 'rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground'
      }
    >
      {content}
    </div>
  );
}
