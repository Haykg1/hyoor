import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { requestOpenCookieSettings } from '@/lib/cookies/consent';

export function FooterBottom(): React.JSX.Element {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
      <span>{t('copyright', { year })}</span>
      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/privacy" className="transition-colors hover:text-foreground">
          {t('privacy')}
        </Link>
        <Link href="/terms" className="transition-colors hover:text-foreground">
          {t('terms')}
        </Link>
        <Link href="/cancellation" className="transition-colors hover:text-foreground">
          {t('cancellation_refund')}
        </Link>
        <Link href="/cookies" className="transition-colors hover:text-foreground">
          {t('cookies')}
        </Link>
        <button
          type="button"
          className="transition-colors hover:text-foreground"
          onClick={() => requestOpenCookieSettings()}
        >
          {t('cookie_settings')}
        </button>
      </div>
    </div>
  );
}
