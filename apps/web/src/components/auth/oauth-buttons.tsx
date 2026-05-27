'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function GoogleIcon(): React.JSX.Element {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.8h5.4c-.2 1.4-1.6 4-5.4 4-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

function AppleIcon(): React.JSX.Element {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.488 2.27-1.226 3.09-.788.88-2.084 1.55-3.214 1.46-.116-1.13.486-2.31 1.16-3.05.81-.88 2.227-1.55 3.28-1.5zM20.5 17.36c-.32.74-.477 1.07-.89 1.72-.578.91-1.394 2.05-2.405 2.06-.9.01-1.13-.6-2.347-.6-1.218 0-1.477.59-2.378.61-1.01.03-1.78-.99-2.358-1.9-1.62-2.55-2.86-7.21-1.197-10.36.823-1.56 2.293-2.55 3.91-2.57 1.06-.02 2.06.72 2.71.72.65 0 1.96-.89 3.305-.76.564.024 2.146.23 3.164 1.73-2.71 1.49-2.28 5.32.485 6.95-.4 1.13-.91 2.25-1.45 3.4z" />
    </svg>
  );
}

export function OAuthButtons(): React.JSX.Element {
  const t = useTranslations('auth');
  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" className="w-full bg-background hover:bg-muted" asChild>
        <a href={`${API_BASE_URL}/auth/google`}>
          <GoogleIcon />
          <span className="ml-2">{t('oauth.google')}</span>
        </a>
      </Button>
      <Button
        variant="outline"
        className="w-full bg-foreground text-background hover:bg-foreground/90 hover:text-background"
        disabled
        title={t('oauth.apple_coming_soon')}
      >
        <AppleIcon />
        <span className="ml-2">{t('oauth.apple')}</span>
      </Button>
    </div>
  );
}
